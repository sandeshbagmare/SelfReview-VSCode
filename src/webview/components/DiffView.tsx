import React, { useState } from 'react';
import { FileDiff, CommentThread, DiffScope } from '../../shared/types';
import { vscodeApi } from '../vscodeApi';

interface Props {
  files: FileDiff[];
  threads: CommentThread[];
  scope: DiffScope;
  user: string;
  onScopeChange: (scope: DiffScope) => void;
}

export default function DiffView({ files, threads, scope, user, onScopeChange }: Props) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [commentingLine, setCommentingLine] = useState<{ file: string; line: number; side: 'old' | 'new' } | null>(null);
  const [commentText, setCommentText] = useState('');

  const toggleFile = (path: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFiles(newExpanded);
  };

  const handleAddComment = (file: string, line: number, side: 'old' | 'new') => {
    setCommentingLine({ file, line, side });
    setCommentText('');
  };

  const handleSubmitComment = () => {
    if (!commentingLine || !commentText.trim()) return;

    vscodeApi.postMessage({
      type: 'addComment',
      anchor: {
        filePath: commentingLine.file,
        side: commentingLine.side,
        lineNumber: commentingLine.line,
        contextHash: '',
        commitHash: ''
      },
      body: commentText
    });

    setCommentingLine(null);
    setCommentText('');
  };

  const handleDeleteThread = (threadId: string) => {
    if (confirm('Delete this comment thread?')) {
      vscodeApi.postMessage({ type: 'deleteThread', threadId });
    }
  };

  const getThreadsForLine = (file: string, line: number, side: 'old' | 'new'): CommentThread[] => {
    return threads.filter(
      t => t.anchor.filePath === file && t.anchor.lineNumber === line && t.anchor.side === side
    );
  };

  const handleJumpToSource = (file: string, line: number) => {
    vscodeApi.postMessage({ type: 'jumpToSource', filePath: file, line });
  };

  if (files.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        color: 'var(--vscode-descriptionForeground)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
        <div style={{ fontSize: '16px', marginBottom: '8px' }}>No changes to review</div>
        <div style={{ fontSize: '13px' }}>Make some changes to your code and they'll appear here</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Scope selector - Bitbucket style */}
      <div style={{
        marginBottom: '20px',
        padding: '12px 16px',
        background: 'var(--vscode-sideBar-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Compare:</label>
        <select
          value={scope.kind}
          onChange={(e) => {
            const kind = e.target.value as DiffScope['kind'];
            if (kind === 'workingTree' || kind === 'staged') {
              onScopeChange({ kind });
            }
          }}
          style={{
            padding: '6px 12px',
            background: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '3px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <option value="workingTree">Working Tree (Uncommitted)</option>
          <option value="staged">Staged Changes</option>
        </select>

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
          {files.length} file{files.length !== 1 ? 's' : ''} changed
        </div>
      </div>

      {/* Files list */}
      {files.map(file => {
        const isExpanded = expandedFiles.has(file.newPath);
        const fileThreads = threads.filter(t => t.anchor.filePath === file.newPath);

        return (
          <div
            key={file.newPath}
            style={{
              marginBottom: '16px',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '6px',
              overflow: 'hidden',
              background: 'var(--vscode-editor-background)'
            }}
          >
            {/* File header - Bitbucket style */}
            <div
              onClick={() => toggleFile(file.newPath)}
              style={{
                padding: '12px 16px',
                background: 'var(--vscode-sideBar-background)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: isExpanded ? '1px solid var(--vscode-panel-border)' : 'none',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px' }}>{isExpanded ? '▼' : '▶'}</span>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}>
                  {file.newPath}
                </span>
                {file.status !== 'modified' && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    background: getStatusColor(file.status),
                    color: '#fff',
                    borderRadius: '3px',
                    fontWeight: 'bold'
                  }}>
                    {file.status.toUpperCase()}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                {fileThreads.length > 0 && (
                  <span style={{
                    padding: '4px 8px',
                    background: 'var(--vscode-badge-background)',
                    color: 'var(--vscode-badge-foreground)',
                    borderRadius: '10px',
                    fontWeight: 'bold'
                  }}>
                    💬 {fileThreads.length}
                  </span>
                )}
                <span style={{ color: '#89d185', fontWeight: 'bold' }}>+{file.additions}</span>
                <span style={{ color: '#f48771', fontWeight: 'bold' }}>-{file.deletions}</span>
              </div>
            </div>

            {/* File content */}
            {isExpanded && (
              <div style={{ background: 'var(--vscode-editor-background)' }}>
                {file.binary ? (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: 'var(--vscode-descriptionForeground)'
                  }}>
                    Binary file - no preview available
                  </div>
                ) : (
                  file.hunks.map((hunk, hunkIdx) => (
                    <div key={hunkIdx} style={{ borderBottom: hunkIdx < file.hunks.length - 1 ? '1px solid var(--vscode-panel-border)' : 'none' }}>
                      {/* Hunk header */}
                      <div style={{
                        padding: '8px 16px',
                        background: 'var(--vscode-sideBar-background)',
                        color: 'var(--vscode-descriptionForeground)',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        borderTop: '1px solid var(--vscode-panel-border)',
                        borderBottom: '1px solid var(--vscode-panel-border)'
                      }}>
                        @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                      </div>

                      {/* Diff lines */}
                      <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        {hunk.lines.map((line, lineIdx) => {
                          const lineNumber = line.newNumber || line.oldNumber || 0;
                          const side = line.newNumber ? 'new' : 'old';
                          const lineThreads = getThreadsForLine(file.newPath, lineNumber, side);
                          const isCommenting = commentingLine?.file === file.newPath &&
                            commentingLine?.line === lineNumber &&
                            commentingLine?.side === side;

                          return (
                            <div key={lineIdx}>
                              {/* Diff line */}
                              <div
                                style={{
                                  display: 'flex',
                                  background: line.type === 'add' ? 'rgba(0, 255, 0, 0.1)' :
                                    line.type === 'del' ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
                                  borderLeft: line.type === 'add' ? '3px solid #89d185' :
                                    line.type === 'del' ? '3px solid #f48771' : '3px solid transparent',
                                  padding: '2px 0',
                                  position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                  const btn = e.currentTarget.querySelector('.add-comment-btn') as HTMLElement;
                                  if (btn) btn.style.display = 'inline-block';
                                }}
                                onMouseLeave={(e) => {
                                  const btn = e.currentTarget.querySelector('.add-comment-btn') as HTMLElement;
                                  if (btn) btn.style.display = 'none';
                                }}
                              >
                                <span style={{
                                  width: '50px',
                                  textAlign: 'right',
                                  paddingRight: '10px',
                                  color: 'var(--vscode-descriptionForeground)',
                                  userSelect: 'none',
                                  flexShrink: 0
                                }}>
                                  {line.oldNumber || ''}
                                </span>
                                <span style={{
                                  width: '50px',
                                  textAlign: 'right',
                                  paddingRight: '10px',
                                  color: 'var(--vscode-descriptionForeground)',
                                  userSelect: 'none',
                                  flexShrink: 0
                                }}>
                                  {line.newNumber || ''}
                                </span>
                                <span style={{
                                  marginRight: '10px',
                                  color: line.type === 'add' ? '#89d185' : line.type === 'del' ? '#f48771' : 'inherit',
                                  userSelect: 'none',
                                  flexShrink: 0
                                }}>
                                  {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                                </span>
                                <span style={{ flex: 1, whiteSpace: 'pre', overflowX: 'auto' }}>
                                  {line.content}
                                </span>
                                <button
                                  className="add-comment-btn"
                                  onClick={() => handleAddComment(file.newPath, lineNumber, side)}
                                  style={{
                                    display: 'none',
                                    marginLeft: '10px',
                                    marginRight: '10px',
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    background: 'var(--vscode-button-background)',
                                    color: 'var(--vscode-button-foreground)',
                                    border: 'none',
                                    borderRadius: '3px',
                                    flexShrink: 0
                                  }}
                                >
                                  💬 Comment
                                </button>
                              </div>

                              {/* Existing threads */}
                              {lineThreads.map(thread => (
                                <div
                                  key={thread.id}
                                  style={{
                                    marginLeft: '100px',
                                    marginRight: '20px',
                                    marginTop: '8px',
                                    marginBottom: '8px',
                                    padding: '12px',
                                    background: 'var(--vscode-sideBar-background)',
                                    border: '1px solid var(--vscode-panel-border)',
                                    borderRadius: '6px',
                                    borderLeft: `3px solid ${thread.origin === 'ai' ? '#3794ff' : '#ffa500'}`
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span>{thread.origin === 'ai' ? '🤖' : '👤'}</span>
                                      <strong style={{ fontSize: '12px' }}>{thread.comments[0]?.author}</strong>
                                      {thread.severity && (
                                        <span style={{
                                          fontSize: '10px',
                                          padding: '2px 6px',
                                          background: getSeverityColor(thread.severity),
                                          color: '#fff',
                                          borderRadius: '3px'
                                        }}>
                                          {thread.severity.toUpperCase()}
                                        </span>
                                      )}
                                      <span style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        background: thread.status === 'open' ? '#f48771' : '#89d185',
                                        color: '#fff',
                                        borderRadius: '3px'
                                      }}>
                                        {thread.status.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>

                                  {thread.comments.map(comment => (
                                    <div key={comment.id} style={{ marginBottom: '8px', fontSize: '12px' }}>
                                      {comment.body}
                                    </div>
                                  ))}

                                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                                    {thread.status === 'open' && (
                                      <button
                                        onClick={() => vscodeApi.postMessage({ type: 'setStatus', threadId: thread.id, status: 'resolved' })}
                                        style={{
                                          fontSize: '11px',
                                          padding: '4px 8px',
                                          cursor: 'pointer',
                                          background: '#89d185',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '3px'
                                        }}
                                      >
                                        ✓ Resolve
                                      </button>
                                    )}
                                    {thread.status === 'resolved' && (
                                      <button
                                        onClick={() => vscodeApi.postMessage({ type: 'setStatus', threadId: thread.id, status: 'open' })}
                                        style={{
                                          fontSize: '11px',
                                          padding: '4px 8px',
                                          cursor: 'pointer',
                                          background: '#f48771',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '3px'
                                        }}
                                      >
                                        ↻ Reopen
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleJumpToSource(file.newPath, lineNumber)}
                                      style={{
                                        fontSize: '11px',
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        background: 'var(--vscode-button-secondaryBackground)',
                                        color: 'var(--vscode-button-secondaryForeground)',
                                        border: '1px solid var(--vscode-button-border)',
                                        borderRadius: '3px'
                                      }}
                                    >
                                      📍 Jump
                                    </button>
                                    <button
                                      onClick={() => handleDeleteThread(thread.id)}
                                      style={{
                                        fontSize: '11px',
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        background: 'transparent',
                                        color: '#f48771',
                                        border: '1px solid #f48771',
                                        borderRadius: '3px'
                                      }}
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {/* Comment composer */}
                              {isCommenting && (
                                <div style={{
                                  marginLeft: '100px',
                                  marginRight: '20px',
                                  marginTop: '8px',
                                  marginBottom: '8px',
                                  padding: '12px',
                                  background: 'var(--vscode-input-background)',
                                  border: '1px solid var(--vscode-input-border)',
                                  borderRadius: '6px'
                                }}>
                                  <textarea
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Add a comment..."
                                    autoFocus
                                    style={{
                                      width: '100%',
                                      minHeight: '80px',
                                      background: 'var(--vscode-input-background)',
                                      color: 'var(--vscode-input-foreground)',
                                      border: '1px solid var(--vscode-input-border)',
                                      padding: '8px',
                                      fontFamily: 'inherit',
                                      fontSize: '12px',
                                      borderRadius: '3px',
                                      resize: 'vertical'
                                    }}
                                  />
                                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                                    <button
                                      onClick={handleSubmitComment}
                                      disabled={!commentText.trim()}
                                      style={{
                                        padding: '6px 12px',
                                        background: commentText.trim() ? 'var(--vscode-button-background)' : 'var(--vscode-button-secondaryBackground)',
                                        color: commentText.trim() ? 'var(--vscode-button-foreground)' : 'var(--vscode-disabledForeground)',
                                        border: 'none',
                                        cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                                        borderRadius: '3px',
                                        fontSize: '12px'
                                      }}
                                    >
                                      💬 Comment
                                    </button>
                                    <button
                                      onClick={() => setCommentingLine(null)}
                                      style={{
                                        padding: '6px 12px',
                                        background: 'var(--vscode-button-secondaryBackground)',
                                        color: 'var(--vscode-button-secondaryForeground)',
                                        border: '1px solid var(--vscode-button-border)',
                                        cursor: 'pointer',
                                        borderRadius: '3px',
                                        fontSize: '12px'
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'added': return '#89d185';
    case 'deleted': return '#f48771';
    case 'renamed': return '#3794ff';
    default: return '#cccccc';
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'bug': return '#f48771';
    case 'security': return '#ff0000';
    case 'perf': return '#ffa500';
    case 'style': return '#3794ff';
    case 'info': return '#89d185';
    default: return '#cccccc';
  }
}
