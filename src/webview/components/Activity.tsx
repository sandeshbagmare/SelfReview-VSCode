import React from 'react';
import { CommentThread } from '../../shared/types';
import { vscodeApi } from '../vscodeApi';

interface Props {
  threads: CommentThread[];
}

export default function Activity({ threads }: Props) {
  const handleJumpToLine = (thread: CommentThread) => {
    vscodeApi.postMessage({
      type: 'jumpToSource',
      filePath: thread.anchor.filePath,
      line: thread.anchor.lineNumber
    });
  };

  const handleDeleteThread = (threadId: string) => {
    if (confirm('Are you sure you want to delete this comment thread?')) {
      vscodeApi.postMessage({
        type: 'deleteThread',
        threadId
      });
    }
  };

  const handleReply = (threadId: string) => {
    const reply = prompt('Add a reply:');
    if (reply && reply.trim()) {
      vscodeApi.postMessage({
        type: 'replyComment',
        threadId,
        body: reply.trim()
      });
    }
  };

  // Sort by most recent activity
  const sortedThreads = [...threads].sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  if (sortedThreads.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        color: 'var(--vscode-descriptionForeground)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
        <div style={{ fontSize: '16px', marginBottom: '8px' }}>No activity yet</div>
        <div style={{ fontSize: '13px' }}>Add comments in the Diff tab or run an AI review</div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h2 style={{ marginBottom: '20px', fontSize: '18px' }}>Activity Feed</h2>

      {sortedThreads.map(thread => (
        <div
          key={thread.id}
          style={{
            background: 'var(--vscode-editor-background)',
            border: '1px solid var(--vscode-panel-border)',
            borderRadius: '6px',
            marginBottom: '16px',
            overflow: 'hidden'
          }}
        >
          {/* Thread Header - Bitbucket style */}
          <div style={{
            padding: '12px 16px',
            background: 'var(--vscode-sideBar-background)',
            borderBottom: '1px solid var(--vscode-panel-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>
                {thread.origin === 'ai' ? '🤖' : '👤'}
              </span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                  {thread.anchor.filePath}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                  Line {thread.anchor.lineNumber} · {thread.comments.length} comment{thread.comments.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Severity badge */}
              {thread.severity && (
                <span style={{
                  fontSize: '10px',
                  padding: '3px 8px',
                  background: getSeverityColor(thread.severity),
                  color: '#fff',
                  borderRadius: '3px',
                  fontWeight: 'bold'
                }}>
                  {thread.severity.toUpperCase()}
                </span>
              )}

              {/* Status badge */}
              <span style={{
                fontSize: '10px',
                padding: '3px 8px',
                background: thread.status === 'open' ? '#f48771' : thread.status === 'resolved' ? '#89d185' : '#cccccc',
                color: '#fff',
                borderRadius: '3px',
                fontWeight: 'bold'
              }}>
                {thread.status === 'open' ? '🔴 OPEN' : thread.status === 'resolved' ? '✅ RESOLVED' : '⚠️ WONT FIX'}
              </span>
            </div>
          </div>

          {/* Comments */}
          <div style={{ padding: '16px' }}>
            {thread.comments.map((comment, idx) => (
              <div
                key={comment.id}
                style={{
                  marginBottom: idx < thread.comments.length - 1 ? '16px' : '0',
                  paddingBottom: idx < thread.comments.length - 1 ? '16px' : '0',
                  borderBottom: idx < thread.comments.length - 1 ? '1px solid var(--vscode-panel-border)' : 'none'
                }}
              >
                {/* Comment header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontWeight: 'bold',
                      fontSize: '13px',
                      color: 'var(--vscode-textLink-foreground)'
                    }}>
                      {comment.author}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--vscode-descriptionForeground)'
                    }}>
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Delete comment button */}
                  {idx === 0 && (
                    <button
                      onClick={() => handleDeleteThread(thread.id)}
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        background: 'transparent',
                        color: '#f48771',
                        border: '1px solid #f48771',
                        cursor: 'pointer',
                        borderRadius: '3px'
                      }}
                      title="Delete thread"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>

                {/* Comment body */}
                <div style={{
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {comment.body}
                </div>
              </div>
            ))}
          </div>

          {/* Actions footer - Bitbucket style */}
          <div style={{
            padding: '12px 16px',
            background: 'var(--vscode-sideBar-background)',
            borderTop: '1px solid var(--vscode-panel-border)',
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={() => handleJumpToLine(thread)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '3px'
              }}
            >
              📍 Jump to Code
            </button>

            <button
              onClick={() => handleReply(thread.id)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: '1px solid var(--vscode-button-border)',
                cursor: 'pointer',
                borderRadius: '3px'
              }}
            >
              💬 Reply
            </button>

            {thread.status === 'open' && (
              <button
                onClick={() => {
                  vscodeApi.postMessage({ type: 'setStatus', threadId: thread.id, status: 'resolved' });
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: '#89d185',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '3px'
                }}
              >
                ✓ Resolve
              </button>
            )}

            {thread.status === 'resolved' && (
              <button
                onClick={() => {
                  vscodeApi.postMessage({ type: 'setStatus', threadId: thread.id, status: 'open' });
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: '#f48771',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '3px'
                }}
              >
                ↻ Reopen
              </button>
            )}

            {thread.status === 'open' && (
              <button
                onClick={() => {
                  vscodeApi.postMessage({ type: 'setStatus', threadId: thread.id, status: 'wontfix' });
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: 'transparent',
                  color: 'var(--vscode-descriptionForeground)',
                  border: '1px solid var(--vscode-button-border)',
                  cursor: 'pointer',
                  borderRadius: '3px'
                }}
              >
                ⚠️ Won't Fix
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
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
