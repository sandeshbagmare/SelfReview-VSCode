import * as vscode from 'vscode';
import { CommentThread, Comment } from '../shared/types';
import { v4 as uuidv4 } from 'uuid';

interface CommentStoreData {
  version: number;
  threads: CommentThread[];
}

export class CommentStore {
  private workspaceRoot: vscode.Uri;
  private storePath: vscode.Uri;
  private threads: Map<string, CommentThread> = new Map();

  constructor(workspaceRoot: vscode.Uri) {
    this.workspaceRoot = workspaceRoot;
    this.storePath = vscode.Uri.joinPath(workspaceRoot, '.selfreview', 'comments.json');
  }

  async load(): Promise<void> {
    try {
      const data = await vscode.workspace.fs.readFile(this.storePath);
      const json: CommentStoreData = JSON.parse(data.toString());

      this.threads.clear();
      for (const thread of json.threads) {
        this.threads.set(thread.id, thread);
      }
    } catch (error) {
      // File doesn't exist yet, start with empty threads
      this.threads.clear();
    }
  }

  async save(): Promise<void> {
    const data: CommentStoreData = {
      version: 1,
      threads: Array.from(this.threads.values())
    };

    const json = JSON.stringify(data, null, 2);
    const dirPath = vscode.Uri.joinPath(this.workspaceRoot, '.selfreview');

    try {
      await vscode.workspace.fs.createDirectory(dirPath);
    } catch {
      // Directory already exists
    }

    // Atomic write: write to temp file then rename
    const tempPath = vscode.Uri.joinPath(this.workspaceRoot, '.selfreview', 'comments.json.tmp');
    await vscode.workspace.fs.writeFile(tempPath, Buffer.from(json, 'utf8'));
    await vscode.workspace.fs.rename(tempPath, this.storePath, { overwrite: true });
  }

  getAllThreads(): CommentThread[] {
    return Array.from(this.threads.values());
  }

  getThread(id: string): CommentThread | undefined {
    return this.threads.get(id);
  }

  addThread(anchor: CommentThread['anchor'], body: string, author: string, origin: 'human' | 'ai' = 'human', severity?: CommentThread['severity']): CommentThread {
    const now = new Date().toISOString();
    const thread: CommentThread = {
      id: uuidv4(),
      anchor,
      status: 'open',
      origin,
      severity,
      comments: [{
        id: uuidv4(),
        author,
        body,
        createdAt: now
      }],
      createdAt: now,
      updatedAt: now
    };

    this.threads.set(thread.id, thread);
    return thread;
  }

  addComment(threadId: string, body: string, author: string): Comment | null {
    const thread = this.threads.get(threadId);
    if (!thread) return null;

    const comment: Comment = {
      id: uuidv4(),
      author,
      body,
      createdAt: new Date().toISOString()
    };

    thread.comments.push(comment);
    thread.updatedAt = new Date().toISOString();
    return comment;
  }

  editComment(threadId: string, commentId: string, body: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    const comment = thread.comments.find(c => c.id === commentId);
    if (!comment) return false;

    comment.body = body;
    thread.updatedAt = new Date().toISOString();
    return true;
  }

  deleteComment(threadId: string, commentId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    const index = thread.comments.findIndex(c => c.id === commentId);
    if (index === -1) return false;

    thread.comments.splice(index, 1);
    thread.updatedAt = new Date().toISOString();

    // If no comments left, delete the thread
    if (thread.comments.length === 0) {
      this.threads.delete(threadId);
    }

    return true;
  }

  setStatus(threadId: string, status: CommentThread['status']): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    thread.status = status;
    thread.updatedAt = new Date().toISOString();
    return true;
  }

  mergeAiFindings(findings: Array<{ thread: CommentThread }>): void {
    // Remove old AI threads
    for (const [id, thread] of this.threads.entries()) {
      if (thread.origin === 'ai') {
        this.threads.delete(id);
      }
    }

    // Add new AI threads
    for (const finding of findings) {
      this.threads.set(finding.thread.id, finding.thread);
    }
  }
}
