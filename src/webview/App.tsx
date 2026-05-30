import React, { useState, useEffect } from 'react';
import { HostToWebview, WebviewToHost, FileDiff, CommentThread, DiffScope, CommitInfo, AiFinding } from '../shared/types';
import { vscodeApi } from './vscodeApi';
import DiffView from './components/DiffView';
import Overview from './components/Overview';
import Commits from './components/Commits';
import Activity from './components/Activity';

type Tab = 'diff' | 'overview' | 'commits' | 'activity';

interface NavigationState {
  tab: Tab;
  fileIndex?: number;
  scrollPosition?: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('diff');
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [scope, setScope] = useState<DiffScope>({ kind: 'workingTree' });
  const [user, setUser] = useState<string>('Unknown');
  const [aiProgress, setAiProgress] = useState<{ state: string; message?: string } | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  useEffect(() => {
    // Send ready message
    vscodeApi.postMessage({ type: 'ready' });

    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message: HostToWebview = event.data;

      switch (message.type) {
        case 'bootstrap':
          setScope(message.payload.scope);
          setUser(message.payload.user);
          break;

        case 'diffData':
          setFiles(message.payload.files);
          setScope(message.payload.scope);
          break;

        case 'threads':
          setThreads(message.payload);
          break;

        case 'commits':
          setCommits(message.payload);
          break;

        case 'aiProgress':
          setAiProgress(message.payload);
          if (message.payload.state === 'done' || message.payload.state === 'error') {
            setTimeout(() => setAiProgress(null), 3000);
          }
          break;

        case 'aiFindings':
          // Findings are converted to threads by the host
          break;

        case 'error':
          alert(`Error: ${message.payload.message}`);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const pushNavigation = (tab: Tab, fileIndex?: number) => {
    const newState: NavigationState = { tab, fileIndex };
    const newHistory = navigationHistory.slice(0, currentHistoryIndex + 1);
    newHistory.push(newState);
    setNavigationHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  };

  const handleTabChange = (tab: Tab) => {
    pushNavigation(tab);
    setActiveTab(tab);

    if (tab === 'commits') {
      vscodeApi.postMessage({ type: 'requestCommits' });
    }
  };

  const handleBack = () => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      const state = navigationHistory[newIndex];
      setCurrentHistoryIndex(newIndex);
      setActiveTab(state.tab);
    }
  };

  const handleForward = () => {
    if (currentHistoryIndex < navigationHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      const state = navigationHistory[newIndex];
      setCurrentHistoryIndex(newIndex);
      setActiveTab(state.tab);
    }
  };

  const handleScopeChange = (newScope: DiffScope) => {
    setScope(newScope);
    vscodeApi.postMessage({ type: 'requestDiff', scope: newScope });
  };

  const handleRunAiReview = () => {
    const models = ['gpt-4o', 'claude-3-5-sonnet-20241022', 'ollama:llama3'];
    const model = prompt(`Choose a model:\n${models.map((m, i) => `${i + 1}. ${m}`).join('\n')}`, '1');
    if (!model) return;

    const modelIndex = parseInt(model) - 1;
    if (modelIndex >= 0 && modelIndex < models.length) {
      vscodeApi.postMessage({ type: 'runAiReview', model: models[modelIndex], scope });
    }
  };

  const handleExportComments = () => {
    vscodeApi.postMessage({ type: 'exportComments' });
  };

  const handleExportFull = () => {
    vscodeApi.postMessage({ type: 'export' });
  };

  const openComments = threads.filter(t => t.status === 'open').length;
  const resolvedComments = threads.filter(t => t.status === 'resolved').length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--vscode-editor-background)',
      color: 'var(--vscode-editor-foreground)',
      fontFamily: 'var(--vscode-font-family)'
    }}>
      {/* Bitbucket-style Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--vscode-panel-border)',
        background: 'var(--vscode-sideBar-background)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Navigation buttons */}
          <button
            onClick={handleBack}
            disabled={currentHistoryIndex <= 0}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              color: currentHistoryIndex <= 0 ? 'var(--vscode-disabledForeground)' : 'var(--vscode-foreground)',
              border: '1px solid var(--vscode-button-border)',
              cursor: currentHistoryIndex <= 0 ? 'not-allowed' : 'pointer',
              borderRadius: '3px'
            }}
            title="Back"
          >
            ←
          </button>
          <button
            onClick={handleForward}
            disabled={currentHistoryIndex >= navigationHistory.length - 1}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              color: currentHistoryIndex >= navigationHistory.length - 1 ? 'var(--vscode-disabledForeground)' : 'var(--vscode-foreground)',
              border: '1px solid var(--vscode-button-border)',
              cursor: currentHistoryIndex >= navigationHistory.length - 1 ? 'not-allowed' : 'pointer',
              borderRadius: '3px'
            }}
            title="Forward"
          >
            →
          </button>

          <div style={{
            width: '1px',
            height: '24px',
            background: 'var(--vscode-panel-border)',
            margin: '0 8px'
          }} />

          {/* Tab buttons - Bitbucket style */}
          <button
            onClick={() => handleTabChange('diff')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'diff' ? 'var(--vscode-button-background)' : 'transparent',
              color: activeTab === 'diff' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '3px',
              fontWeight: activeTab === 'diff' ? 'bold' : 'normal'
            }}
          >
            Diff
          </button>
          <button
            onClick={() => handleTabChange('overview')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'overview' ? 'var(--vscode-button-background)' : 'transparent',
              color: activeTab === 'overview' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '3px',
              fontWeight: activeTab === 'overview' ? 'bold' : 'normal'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => handleTabChange('activity')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'activity' ? 'var(--vscode-button-background)' : 'transparent',
              color: activeTab === 'activity' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '3px',
              fontWeight: activeTab === 'activity' ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Activity
            {threads.length > 0 && (
              <span style={{
                background: 'var(--vscode-badge-background)',
                color: 'var(--vscode-badge-foreground)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                {threads.length}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('commits')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'commits' ? 'var(--vscode-button-background)' : 'transparent',
              color: activeTab === 'commits' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '3px',
              fontWeight: activeTab === 'commits' ? 'bold' : 'normal'
            }}
          >
            Commits
          </button>
        </div>

        {/* Right side actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Comment summary */}
          {threads.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '12px',
              fontSize: '12px',
              padding: '4px 12px',
              background: 'var(--vscode-editor-background)',
              borderRadius: '3px',
              border: '1px solid var(--vscode-panel-border)'
            }}>
              <span style={{ color: '#f48771' }}>
                🔴 {openComments} Open
              </span>
              <span style={{ color: '#89d185' }}>
                ✅ {resolvedComments} Resolved
              </span>
            </div>
          )}

          {aiProgress && (
            <span style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
              {aiProgress.state === 'running' ? '⏳' : aiProgress.state === 'done' ? '✅' : '❌'} {aiProgress.message}
            </span>
          )}

          <button
            onClick={handleRunAiReview}
            style={{
              padding: '6px 12px',
              background: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '3px',
              fontSize: '13px'
            }}
          >
            🤖 AI Review
          </button>

          {/* Export dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleExportComments}
              style={{
                padding: '6px 12px',
                background: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: '1px solid var(--vscode-button-border)',
                cursor: 'pointer',
                borderRadius: '3px',
                fontSize: '13px'
              }}
            >
              📤 Export Comments
            </button>
          </div>

          <button
            onClick={handleExportFull}
            style={{
              padding: '6px 12px',
              background: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: '1px solid var(--vscode-button-border)',
              cursor: 'pointer',
              borderRadius: '3px',
              fontSize: '13px'
            }}
          >
            📋 Export Full Report
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'diff' && (
          <DiffView
            files={files}
            threads={threads}
            scope={scope}
            user={user}
            onScopeChange={handleScopeChange}
          />
        )}
        {activeTab === 'overview' && (
          <Overview threads={threads} />
        )}
        {activeTab === 'activity' && (
          <Activity threads={threads} />
        )}
        {activeTab === 'commits' && (
          <Commits commits={commits} />
        )}
      </div>
    </div>
  );
}
