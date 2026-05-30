import React from 'react';
import { CommitInfo } from '../../shared/types';

interface Props {
  commits: CommitInfo[];
}

export default function Commits({ commits }: Props) {
  if (commits.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--vscode-descriptionForeground)' }}>
        No commits in this range
      </div>
    );
  }

  return (
    <div>
      <h2>Commits</h2>

      {commits.map(commit => (
        <div
          key={commit.hash}
          style={{
            padding: '15px',
            background: 'var(--vscode-editor-background)',
            border: '1px solid var(--vscode-panel-border)',
            marginBottom: '10px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <strong>{commit.message.split('\n')[0]}</strong>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
              {new Date(commit.date).toLocaleString()}
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
            <div>Author: {commit.author}</div>
            <div style={{ fontFamily: 'monospace', marginTop: '5px' }}>
              {commit.hash.substring(0, 8)}
            </div>
          </div>

          {commit.message.split('\n').length > 1 && (
            <div style={{ marginTop: '10px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
              {commit.message.split('\n').slice(1).join('\n').trim()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
