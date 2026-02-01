/**
 * 侧边栏组件 - 支持动态主题
 * 
 * 特点：
 * - 使用 CSS 变量支持主题切换
 * - 统一的色彩语言
 * - 克制的交互反馈
 */

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavItem {
  id: string;
  icon: (active: boolean) => React.ReactNode;
  path: string;
  badge?: number;
  label: string;
}

// AI 助手图标
const AIChatIcon = ({ active }: { active: boolean }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-colors duration-200 ${active ? 'text-[var(--ai-primary)]' : 'text-[var(--text-tertiary)]'}`}
  >
    <path
      d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? 'var(--ai-primary-soft)' : 'none'}
    />
    <path
      d="M8 12C8 12 9.5 14 12 14C14.5 14 16 12 16 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="9" cy="10" r="1" fill="currentColor" />
    <circle cx="15" cy="10" r="1" fill="currentColor" />
  </svg>
);

// 联系人图标
const AIContactsIcon = ({ active }: { active: boolean }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-colors duration-200 ${active ? 'text-[var(--ai-primary)]' : 'text-[var(--text-tertiary)]'}`}
  >
    <path
      d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? 'var(--ai-primary-soft)' : 'none'}
    />
    <path
      d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? 'var(--ai-primary-soft)' : 'none'}
    />
    <path
      d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 终端图标
const AITerminalIcon = ({ active }: { active: boolean }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-colors duration-200 ${active ? 'text-[var(--ai-primary)]' : 'text-[var(--text-tertiary)]'}`}
  >
    <rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? 'var(--ai-primary-soft)' : 'none'}
    />
    <path
      d="M6 8L10 12L6 16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 16H18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// 设置图标
const AISettingsIcon = ({ active }: { active: boolean }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-colors duration-200 ${active ? 'text-[var(--ai-primary)]' : 'text-[var(--text-tertiary)]'}`}
  >
    <circle
      cx="12"
      cy="12"
      r="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? 'var(--ai-primary-soft)' : 'none'}
    />
    <path
      d="M19.4 15C19.2669 15.3016 19.2272 15.6361 19.286 15.9606C19.3448 16.2851 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.3651 19.2648 16.0406 19.206C15.7161 19.1472 15.3816 19.1869 15.08 19.32C14.7841 19.4465 14.532 19.6572 14.3553 19.9255C14.1786 20.1937 14.0851 20.5082 14.0867 20.83V21C14.0867 21.5304 13.876 22.0391 13.5009 22.4142C13.1258 22.7893 12.6171 23 12.0867 23C11.5562 23 11.0475 22.7893 10.6724 22.4142C10.2973 22.0391 10.0867 21.5304 10.0867 21V20.91C10.0953 20.579 10.0047 20.2524 9.82597 19.9727C9.64726 19.693 9.38839 19.4729 9.08333 19.34C8.78175 19.2069 8.44725 19.1672 8.12276 19.226C7.79826 19.2848 7.49906 19.4395 7.26333 19.67L7.20333 19.73C7.01763 19.916 6.79704 20.0635 6.55425 20.1641C6.31146 20.2448 6.05117 20.3166 5.78833 20.3166C5.52549 20.3166 5.2652 20.2648 5.02241 20.1641C4.77962 20.0635 4.55903 19.916 4.37333 19.73C4.18734 19.5443 4.03984 19.3237 3.93918 19.0809C3.83852 18.8381 3.78674 18.5778 3.78674 18.315C3.78674 18.0522 3.83852 17.7919 3.93918 17.5491C4.03984 17.3063 4.18734 17.0857 4.37333 16.9L4.43333 16.84C4.66385 16.6043 4.81852 16.3051 4.87732 15.9806C4.93612 15.6561 4.89646 15.3216 4.76333 15.02C4.6368 14.7241 4.42606 14.472 4.15783 14.2953C3.8896 14.1186 3.5751 14.0251 3.25333 14.0267H3.08667C2.55623 14.0267 2.04752 13.816 1.67245 13.4409C1.29737 13.0658 1.08667 12.5571 1.08667 12.0267C1.08667 11.4962 1.29737 10.9875 1.67245 10.6124C2.04752 10.2373 2.55623 10.0267 3.08667 10.0267H3.17667C3.50766 10.0181 3.83424 9.92747 4.11395 9.74876C4.39367 9.57005 4.61376 9.31118 4.74667 9.00612C4.87977 8.70454 4.91943 8.37004 4.86063 8.04554C4.80183 7.72105 4.64717 7.42185 4.41667 7.18612L4.35667 7.12612C4.17068 6.94042 4.02318 6.71983 3.92252 6.47704C3.82186 6.23425 3.77008 5.97396 3.77008 5.71112C3.77008 5.44828 3.82186 5.18799 3.92252 4.9452C4.02318 4.70241 4.17068 4.48182 4.35667 4.29612C4.54237 4.11013 4.76296 3.96263 5.00575 3.86197C5.24854 3.76131 5.50883 3.70953 5.77167 3.70953C6.03451 3.70953 6.2948 3.76131 6.53759 3.86197C6.78038 3.96263 7.00097 4.11013 7.18667 4.29612L7.24667 4.35612C7.4824 4.58664 7.7816 4.74131 8.10609 4.80011C8.43059 4.85891 8.76509 4.81925 9.06667 4.68612C9.36256 4.55959 9.61463 4.34885 9.79133 4.08062C9.96803 3.81239 10.0615 3.49789 10.0599 3.17612V3.02667C10.0599 2.49623 10.2706 1.98752 10.6457 1.61245C11.0207 1.23737 11.5294 1.02667 12.0599 1.02667C12.5903 1.02667 13.099 1.23737 13.4741 1.61245C13.8492 1.98752 14.0599 2.49623 14.0599 3.02667V3.11667C14.0583 3.43844 14.1648 3.75294 14.3415 4.02117C14.5182 4.2894 14.7703 4.50014 15.0662 4.62667C15.3677 4.7598 15.7022 4.79946 16.0267 4.74066C16.3512 4.68186 16.6504 4.5272 16.8862 4.29667L16.9462 4.23667C17.1319 4.05068 17.3525 3.90318 17.5953 3.80252C17.8381 3.70186 18.0984 3.65008 18.3612 3.65008C18.6241 3.65008 18.8843 3.70186 19.1271 3.80252C19.3699 3.90318 19.5905 4.05068 19.7762 4.23667C19.9622 4.42237 20.1097 4.64296 20.2103 4.88575C20.311 5.12854 20.3628 5.38883 20.3628 5.65167C20.3628 5.91451 20.311 6.1748 20.2103 6.41759C20.1097 6.66038 19.9622 6.88097 19.7762 7.06667L19.7162 7.12667C19.4857 7.3624 19.331 7.6616 19.2722 7.98609C19.2134 8.31059 19.2531 8.64509 19.3862 8.94667C19.5127 9.24256 19.7235 9.49463 19.9917 9.67133C20.2599 9.84803 20.5744 9.94149 20.8962 9.93987H21.0599C21.5903 9.93987 22.099 10.1506 22.4741 10.5256C22.8492 10.9007 23.0599 11.4094 23.0599 11.9399C23.0599 12.4703 22.8492 12.979 22.4741 13.3541C22.099 13.7292 21.5903 13.9399 21.0599 13.9399H20.9699C20.6481 13.9415 20.3336 14.048 20.0654 14.2247C19.7972 14.4014 19.5864 14.6535 19.4599 14.9494V14.9399Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Agent 市场图标
const AIAgentIcon = ({ active }: { active: boolean }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-colors duration-200 ${active ? 'text-[var(--ai-primary)]' : 'text-[var(--text-tertiary)]'}`}
  >
    <path
      d="M12 2L2 7L12 12L22 7L12 2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? 'var(--ai-primary-soft)' : 'none'}
    />
    <path
      d="M2 17L12 22L22 17"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 12L12 17L22 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const navItems: NavItem[] = [
  {
    id: 'chat',
    icon: (active) => <AIChatIcon active={active} />,
    path: '/chat',
    badge: 3,
    label: 'AI对话',
  },
  {
    id: 'contacts',
    icon: (active) => <AIContactsIcon active={active} />,
    path: '/contacts',
    label: '联系人',
  },
  {
    id: 'agents',
    icon: (active) => <AIAgentIcon active={active} />,
    path: '/agents',
    label: 'Agent 市场',
  },
  {
    id: 'terminal',
    icon: (active) => <AITerminalIcon active={active} />,
    path: '/terminal',
    label: '终端',
  },
];

/**
 * 侧边栏组件 - 支持动态主题
 */
export function Sidebar() {
  const location = useLocation();
  const [activePath, setActivePath] = useState(location.pathname);

  return (
    <aside className="w-[72px] h-full bg-[var(--bg-secondary)] flex flex-col items-center py-5 select-none border-r border-[var(--border-color)]">
      {/* Logo */}
      <div className="mb-8 relative group cursor-pointer">
        <div className="w-11 h-11 rounded-xl bg-[var(--ai-primary)] flex items-center justify-center text-white font-bold text-lg shadow-[var(--shadow-md)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* 状态指示器 */}
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--ai-success)] border-2 border-[var(--bg-secondary)] rounded-full"></div>
        
        {/* 悬停提示 */}
        <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--ai-primary)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-[var(--border-color)] shadow-[var(--shadow-md)]">
          OpenChat AI
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 flex flex-col items-center space-y-1">
        {navItems.map((item) => {
          const isActive = activePath.startsWith(item.path);
          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={() => setActivePath(item.path)}
              className="relative p-3 rounded-xl transition-all duration-200 group"
              title={item.label}
            >
              {/* 选中背景 */}
              <div 
                className={`absolute inset-0 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-[var(--ai-primary-soft)]' 
                    : 'opacity-0 group-hover:opacity-100 bg-[var(--bg-hover)]'
                }`}
              />
              
              {/* 图标 */}
              <div className="relative z-10">
                {item.icon(isActive)}
              </div>
              
              {/* 徽章 */}
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[var(--ai-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-[var(--shadow-sm)]">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              
              {/* 悬停标签 */}
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-[var(--border-color)] shadow-[var(--shadow-md)]">
                {item.label}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* 底部设置 */}
      <div className="mt-auto pt-4 border-t border-[var(--border-color)]">
        <NavLink
          to="/settings"
          onClick={() => setActivePath('/settings')}
          className="relative p-3 rounded-xl transition-all duration-200 group block"
          title="设置"
        >
          <div 
            className={`absolute inset-0 rounded-xl transition-all duration-200 ${
              activePath === '/settings'
                ? 'bg-[var(--ai-primary-soft)]'
                : 'opacity-0 group-hover:opacity-100 bg-[var(--bg-hover)]'
            }`}
          />
          <div className="relative z-10">
            <AISettingsIcon active={activePath === '/settings'} />
          </div>
          
          {/* 悬停标签 */}
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-[var(--border-color)] shadow-[var(--shadow-md)]">
            设置
          </div>
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;
