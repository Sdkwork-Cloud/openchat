/**
 * 终端页面 - 支持动态主题
 *
 * 布局：
 * - 左侧：280px 会话列表
 * - 右侧：自适应 终端区域
 */

import { useEffect, useRef, useState } from 'react';
import { isDesktop } from '../platform';

// 模拟终端会话
interface TerminalSession {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  lastCommand?: string;
}

const mockSessions: TerminalSession[] = [
  { id: '1', name: '本地终端', status: 'connected', lastCommand: 'npm run dev' },
  { id: '2', name: '远程服务器', status: 'connected', lastCommand: 'git status' },
  { id: '3', name: 'Docker', status: 'disconnected' },
];

/**
 * 终端会话项
 */
function TerminalSessionItem({
  session,
  isSelected,
  onClick,
}: {
  session: TerminalSession;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusColors = {
    connected: 'bg-[var(--ai-success)]',
    disconnected: 'bg-[var(--text-muted)]',
    connecting: 'bg-[var(--ai-warning)] animate-pulse',
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-[var(--ai-primary-soft)] border-l-2 border-[var(--ai-primary)]'
          : 'hover:bg-[var(--bg-hover)] border-l-2 border-transparent'
      }`}
    >
      {/* 图标 */}
      <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-[var(--ai-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0 ml-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-[var(--text-primary)] text-sm truncate pr-2">
            {session.name}
          </h3>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[session.status]}`} />
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
          {session.lastCommand || '无命令'}
        </p>
      </div>
    </div>
  );
}

/**
 * 终端页面
 */
export function TerminalPage() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string>('1');
  const [isDesktopEnv, setIsDesktopEnv] = useState(false);
  const [sessions] = useState(mockSessions);

  useEffect(() => {
    setIsDesktopEnv(isDesktop());

    if (!isDesktop()) {
      return;
    }

    const initTerminal = async () => {
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');

      // 获取当前主题的 CSS 变量值
      const root = getComputedStyle(document.documentElement);
      const bgPrimary = root.getPropertyValue('--bg-primary').trim() || '#000000';
      const textPrimary = root.getPropertyValue('--text-primary').trim() || '#FFFFFF';
      const aiPrimary = root.getPropertyValue('--ai-primary').trim() || '#3B82F6';
      const aiError = root.getPropertyValue('--ai-error').trim() || '#EF4444';
      const aiSuccess = root.getPropertyValue('--ai-success').trim() || '#22C55E';
      const aiWarning = root.getPropertyValue('--ai-warning').trim() || '#F59E0B';
      const aiPurple = root.getPropertyValue('--ai-purple').trim() || '#8B5CF6';
      const aiCyan = root.getPropertyValue('--ai-cyan').trim() || '#06B6D4';
      const bgSecondary = root.getPropertyValue('--bg-secondary').trim() || '#0A0A0A';

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: bgPrimary,
          foreground: textPrimary,
          cursor: aiPrimary,
          selectionBackground: root.getPropertyValue('--ai-primary-soft').trim() || 'rgba(59, 130, 246, 0.15)',
          black: bgPrimary,
          red: aiError,
          green: aiSuccess,
          yellow: aiWarning,
          blue: aiPrimary,
          magenta: aiPurple,
          cyan: aiCyan,
          white: textPrimary,
          brightBlack: bgSecondary,
          brightRed: '#F87171',
          brightGreen: '#34D399',
          brightYellow: '#FBBF24',
          brightBlue: '#60A5FA',
          brightMagenta: '#A78BFA',
          brightCyan: '#22D3EE',
          brightWhite: '#FFFFFF',
        },
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      if (terminalRef.current) {
        terminal.open(terminalRef.current);
        fitAddon.fit();

        terminal.writeln('\x1b[1;36mWelcome to OpenChat Terminal!\x1b[0m');
        terminal.writeln('');
        terminal.writeln('\x1b[90mConnected to: \x1b[0m\x1b[1m本地终端\x1b[0m');
        terminal.writeln('\x1b[90mShell: \x1b[0m\x1b[1mbash\x1b[0m');
        terminal.writeln('');
        terminal.write('\x1b[1;34m➜\x1b[0m \x1b[1m~\x1b[0m ');

        terminal.onData((data) => {
          terminal.write(data);
        });
      }
    };

    initTerminal();
  }, []);

  const selectedSession = sessions.find((s) => s.id === selectedId);

  if (!isDesktopEnv) {
    return (
      <>
        {/* 左侧会话列表 */}
        <div className="w-[280px] bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col">
          {/* 头部 */}
          <div className="h-[60px] flex items-center justify-between px-4 border-b border-[var(--border-color)]">
            <h1 className="text-base font-semibold text-[var(--text-primary)]">终端</h1>
            <button className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors" title="新建终端">
              <svg className="w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          {/* 会话列表 */}
          <div className="flex-1 overflow-y-auto">
            {sessions.map((session) => (
              <TerminalSessionItem
                key={session.id}
                session={session}
                isSelected={selectedId === session.id}
                onClick={() => setSelectedId(session.id)}
              />
            ))}
          </div>
        </div>
        {/* 右侧提示区域 */}
        <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
          <div className="text-center text-[var(--text-muted)]">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">终端仅在桌面版可用</h2>
            <p>请下载桌面版应用以使用终端功能</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* 左侧会话列表 - 280px */}
      <div className="w-[280px] bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col">
        {/* 头部 */}
        <div className="h-[60px] flex items-center justify-between px-4 border-b border-[var(--border-color)]">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">终端</h1>
          <button className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors" title="新建终端">
            <svg className="w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <TerminalSessionItem
              key={session.id}
              session={session}
              isSelected={selectedId === session.id}
              onClick={() => setSelectedId(session.id)}
            />
          ))}
        </div>
      </div>

      {/* 右侧终端区域 */}
      <div className="flex-1 flex flex-col bg-[var(--bg-primary)] min-w-0">
        {/* 终端头部 */}
        <div className="h-[48px] bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-[var(--text-primary)]">{selectedSession?.name}</span>
            <span className={`w-2 h-2 rounded-full ${
              selectedSession?.status === 'connected' ? 'bg-[var(--ai-success)]' : 'bg-[var(--text-muted)]'
            }`} />
          </div>
          <div className="flex items-center space-x-1">
            <button className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors" title="复制">
              <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors" title="粘贴">
              <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
            <button className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors" title="清空">
              <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 终端区域 */}
        <div className="flex-1 p-4">
          <div
            ref={terminalRef}
            className="w-full h-full rounded-lg overflow-hidden border border-[var(--border-color)]"
          />
        </div>
      </div>
    </>
  );
}

export default TerminalPage;
