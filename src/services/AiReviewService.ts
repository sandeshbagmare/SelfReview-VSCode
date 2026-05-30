import * as vscode from 'vscode';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AiFinding, FileDiff, DiffScope, CommentThread } from '../shared/types';
import { GitService } from './GitService';
import { RulesLoader } from './RulesLoader';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_REVIEW_PROMPT = `You are a code reviewer. Review the following git diff for:
- Bugs and logic errors
- Security vulnerabilities
- Performance issues
- Code style and best practices
- Potential edge cases

Respond ONLY with a JSON array of findings. Each finding must have this exact structure:
{
  "filePath": "path/to/file",
  "line": 123,
  "side": "new",
  "severity": "bug" | "security" | "perf" | "style" | "info",
  "title": "Brief issue title",
  "body": "Detailed explanation and suggested fix"
}`;

export class AiReviewService {
  constructor(
    private context: vscode.ExtensionContext,
    private gitService: GitService,
    private rulesLoader: RulesLoader
  ) {}

  async runReview(
    model: string,
    scope: DiffScope,
    onProgress: (state: 'running' | 'done' | 'error', message?: string) => void
  ): Promise<AiFinding[]> {
    try {
      onProgress('running', 'Fetching diff...');
      const files = await this.gitService.getDiff(scope);

      // Filter out binary files and large files
      const reviewableFiles = files.filter(f => !f.binary && f.hunks.length > 0);

      if (reviewableFiles.length === 0) {
        onProgress('done', 'No files to review');
        return [];
      }

      onProgress('running', 'Loading review rules...');
      const rules = await this.rulesLoader.load();

      const systemPrompt = rules.found ? rules.rulesText! : DEFAULT_REVIEW_PROMPT;

      onProgress('running', `Reviewing ${reviewableFiles.length} files...`);

      // Review files in chunks to avoid token limits
      const allFindings: AiFinding[] = [];
      const chunkSize = 5;

      for (let i = 0; i < reviewableFiles.length; i += chunkSize) {
        const chunk = reviewableFiles.slice(i, i + chunkSize);
        const diffText = this.serializeDiff(chunk);

        onProgress('running', `Reviewing files ${i + 1}-${Math.min(i + chunkSize, reviewableFiles.length)}...`);

        const findings = await this.callModel(model, systemPrompt, diffText);
        allFindings.push(...findings);
      }

      onProgress('done', `Found ${allFindings.length} issues`);
      return allFindings;
    } catch (error: any) {
      onProgress('error', error.message || 'Review failed');
      throw error;
    }
  }

  private serializeDiff(files: FileDiff[]): string {
    let result = '';

    for (const file of files) {
      result += `\n--- ${file.oldPath}\n+++ ${file.newPath}\n`;
      result += `Status: ${file.status}\n`;

      for (const hunk of file.hunks) {
        result += `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n`;

        for (const line of hunk.lines) {
          const prefix = line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' ';
          result += `${prefix}${line.content}\n`;
        }
      }
    }

    return result;
  }

  private async callModel(model: string, systemPrompt: string, diffText: string): Promise<AiFinding[]> {
    if (model.startsWith('gpt-')) {
      return this.callOpenAI(model, systemPrompt, diffText);
    } else if (model.startsWith('claude-')) {
      return this.callAnthropic(model, systemPrompt, diffText);
    } else if (model.startsWith('ollama:')) {
      return this.callOllama(model.substring(7), systemPrompt, diffText);
    } else {
      throw new Error(`Unknown model: ${model}`);
    }
  }

  private async callOpenAI(model: string, systemPrompt: string, diffText: string): Promise<AiFinding[]> {
    const apiKey = await this.context.secrets.get('selfreview.openai');
    if (!apiKey) {
      const input = await vscode.window.showInputBox({
        prompt: 'Enter your OpenAI API key',
        password: true,
        ignoreFocusOut: true
      });

      if (!input) {
        throw new Error('OpenAI API key required');
      }

      await this.context.secrets.store('selfreview.openai', input);
      return this.callOpenAI(model, systemPrompt, diffText);
    }

    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Review this diff:\n\n${diffText}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '[]';
    return this.parseFindings(content);
  }

  private async callAnthropic(model: string, systemPrompt: string, diffText: string): Promise<AiFinding[]> {
    const apiKey = await this.context.secrets.get('selfreview.anthropic');
    if (!apiKey) {
      const input = await vscode.window.showInputBox({
        prompt: 'Enter your Anthropic API key',
        password: true,
        ignoreFocusOut: true
      });

      if (!input) {
        throw new Error('Anthropic API key required');
      }

      await this.context.secrets.store('selfreview.anthropic', input);
      return this.callAnthropic(model, systemPrompt, diffText);
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Review this diff and respond with ONLY a JSON array:\n\n${diffText}` }
      ],
      temperature: 0.3
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '[]';
    return this.parseFindings(text);
  }

  private async callOllama(model: string, systemPrompt: string, diffText: string): Promise<AiFinding[]> {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `${systemPrompt}\n\nReview this diff:\n\n${diffText}`,
        stream: false,
        format: 'json'
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseFindings(data.response);
  }

  private parseFindings(text: string): AiFinding[] {
    try {
      // Strip markdown code fences if present
      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleaned);

      // Handle both array and object with array property
      let findings: any[] = Array.isArray(parsed) ? parsed : (parsed.findings || []);

      // Validate and filter
      return findings
        .filter(f => f.filePath && f.line && f.severity && f.title && f.body)
        .map(f => ({
          filePath: f.filePath,
          line: f.line,
          side: f.side || 'new',
          severity: f.severity,
          title: f.title,
          body: f.body
        }));
    } catch (error) {
      console.error('Failed to parse AI findings:', error);
      return [];
    }
  }

  findingsToThreads(findings: AiFinding[], author: string, commitHash: string): CommentThread[] {
    return findings.map(finding => ({
      id: uuidv4(),
      anchor: {
        filePath: finding.filePath,
        side: finding.side,
        lineNumber: finding.line,
        contextHash: '',
        commitHash
      },
      status: 'open' as const,
      origin: 'ai' as const,
      severity: finding.severity,
      comments: [{
        id: uuidv4(),
        author: `AI: ${author}`,
        body: `**${finding.title}**\n\n${finding.body}`,
        createdAt: new Date().toISOString()
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }
}
