import React, { useState, useEffect } from 'react';
import { HostToWebview, WebviewToHost, FileDiff, CommentThread, DiffScope, CommitInfo } from '../shared/types';
import { vscodeApi } from './vscodeApi';
import DiffView from './components/DiffView';
import Overview from './components/Overview';
import Commits from './components/Commits';
import Activity from './components/Activity';

type Tab = 'diff' | 'overview' | 'commits' | 'activity';

interface NavigationState {
  tab: Tab;
  timestamp: number;
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
  const [isLoading, setIsLoading] = useState(true);

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
          setIsLoading(false);
          break;

        case 'diffData':
          setFiles(message.payload.files);
          setScope(message.payload.scope);
          setIsLoading(false);
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
          setIsLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const pushNavigation = (tab: Tab) => {
    const newState: NavigationState = { tab, timestamp: Date.now() };
    const newHistory = navigationHistory.slice(0, currentHistoryIndex + 1);
    newHistory.push(newState);
    setNavigationHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  };

  const handleTabChange = (tab: Tab) => {
    if (tab !== activeTab) {
      pushNavigation(tab);
      setActiveTab(tab);

      if (tab === 'commits') {
        vscodeApi.postMessage({ type: 'requestCommits' });
      }
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
    setIsLoading(true);
    setScope(newScope);
    vscodeApi.postMessage({ type: 'requestDiff', scope: newScope });
  };

  const handleRunAiReview = () => {
    const models = ['gpt-4o', 'claude-3-5-sonnet-20241022', 'ollama:llama3'];
    const model = prompt(`Choose AI Model:\n\n1. GPT-4o (OpenAI)\n2. Claude 3.5 Sonnet (Anthropic)\n3. Llama 3 (Ollama - Local)\n\nEnter 1, 2, or 3:`, '1');

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

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--vscode-editor-background)',
        color: 'var(--vscode-editor-foreground)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Loading SelfReview...</div>
        <div style={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)', marginTop: '8px' }}>
          Analyzing your code changes
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--vscode-editor-background)',
      color: 'var(--vscode-editor-foreground)',
      fontFamily: 'var(--vscode-font-family)',
      overflow: 'hidden'
    }}>
      {/* Premium Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '2px solid var(--vscode-panel-border)',
        background: 'var(--vscode-sideBar-background)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Left: Navigation & Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Navigation Buttons */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={handleBack}
                disabled={currentHistoryIndex <= 0}
                style={{
                  padding: '8px 12px',
                  background: currentHistoryIndex <= 0 ? 'transparent' : 'var(--vscode-button-secondaryBackground)',
                  color: currentHistoryIndex <= 0 ? 'var(--vscode-disabledForeground)' : 'var(--vscode-button-secondaryForeground)',
                  border: '1px solid var(--vscode-button-border)',
                  cursor: currentHistoryIndex <= 0 ? 'not-allowed' : 'pointer',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s'
                }}
                title="Back (Alt+Left)"
              >
                ←
              </button>
              <button
                onClick={handleForward}
                disabled={currentHistoryIndex >= navigationHistory.length - 1}
                style={{
                  padding: '8px 12px',
                  background: currentHistoryIndex >= navigationHistory.length - 1 ? 'transparent' : 'var(--vscode-button-secondaryBackground)',
                  color: currentHistoryIndex >= navigationHistory.length - 1 ? 'var(--vscode-disabledForeground)' : 'var(--vscode-button-secondaryForeground)',
                  border: '1px solid var(--vscode-button-border)',
                  cursor: currentHistoryIndex >= navigationHistory.length - 1 ? 'not-allowed' : 'pointer',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s'
                }}
                title="Forward (Alt+Right)"
              >
                →
              </button>
            </div>

            <div style={{
              width: '2px',
              height: '32px',
              background: 'var(--vscode-panel-border)'
            }} />

            {/* Tab Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'diff', label: 'Diff', icon: '📄' },
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'activity', label: 'Activity', icon: '💬', badge: threads.length },
                { id: 'commits', label: 'Commits', icon: '📝' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as Tab)}
                  style={{
                    padding: '10px 20px',
                    background: activeTab === tab.id ? 'var(--vscode-button-background)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                    border: activeTab === tab.id ? 'none' : '1px solid transparent',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = 'var(--vscode-list-hoverBackground)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span style={{
                      background: 'var(--vscode-badge-background)',
                      color: 'var(--vscode-badge-foreground)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      minWidth: '20px',
                      textAlign: 'center'
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Actions & Stats */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Comment Stats */}
            {threads.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '16px',
                padding: '8px 16px',
                background: 'var(--vscode-editor-background)',
                borderRadius: '6px',
                border: '1px solid var(--vscode-panel-border)',
                fontSize: '13px',
                fontWeight: 'bold'
              }}>
                <span style={{ color: '#f48771', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>🔴</span>
                  {openComments} Open
                </span>
                <span style={{ color: '#89d185', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>✅</span>
                  {resolvedComments} Resolved
                </span>
              </div>
            )}

            {/* AI Progress */}
            {aiProgress && (
              <div style={{
                padding: '8px 16px',
                background: aiProgress.state === 'running' ? '#3794ff20' : aiProgress.state === 'done' ? '#89d18520' : '#f4877120',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>{aiProgress.state === 'running' ? '⏳' : aiProgress.state === 'done' ? '✅' : '❌'}</span>
                <span>{aiProgress.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <button
              onClick={handleRunAiReview}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
              }}
            >
              <span style={{ fontSize: '16px' }}>🤖</span>
              <span>AI Review</span>
            </button>

            <button
              onClick={handleExportComments}
              style={{
                padding: '10px 20px',
                background: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: '1px solid var(--vscode-button-border)',
                cursor: 'pointer',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--vscode-button-hoverBackground)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--vscode-button-secondaryBackground)';
              }}
            >
              <span>📤</span>
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--vscode-editor-background)' }}>
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
