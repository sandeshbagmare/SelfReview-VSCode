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
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set(files.slice(0, 3).map(f => f.newPath)));
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

  const expandAll = () => {
    setExpandedFiles(new Set(files.map(f => f.newPath)));
  };

  const collapseAll = () => {
    setExpandedFiles(new Set());
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
    if (confirm('Delete this comment thread? This cannot be undone.')) {
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
        height: '500px',
        color: 'var(--vscode-descriptionForeground)'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.5 }}>📄</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>No Changes to Review</div>
        <div style={{ fontSize: '14px', textAlign: 'center', maxWidth: '400px', lineHeight: '1.6' }}>
          Make some changes to your code and they'll appear here for review.
          <br />
          You can also change the scope to review staged changes or specific commits.
        </div>
      </div>
    );
  }

  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Controls Bar */}
      <div style={{
        marginBottom: '24px',
        padding: '20px',
        background: 'var(--vscode-sideBar-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', marginRight: '12px', color: 'var(--vscode-descriptionForeground)' }}>
              Compare:
            </label>
            <select
              value={scope.kind}
              onChange={(e) => {
                const kind = e.target.value as DiffScope['kind'];
                if (kind === 'workingTree' || kind === 'staged') {
                  onScopeChange({ kind });
                }
              }}
              style={{
                padding: '8px 16px',
                background: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              <option value="workingTree">📝 Working Tree (Uncommitted)</option>
              <option value="staged">✓ Staged Changes</option>
            </select>
          </div>

          <div style={{
            padding: '8px 16px',
            background: 'var(--vscode-editor-background)',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            border: '1px solid var(--vscode-panel-border)'
          }}>
            <span style={{ color: 'var(--vscode-descriptionForeground)' }}>{files.length} file{files.length !== 1 ? 's' : ''}</span>
            <span style={{ margin: '0 12px', color: 'var(--vscode-panel-border)' }}>|</span>
            <span style={{ color: '#89d185' }}>+{totalAdditions}</span>
            <span style={{ margin: '0 8px', color: 'var(--vscode-descriptionForeground)' }}>/</span>
            <span style={{ color: '#f48771' }}>-{totalDeletions}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={expandAll}
            style={{
              padding: '8px 16px',
              background: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: '1px solid var(--vscode-button-border)',
              cursor: 'pointer',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold'
            }}
          >
            ▼ Expand All
          </button>
          <button
            onClick={collapseAll}
            style={{
              padding: '8px 16px',
              background: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: '1px solid var(--vscode-button-border)',
              cursor: 'pointer',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold'
            }}
          >
            ▶ Collapse All
          </button>
        </div>
      </div>

      {/* Files List */}
      {files.map(file => {
        const isExpanded = expandedFiles.has(file.newPath);
        const fileThreads = threads.filter(t => t.anchor.filePath === file.newPath);

        return (
          <div
            key={file.newPath}
            style={{
              marginBottom: '20px',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '8px',
              overflow: 'hidden',
              background: 'var(--vscode-editor-background)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              transition: 'all 0.2s'
            }}
          >
            {/* File Header */}
            <div
              onClick={() => toggleFile(file.newPath)}
              style={{
                padding: '16px 20px',
                background: 'var(--vscode-sideBar-background)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: isExpanded ? '1px solid var(--vscode-panel-border)' : 'none',
                userSelect: 'none',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--vscode-list-hoverBackground)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--vscode-sideBar-background)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: 'var(--vscode-textLink-foreground)'
                }}>
                  {file.newPath}
                </span>
                {file.status !== 'modified' && (
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    background: getStatusColor(file.status),
                    color: '#fff',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    {file.status}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                {fileThreads.length > 0 && (
                  <span style={{
                    padding: '6px 12px',
                    background: 'var(--vscode-badge-background)',
                    color: 'var(--vscode-badge-foreground)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '14px' }}>💬</span>
                    {fileThreads.length}
                  </span>
                )}
                <span style={{ color: '#89d185' }}>+{file.additions}</span>
                <span style={{ color: '#f48771' }}>-{file.deletions}</span>
              </div>
            </div>

            {/* File Content */}
            {isExpanded && (
              <div style={{ background: 'var(--vscode-editor-background)' }}>
                {file.binary ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: 'var(--vscode-descriptionForeground)',
                    fontSize: '14px'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📦</div>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Binary File</div>
                    <div>No preview available for binary files</div>
                  </div>
                ) : (
                  file.hunks.map((hunk, hunkIdx) => (
                    <div key={hunkIdx} style={{ borderBottom: hunkIdx < file.hunks.length - 1 ? '1px solid var(--vscode-panel-border)' : 'none' }}>
                      {/* Hunk Header */}
                      <div style={{
                        padding: '10px 20px',
                        background: 'var(--vscode-sideBar-background)',
                        color: 'var(--vscode-descriptionForeground)',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        borderTop: '1px solid var(--vscode-panel-border)',
                        borderBottom: '1px solid var(--vscode-panel-border)'
                      }}>
                        @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                      </div>

                      {/* Diff Lines */}
                      <div style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace', fontSize: '13px', lineHeight: '1.6' }}>
                        {hunk.lines.map((line, lineIdx) => {
                          const lineNumber = line.newNumber || line.oldNumber || 0;
                          const side = line.newNumber ? 'new' : 'old';
                          const lineThreads = getThreadsForLine(file.newPath, lineNumber, side);
                          const isCommenting = commentingLine?.file === file.newPath &&
                            commentingLine?.line === lineNumber &&
                            commentingLine?.side === side;

                          return (
                            <div key={lineIdx}>
                              {/* Diff Line */}
                              <div
                                style={{
                                  display: 'flex',
                                  background: line.type === 'add' ? 'rgba(0, 255, 0, 0.15)' :
                                    line.type === 'del' ? 'rgba(255, 0, 0, 0.15)' : 'transparent',
                                  borderLeft: line.type === 'add' ? '4px solid #89d185' :
                                    line.type === 'del' ? '4px solid #f48771' : '4px solid transparent',
                                  padding: '4px 0',
                                  position: 'relative',
                                  transition: 'background 0.1s'
                                }}
                                onMouseEnter={(e) => {
                                  const btn = e.currentTarget.querySelector('.add-comment-btn') as HTMLElement;
                                  if (btn) btn.style.display = 'flex';
                                  if (line.type !== 'context') {
                                    e.currentTarget.style.background = line.type === 'add' ? 'rgba(0, 255, 0, 0.25)' : 'rgba(255, 0, 0, 0.25)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  const btn = e.currentTarget.querySelector('.add-comment-btn') as HTMLElement;
                                  if (btn) btn.style.display = 'none';
                                  if (line.type !== 'context') {
                                    e.currentTarget.style.background = line.type === 'add' ? 'rgba(0, 255, 0, 0.15)' : 'rgba(255, 0, 0, 0.15)';
                                  }
                                }}
                              >
                                <span style={{
                                  width: '60px',
                                  textAlign: 'right',
                                  paddingRight: '12px',
                                  color: 'var(--vscode-descriptionForeground)',
                                  userSelect: 'none',
                                  flexShrink: 0,
                                  fontSize: '12px'
                                }}>
                                  {line.oldNumber || ''}
                                </span>
                                <span style={{
                                  width: '60px',
                                  textAlign: 'right',
                                  paddingRight: '12px',
                                  color: 'var(--vscode-descriptionForeground)',
                                  userSelect: 'none',
                                  flexShrink: 0,
                                  fontSize: '12px'
                                }}>
                                  {line.newNumber || ''}
                                </span>
                                <span style={{
                                  marginRight: '12px',
                                  color: line.type === 'add' ? '#89d185' : line.type === 'del' ? '#f48771' : 'inherit',
                                  userSelect: 'none',
                                  flexShrink: 0,
                                  fontWeight: 'bold'
                                }}>
                                  {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                                </span>
                                <span style={{ flex: 1, whiteSpace: 'pre', overflowX: 'auto', paddingRight: '60px' }}>
                                  {line.content}
                                </span>
                                <button
                                  className="add-comment-btn"
                                  onClick={() => handleAddComment(file.newPath, lineNumber, side)}
                                  style={{
                                    display: 'none',
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    background: 'var(--vscode-button-background)',
                                    color: 'var(--vscode-button-foreground)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                                  }}
                                >
                                  <span>💬</span>
                                  <span>Comment</span>
                                </button>
                              </div>

                              {/* Existing Threads */}
                              {lineThreads.map(thread => (
                                <div
                                  key={thread.id}
                                  style={{
                                    marginLeft: '120px',
                                    marginRight: '20px',
                                    marginTop: '12px',
                                    marginBottom: '12px',
                                    padding: '16px',
                                    background: 'var(--vscode-sideBar-background)',
                                    border: '1px solid var(--vscode-panel-border)',
                                    borderRadius: '8px',
                                    borderLeft: `4px solid ${thread.origin === 'ai' ? '#667eea' : '#ffa500'}`,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span style={{ fontSize: '20px' }}>{thread.origin === 'ai' ? '🤖' : '👤'}</span>
                                      <strong style={{ fontSize: '13px' }}>{thread.comments[0]?.author}</strong>
                                      {thread.severity && (
                                        <span style={{
                                          fontSize: '10px',
                                          padding: '3px 8px',
                                          background: getSeverityColor(thread.severity),
                                          color: '#fff',
                                          borderRadius: '4px',
                                          fontWeight: 'bold'
                                        }}>
                                          {thread.severity.toUpperCase()}
                                        </span>
                                      )}
                                      <span style={{
                                        fontSize: '10px',
                                        padding: '3px 8px',
                                        background: thread.status === 'open' ? '#f48771' : '#89d185',
                                        color: '#fff',
                                        borderRadius: '4px',
                                        fontWeight: 'bold'
                                      }}>
                                        {thread.status.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>

                                  {thread.comments.map(comment => (
                                    <div key={comment.id} style={{ marginBottom: '8px', fontSize: '13px', lineHeight: '1.6' }}>
                                      {comment.body}
                                    </div>
                                  ))}

                                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {thread.status === 'open' && (
                                      <button
                                        onClick={() => vscodeApi.postMessage({ type: 'setStatus', threadId: thread.id, status: 'resolved' })}
                                        style={{
                                          fontSize: '12px',
                                          padding: '6px 12px',
                                          cursor: 'pointer',
                                          background: '#89d185',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        ✓ Resolve
                                      </button>
                                    )}
                                    {thread.status === 'resolved' && (
                                      <button
                                        onClick={() => vscodeApi.postMessage({ type: 'setStatus', threadId: thread.id, status: 'open' })}
                                        style={{
                                          fontSize: '12px',
                                          padding: '6px 12px',
                                          cursor: 'pointer',
                                          background: '#f48771',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        ↻ Reopen
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleJumpToSource(file.newPath, lineNumber)}
                                      style={{
                                        fontSize: '12px',
                                        padding: '6px 12px',
                                        cursor: 'pointer',
                                        background: 'var(--vscode-button-secondaryBackground)',
                                        color: 'var(--vscode-button-secondaryForeground)',
                                        border: '1px solid var(--vscode-button-border)',
                                        borderRadius: '4px',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      📍 Jump to Code
                                    </button>
                                    <button
                                      onClick={() => handleDeleteThread(thread.id)}
                                      style={{
                                        fontSize: '12px',
                                        padding: '6px 12px',
                                        cursor: 'pointer',
                                        background: 'transparent',
                                        color: '#f48771',
                                        border: '1px solid #f48771',
                                        borderRadius: '4px',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {/* Comment Composer */}
                              {isCommenting && (
                                <div style={{
                                  marginLeft: '120px',
                                  marginRight: '20px',
                                  marginTop: '12px',
                                  marginBottom: '12px',
                                  padding: '16px',
                                  background: 'var(--vscode-input-background)',
                                  border: '2px solid var(--vscode-focusBorder)',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}>
                                  <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '13px' }}>
                                    💬 Add Comment
                                  </div>
                                  <textarea
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Write your comment here... (Markdown supported)"
                                    autoFocus
                                    style={{
                                      width: '100%',
                                      minHeight: '100px',
                                      background: 'var(--vscode-input-background)',
                                      color: 'var(--vscode-input-foreground)',
                                      border: '1px solid var(--vscode-input-border)',
                                      padding: '12px',
                                      fontFamily: 'inherit',
                                      fontSize: '13px',
                                      borderRadius: '6px',
                                      resize: 'vertical',
                                      lineHeight: '1.6'
                                    }}
                                  />
                                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={handleSubmitComment}
                                      disabled={!commentText.trim()}
                                      style={{
                                        padding: '10px 20px',
                                        background: commentText.trim() ? 'var(--vscode-button-background)' : 'var(--vscode-button-secondaryBackground)',
                                        color: commentText.trim() ? 'var(--vscode-button-foreground)' : 'var(--vscode-disabledForeground)',
                                        border: 'none',
                                        cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      💬 Add Comment
                                    </button>
                                    <button
                                      onClick={() => setCommentingLine(null)}
                                      style={{
                                        padding: '10px 20px',
                                        background: 'var(--vscode-button-secondaryBackground)',
                                        color: 'var(--vscode-button-secondaryForeground)',
                                        border: '1px solid var(--vscode-button-border)',
                                        cursor: 'pointer',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: 'bold'
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
