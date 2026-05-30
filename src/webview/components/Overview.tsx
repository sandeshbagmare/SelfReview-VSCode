import React from 'react';
import { CommentThread } from '../../shared/types';
import { vscodeApi } from '../vscodeApi';

interface Props {
  threads: CommentThread[];
}

export default function Overview({ threads }: Props) {
  const handleJumpToLine = (thread: CommentThread) => {
    vscodeApi.postMessage({
      type: 'jumpToSource',
      filePath: thread.anchor.filePath,
      line: thread.anchor.lineNumber
    });
  };

  const sortedThreads = [...threads].sort((a, b) => {
    // Sort by file, then line number
    if (a.anchor.filePath !== b.anchor.filePath) {
      return a.anchor.filePath.localeCompare(b.anchor.filePath);
    }
    return a.anchor.lineNumber - b.anchor.lineNumber;
  });

  const openThreads = sortedThreads.filter(t => t.status === 'open');
  const resolvedThreads = sortedThreads.filter(t => t.status === 'resolved');
  const aiThreads = sortedThreads.filter(t => t.origin === 'ai');
  const humanThreads = sortedThreads.filter(t => t.origin === 'human');

  return (
    <div>
      <h2>Review Overview</h2>

      {/* Summary */}
      <div style={{
        padding: '15px',
        background: 'var(--vscode-editor-inactiveSelectionBackground)',
        border: '1px solid var(--vscode-panel-border)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{threads.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>Total Comments</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f48771' }}>{openThreads.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>Open</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#89d185' }}>{resolvedThreads.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>Resolved</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3794ff' }}>{aiThreads.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>AI Findings</div>
          </div>
        </div>
      </div>

      {/* Threads list */}
      {sortedThreads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--vscode-descriptionForeground)' }}>
          No comments yet. Add comments in the Diff tab or run an AI review.
        </div>
      ) : (
        <div>
          {sortedThreads.map(thread => (
            <div
              key={thread.id}
              style={{
                padding: '15px',
                background: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                marginBottom: '10px',
                cursor: 'pointer'
              }}
              onClick={() => handleJumpToLine(thread)}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <span style={{ marginRight: '8px' }}>
                    {thread.origin === 'ai' ? '🤖' : '👤'}
                  </span>
                  <strong>{thread.anchor.filePath}</strong>
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                    Line {thread.anchor.lineNumber}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {thread.severity && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      background: getSeverityColor(thread.severity),
                      borderRadius: '3px'
                    }}>
                      {thread.severity.toUpperCase()}
                    </span>
                  )}
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    background: thread.status === 'open' ? '#f48771' : thread.status === 'resolved' ? '#89d185' : '#cccccc',
                    borderRadius: '3px'
                  }}>
                    {thread.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Comments */}
              {thread.comments.map((comment, idx) => (
                <div key={comment.id} style={{ marginBottom: idx < thread.comments.length - 1 ? '10px' : '0' }}>
                  <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginBottom: '5px' }}>
                    <strong>{comment.author}</strong> · {new Date(comment.createdAt).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                    {comment.body}
                  </div>
                </div>
              ))}

              {/* Actions */}
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                {thread.status === 'open' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      vscodeApi.postMessage({ type: 'setStatus', threadId: thread.id, status: 'resolved' });
                    }}
                    style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      background: 'var(--vscode-button-background)',
                      color: 'var(--vscode-button-foreground)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Resolve
                  </button>
                )}
                {thread.status === 'resolved' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      vscodeApi.postMessage({ type: 'setStatus', threadId: thread.id, status: 'open' });
                    }}
                    style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      background: 'var(--vscode-button-secondaryBackground)',
                      color: 'var(--vscode-button-secondaryForeground)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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
