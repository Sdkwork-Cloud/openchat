/**
 * 终端页面 - 支持动态主题
 *
 * 布局：
 * - 左侧：280px 会话列表
 * - 右侧：自适应 终端区域
 */

import { useEffect, useRef, useState } from 'react';
import { isDesktop } from '../platform';
import { Button } from '../components/ui/Button';

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
    connected: 'bg-success',
    disconnected: 'bg-text-muted',
    connecting: 'bg-warning animate-pulse',
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-primary-soft border-l-2 border-primary'
          : 'hover:bg-bg-hover border-l-2 border-transparent'
      }`}
    >
      {/* 图标 */}
      <div className="w-10 h-10 rounded-lg bg-bg-tertiary border border-border flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0 ml-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-text-primary text-sm truncate pr-2">
            {session.name}
          </h3>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[session.status]}`} />
        </div>
        <p className="text-xs text-text-muted mt-0.5 truncate">
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
      // 使用更安全的默认值获取方式
      const getVar = (name: string, fallback: string) => root.getPropertyValue(name).trim() || fallback;

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "JetBrains Mono", "Courier New", monospace',
        allowTransparency: true,
        theme: {
          background: getVar('--bg-primary', '#000000'),
          foreground: getVar('--text-primary', '#FFFFFF'),
          cursor: getVar('--ai-primary', '#3B82F6'),
          selectionBackground: getVar('--ai-primary-soft', 'rgba(59, 130, 246, 0.15)'),
          black: getVar('--bg-primary', '#000000'),
          red: getVar('--ai-error', '#EF4444'),
          green: getVar('--ai-success', '#22C55E'),
          yellow: getVar('--ai-warning', '#F59E0B'),
          blue: getVar('--ai-primary', '#3B82F6'),
          magenta: getVar('--ai-purple', '#8B5CF6'),
          cyan: getVar('--ai-cyan', '#06B6D4'),
          white: getVar('--text-primary', '#FFFFFF'),
          brightBlack: getVar('--bg-secondary', '#0A0A0A'),
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
        // 清空之前的内容（如果有）
        terminalRef.current.innerHTML = '';
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
        
        // 监听窗口大小变化
        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);
        
        return () => {
             window.removeEventListener('resize', handleResize);
             terminal.dispose();
        }
      }
    };

    initTerminal();
  }, []);

  const selectedSession = sessions.find((s) => s.id === selectedId);

  if (!isDesktopEnv) {
    return (
      <>
        {/* 左侧会话列表 */}
        <div className="w-[280px] bg-bg-secondary border-r border-border flex flex-col backdrop-blur-md">
          {/* 头部 */}
          <div className="h-[60px] flex items-center justify-between px-4 border-b border-border">
            <h1 className="text-base font-semibold text-text-primary">终端</h1>
            <Button variant="ghost" size="icon" title="新建终端">
              <svg className="w-5 h-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          </div>
          {/* 会话列表 */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border-medium">
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
        <div className="flex-1 flex items-center justify-center bg-bg-primary">
          <div className="text-center text-text-muted">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-bg-tertiary flex items-center justify-center border border-border">
               <svg className="w-12 h-12 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
               </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-text-primary">终端仅在桌面版可用</h2>
            <p>请下载桌面版应用以使用终端功能</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* 左侧会话列表 - 280px */}
      <div className="w-[280px] bg-bg-secondary border-r border-border flex flex-col backdrop-blur-md">
        {/* 头部 */}
        <div className="h-[60px] flex items-center justify-between px-4 border-b border-border">
          <h1 className="text-base font-semibold text-text-primary">终端</h1>
          <Button variant="ghost" size="icon" title="新建终端">
             <svg className="w-5 h-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border-medium">
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
      <div className="flex-1 flex flex-col bg-bg-primary min-w-0">
        {/* 终端头部 */}
        <div className="h-[48px] bg-bg-secondary border-b border-border flex items-center justify-between px-4 backdrop-blur-md">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-text-primary">{selectedSession?.name}</span>
            <span className={`w-2 h-2 rounded-full ${
              selectedSession?.status === 'connected' ? 'bg-success' : 'bg-text-muted'
            }`} />
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" title="复制">
              <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" title="粘贴">
              <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </Button>
             <Button variant="ghost" size="icon" title="清空">
              <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </div>

        {/* 终端区域 */}
        <div className="flex-1 p-4 bg-[#0c0c0c]">
          <div
            ref={terminalRef}
            className="w-full h-full rounded-lg overflow-hidden border border-border shadow-inner"
          />
        </div>
      </div>
    </>
  );
}

export default TerminalPage;
