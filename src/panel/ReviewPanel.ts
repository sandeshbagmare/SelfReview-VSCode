import * as vscode from 'vscode';
import { WebviewToHost, HostToWebview, DiffScope, ThemeVars } from '../shared/types';
import { GitService } from '../services/GitService';
import { CommentStore } from '../services/CommentStore';
import { AiReviewService } from '../services/AiReviewService';
import { ExportService } from '../services/ExportService';
import { RulesLoader } from '../services/RulesLoader';

export class ReviewPanel {
  public static currentPanel: ReviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private gitService: GitService;
  private commentStore: CommentStore;
  private aiReviewService: AiReviewService;
  private exportService: ExportService;
  private currentUser: string = 'Unknown';

  public static async createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;

    // If we already have a panel, show it
    if (ReviewPanel.currentPanel) {
      ReviewPanel.currentPanel._panel.reveal(column);
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'selfReview',
      'Self Review',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'media'),
          vscode.Uri.joinPath(context.extensionUri, 'out')
        ]
      }
    );

    ReviewPanel.currentPanel = new ReviewPanel(panel, context.extensionUri, workspaceFolder.uri, context);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    workspaceRoot: vscode.Uri,
    private context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Initialize services
    this.gitService = new GitService(workspaceRoot.fsPath);
    this.commentStore = new CommentStore(workspaceRoot);
    const rulesLoader = new RulesLoader(workspaceRoot);
    this.aiReviewService = new AiReviewService(context, this.gitService, rulesLoader);
    this.exportService = new ExportService();

    // Load comments
    this.commentStore.load().catch(console.error);

    // Get current user
    this.gitService.getCurrentUser().then(user => {
      this.currentUser = user;
    });

    // Set the webview's initial html content
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message: WebviewToHost) => {
        await this._handleMessage(message);
      },
      null,
      this._disposables
    );
  }

  private async _handleMessage(message: WebviewToHost) {
    try {
      switch (message.type) {
        case 'ready':
          await this._handleReady();
          break;

        case 'requestDiff':
          await this._handleRequestDiff(message.scope);
          break;

        case 'requestCommits':
          await this._handleRequestCommits();
          break;

        case 'addComment':
          await this._handleAddComment(message.anchor, message.body);
          break;

        case 'replyComment':
          await this._handleReplyComment(message.threadId, message.body);
          break;

        case 'editComment':
          await this._handleEditComment(message.threadId, message.commentId, message.body);
          break;

        case 'deleteComment':
          await this._handleDeleteComment(message.threadId, message.commentId);
          break;

        case 'setStatus':
          await this._handleSetStatus(message.threadId, message.status);
          break;

        case 'runAiReview':
          await this._handleRunAiReview(message.model, message.scope);
          break;

        case 'jumpToSource':
          await this._handleJumpToSource(message.filePath, message.line);
          break;

        case 'export':
          await this._handleExport();
          break;

        case 'exportComments':
          await this._handleExportComments();
          break;

        case 'deleteThread':
          await this._handleDeleteThread(message.threadId);
          break;

        case 'saveDraft':
          // Store draft in workspace state for restart resilience
          await this.context.workspaceState.update(`draft_${message.anchorKey}`, message.body);
          break;
      }
    } catch (error: any) {
      this._postMessage({
        type: 'error',
        payload: { message: error.message || 'An error occurred' }
      });
    }
  }

  private async _handleReady() {
    const scope: DiffScope = { kind: 'workingTree' };
    const theme = this._getThemeVars();

    this._postMessage({
      type: 'bootstrap',
      payload: { scope, user: this.currentUser, theme }
    });

    // Send initial data
    await this._handleRequestDiff(scope);
    this._postMessage({
      type: 'threads',
      payload: this.commentStore.getAllThreads()
    });
  }

  private async _handleRequestDiff(scope: DiffScope) {
    const files = await this.gitService.getDiff(scope);
    this._postMessage({
      type: 'diffData',
      payload: { files, scope }
    });
  }

  private async _handleRequestCommits() {
    const scope: DiffScope = { kind: 'workingTree' };
    const commits = await this.gitService.getCommits(scope);
    this._postMessage({
      type: 'commits',
      payload: commits
    });
  }

  private async _handleAddComment(anchor: any, body: string) {
    const thread = this.commentStore.addThread(anchor, body, this.currentUser);
    await this.commentStore.save();

    this._postMessage({
      type: 'threads',
      payload: this.commentStore.getAllThreads()
    });
  }

  private async _handleReplyComment(threadId: string, body: string) {
    this.commentStore.addComment(threadId, body, this.currentUser);
    await this.commentStore.save();

    this._postMessage({
      type: 'threads',
      payload: this.commentStore.getAllThreads()
    });
  }

  private async _handleEditComment(threadId: string, commentId: string, body: string) {
    this.commentStore.editComment(threadId, commentId, body);
    await this.commentStore.save();

    this._postMessage({
      type: 'threads',
      payload: this.commentStore.getAllThreads()
    });
  }

  private async _handleDeleteComment(threadId: string, commentId: string) {
    this.commentStore.deleteComment(threadId, commentId);
    await this.commentStore.save();

    this._postMessage({
      type: 'threads',
      payload: this.commentStore.getAllThreads()
    });
  }

  private async _handleSetStatus(threadId: string, status: any) {
    this.commentStore.setStatus(threadId, status);
    await this.commentStore.save();

    this._postMessage({
      type: 'threads',
      payload: this.commentStore.getAllThreads()
    });
  }

  private async _handleRunAiReview(model: string, scope: DiffScope) {
    const commitHash = await this.gitService.getCurrentCommit();

    const findings = await this.aiReviewService.runReview(model, scope, (state, message) => {
      this._postMessage({
        type: 'aiProgress',
        payload: { state, message }
      });
    });

    const threads = this.aiReviewService.findingsToThreads(findings, model, commitHash);
    this.commentStore.mergeAiFindings(threads.map(thread => ({ thread })));
    await this.commentStore.save();

    this._postMessage({
      type: 'aiFindings',
      payload: findings
    });

    this._postMessage({
      type: 'threads',
      payload: this.commentStore.getAllThreads()
    });
  }

  private async _handleJumpToSource(filePath: string, line: number) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);

    const position = new vscode.Position(Math.max(0, line - 1), 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  }

  private async _handleExport() {
    const threads = this.commentStore.getAllThreads();
    const findings = threads.filter(t => t.origin === 'ai').map(t => ({
      filePath: t.anchor.filePath,
      line: t.anchor.lineNumber,
      side: t.anchor.side,
      severity: t.severity!,
      title: t.comments[0]?.body.split('\n')[0] || '',
      body: t.comments[0]?.body || ''
    }));

    const markdown = this.exportService.exportToMarkdown(threads, findings);

    const doc = await vscode.workspace.openTextDocument({
      content: markdown,
      language: 'markdown'
    });

    await vscode.window.showTextDocument(doc);
  }

  private async _handleExportComments() {
    const threads = this.commentStore.getAllThreads();

    let markdown = '# Code Review Comments\n\n';
    markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
    markdown += `Total Comments: ${threads.length}\n\n`;
    markdown += '---\n\n';

    // Group by file
    const byFile = new Map<string, typeof threads>();
    for (const thread of threads) {
      const file = thread.anchor.filePath;
      if (!byFile.has(file)) {
        byFile.set(file, []);
      }
      byFile.get(file)!.push(thread);
    }

    for (const [file, fileThreads] of byFile.entries()) {
      markdown += `## ${file}\n\n`;

      fileThreads.sort((a, b) => a.anchor.lineNumber - b.anchor.lineNumber);

      for (const thread of fileThreads) {
        const statusIcon = thread.status === 'open' ? '🔴' : thread.status === 'resolved' ? '✅' : '⚠️';
        const originIcon = thread.origin === 'ai' ? '🤖' : '👤';

        markdown += `### ${statusIcon} ${originIcon} Line ${thread.anchor.lineNumber}`;
        if (thread.severity) {
          markdown += ` [${thread.severity.toUpperCase()}]`;
        }
        markdown += '\n\n';

        for (const comment of thread.comments) {
          markdown += `**${comment.author}** (${new Date(comment.createdAt).toLocaleString()}):\n\n`;
          markdown += `${comment.body}\n\n`;
        }

        markdown += '---\n\n';
      }
    }

    const doc = await vscode.workspace.openTextDocument({
      content: markdown,
      language: 'markdown'
    });

    await vscode.window.showTextDocument(doc);
  }

  private async _handleDeleteThread(threadId: string) {
    const thread = this.commentStore.getThread(threadId);
    if (!thread) return;

    // Delete all comments in the thread
    for (const comment of thread.comments) {
      this.commentStore.deleteComment(threadId, comment.id);
    }

    await this.commentStore.save();

    this._postMessage({
      type: 'threads',
      payload: this.commentStore.getAllThreads()
    });
  }

  private _getThemeVars(): ThemeVars {
    return {
      background: 'var(--vscode-editor-background)',
      foreground: 'var(--vscode-editor-foreground)',
      linkForeground: 'var(--vscode-textLink-foreground)'
    };
  }

  private _postMessage(message: HostToWebview) {
    this._panel.webview.postMessage(message);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'webview.js')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Self Review</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    #root {
      width: 100%;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  public dispose() {
    ReviewPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
