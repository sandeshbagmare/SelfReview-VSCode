import * as vscode from 'vscode';

const RULES_FILES = [
  '.selfreview/review-rules.md',
  'CODE_REVIEW.md',
  '.cursorrules',
  '.github/copilot-instructions.md'
];

export class RulesLoader {
  constructor(private workspaceRoot: vscode.Uri) {}

  async load(): Promise<{ found: boolean; rulesText?: string }> {
    for (const file of RULES_FILES) {
      try {
        const filePath = vscode.Uri.joinPath(this.workspaceRoot, file);
        const data = await vscode.workspace.fs.readFile(filePath);
        const text = data.toString();

        if (text.trim()) {
          return { found: true, rulesText: text };
        }
      } catch {
        // File doesn't exist, try next
        continue;
      }
    }

    return { found: false };
  }
}
