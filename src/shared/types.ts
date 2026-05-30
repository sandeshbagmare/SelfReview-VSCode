// Shared types between extension host and webview

// ---- Review scope ----
export type DiffScope =
  | { kind: 'range'; base: string; compare: string }
  | { kind: 'staged' }
  | { kind: 'workingTree' }
  | { kind: 'commit'; hash: string };

// ---- A parsed diff ----
export interface FileDiff {
  oldPath: string;
  newPath: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  hunks: Hunk[];
  binary: boolean;
  additions: number;
  deletions: number;
}

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'del' | 'context';
  oldNumber: number | null;
  newNumber: number | null;
  content: string;
}

// ---- Comments (the source of truth, persisted) ----
export interface CommentThread {
  id: string;
  anchor: CommentAnchor;
  status: 'open' | 'resolved' | 'wontfix';
  origin: 'human' | 'ai';
  severity?: 'bug' | 'security' | 'perf' | 'style' | 'info';
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentAnchor {
  filePath: string;
  side: 'old' | 'new';
  lineNumber: number;
  contextHash: string;
  commitHash: string;
}

export interface Comment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

// ---- AI review ----
export interface AiFinding {
  filePath: string;
  line: number;
  side: 'new' | 'old';
  severity: 'bug' | 'security' | 'perf' | 'style' | 'info';
  title: string;
  body: string;
}

// ---- Commit info ----
export interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

// ---- Theme variables ----
export interface ThemeVars {
  background: string;
  foreground: string;
  linkForeground: string;
}

// ---- Message protocol ----
export type HostToWebview =
  | { type: 'bootstrap'; payload: { scope: DiffScope; user: string; theme: ThemeVars } }
  | { type: 'diffData'; payload: { files: FileDiff[]; scope: DiffScope } }
  | { type: 'threads'; payload: CommentThread[] }
  | { type: 'commits'; payload: CommitInfo[] }
  | { type: 'aiProgress'; payload: { state: 'running' | 'done' | 'error'; message?: string } }
  | { type: 'aiFindings'; payload: AiFinding[] }
  | { type: 'error'; payload: { message: string } };

export type WebviewToHost =
  | { type: 'ready' }
  | { type: 'requestDiff'; scope: DiffScope }
  | { type: 'requestCommits' }
  | { type: 'addComment'; anchor: CommentAnchor; body: string }
  | { type: 'replyComment'; threadId: string; body: string }
  | { type: 'editComment'; threadId: string; commentId: string; body: string }
  | { type: 'deleteComment'; threadId: string; commentId: string }
  | { type: 'deleteThread'; threadId: string }
  | { type: 'setStatus'; threadId: string; status: CommentThread['status'] }
  | { type: 'runAiReview'; model: string; scope: DiffScope }
  | { type: 'jumpToSource'; filePath: string; line: number }
  | { type: 'export' }
  | { type: 'exportComments' }
  | { type: 'saveDraft'; anchorKey: string; body: string };
