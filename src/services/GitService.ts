import simpleGit, { SimpleGit, DiffResult } from 'simple-git';
import * as crypto from 'crypto';
import { FileDiff, Hunk, DiffLine, DiffScope, CommitInfo } from '../shared/types';

export class GitService {
  private git: SimpleGit;

  constructor(workspaceRoot: string) {
    this.git = simpleGit(workspaceRoot);
  }

  async getDiff(scope: DiffScope): Promise<FileDiff[]> {
    try {
      let diffArgs: string[] = [];

      switch (scope.kind) {
        case 'range':
          diffArgs = [scope.base, scope.compare];
          break;
        case 'staged':
          diffArgs = ['--cached'];
          break;
        case 'workingTree':
          diffArgs = ['HEAD'];
          break;
        case 'commit':
          diffArgs = [scope.hash + '^', scope.hash];
          break;
      }

      const diff = await this.git.diff([...diffArgs, '--unified=3']);
      return this.parseDiff(diff);
    } catch (error) {
      console.error('Git diff failed:', error);
      throw new Error(`Failed to get diff: ${error}`);
    }
  }

  private parseDiff(diffText: string): FileDiff[] {
    const files: FileDiff[] = [];
    const fileBlocks = diffText.split(/^diff --git /m).slice(1);

    for (const block of fileBlocks) {
      const lines = block.split('\n');
      const firstLine = lines[0];

      // Parse file paths
      const match = firstLine.match(/a\/(.+?) b\/(.+)/);
      if (!match) continue;

      const oldPath = match[1];
      const newPath = match[2];

      // Determine status
      let status: FileDiff['status'] = 'modified';
      if (block.includes('new file mode')) status = 'added';
      else if (block.includes('deleted file mode')) status = 'deleted';
      else if (oldPath !== newPath) status = 'renamed';

      // Check if binary
      const binary = block.includes('Binary files');

      if (binary) {
        files.push({
          oldPath,
          newPath,
          status,
          binary: true,
          hunks: [],
          additions: 0,
          deletions: 0
        });
        continue;
      }

      // Parse hunks
      const hunks: Hunk[] = [];
      let additions = 0;
      let deletions = 0;

      const hunkRegex = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/gm;
      let hunkMatch;
      const hunkStarts: number[] = [];

      while ((hunkMatch = hunkRegex.exec(block)) !== null) {
        hunkStarts.push(hunkMatch.index);
      }

      for (let i = 0; i < hunkStarts.length; i++) {
        const hunkStart = hunkStarts[i];
        const hunkEnd = i < hunkStarts.length - 1 ? hunkStarts[i + 1] : block.length;
        const hunkText = block.substring(hunkStart, hunkEnd);

        const hunkHeaderMatch = hunkText.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (!hunkHeaderMatch) continue;

        const oldStart = parseInt(hunkHeaderMatch[1]);
        const oldLines = hunkHeaderMatch[2] ? parseInt(hunkHeaderMatch[2]) : 1;
        const newStart = parseInt(hunkHeaderMatch[3]);
        const newLines = hunkHeaderMatch[4] ? parseInt(hunkHeaderMatch[4]) : 1;

        const hunkLines = hunkText.split('\n').slice(1);
        const diffLines: DiffLine[] = [];
        let oldNum = oldStart;
        let newNum = newStart;

        for (const line of hunkLines) {
          if (!line) continue;

          const firstChar = line[0];
          const content = line.substring(1);

          if (firstChar === '+') {
            diffLines.push({ type: 'add', oldNumber: null, newNumber: newNum++, content });
            additions++;
          } else if (firstChar === '-') {
            diffLines.push({ type: 'del', oldNumber: oldNum++, newNumber: null, content });
            deletions++;
          } else if (firstChar === ' ') {
            diffLines.push({ type: 'context', oldNumber: oldNum++, newNumber: newNum++, content });
          }
        }

        hunks.push({ oldStart, oldLines, newStart, newLines, lines: diffLines });
      }

      files.push({
        oldPath,
        newPath,
        status,
        binary: false,
        hunks,
        additions,
        deletions
      });
    }

    return files;
  }

  async getCommits(scope: DiffScope): Promise<CommitInfo[]> {
    try {
      let range = '';

      switch (scope.kind) {
        case 'range':
          range = `${scope.base}..${scope.compare}`;
          break;
        case 'commit':
          range = scope.hash;
          break;
        default:
          range = 'HEAD';
      }

      const log = await this.git.log([range]);

      return log.all.map(commit => ({
        hash: commit.hash,
        author: commit.author_name,
        date: commit.date,
        message: commit.message
      }));
    } catch (error) {
      console.error('Git log failed:', error);
      return [];
    }
  }

  async getCurrentUser(): Promise<string> {
    try {
      const name = await this.git.raw(['config', 'user.name']);
      return name.trim() || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  async getCurrentCommit(): Promise<string> {
    try {
      const result = await this.git.revparse(['HEAD']);
      return result.trim();
    } catch {
      return '';
    }
  }

  computeContextHash(line: string, neighbors: string[]): string {
    const context = [line, ...neighbors].join('\n');
    return crypto.createHash('sha256').update(context).digest('hex').substring(0, 16);
  }
}
