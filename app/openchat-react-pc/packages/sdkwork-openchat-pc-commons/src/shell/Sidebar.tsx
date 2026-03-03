import { type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  AIAgentIcon,
  AIAppStoreIcon,
  AIChatIcon,
  AICloudIcon,
  AIContactsIcon,
  AICreationIcon,
  AIDiscoverIcon,
  AINotificationIcon,
  AISettingsIcon,
  AIShortVideoIcon,
  AISkillIcon,
  AISocialIcon,
  AIShopIcon,
  AITerminalIcon,
  AIToolsIcon,
  AIWalletIcon,
} from "./SidebarIcons";

export interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: (active: boolean) => ReactNode;
  badge?: number;
}

export const sidebarNavItems: NavItem[] = [
  { id: "chat", path: "/chat", label: "Chat", icon: (active) => <AIChatIcon active={active} />, badge: 3 },
  { id: "contacts", path: "/contacts", label: "Contacts", icon: (active) => <AIContactsIcon active={active} /> },
  { id: "agents", path: "/agents", label: "Agents", icon: (active) => <AIAgentIcon active={active} /> },
  { id: "skills", path: "/skills", label: "Skills", icon: (active) => <AISkillIcon active={active} /> },
  { id: "appstore", path: "/appstore", label: "App Store", icon: (active) => <AIAppStoreIcon active={active} /> },
  {
    id: "notifications",
    path: "/notifications",
    label: "Notifications",
    icon: (active) => <AINotificationIcon active={active} />,
    badge: 5,
  },
  { id: "commerce", path: "/commerce/mall", label: "Commerce", icon: (active) => <AIShopIcon active={active} /> },
  { id: "moments", path: "/moments", label: "Moments", icon: (active) => <AISocialIcon active={active} /> },
  { id: "discover", path: "/discover", label: "Discover", icon: (active) => <AIDiscoverIcon active={active} /> },
  { id: "wallet", path: "/wallet", label: "Wallet", icon: (active) => <AIWalletIcon active={active} /> },
  { id: "creation", path: "/creation", label: "Creation", icon: (active) => <AICreationIcon active={active} /> },
  { id: "drive", path: "/drive", label: "Drive", icon: (active) => <AICloudIcon active={active} /> },
  {
    id: "short-video",
    path: "/short-video",
    label: "Short Video",
    icon: (active) => <AIShortVideoIcon active={active} />,
  },
  { id: "tools", path: "/tools", label: "Tools", icon: (active) => <AIToolsIcon active={active} /> },
  { id: "terminal", path: "/terminal", label: "Terminal", icon: (active) => <AITerminalIcon active={active} /> },
];

function isPathActive(currentPath: string, targetPath: string): boolean {
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

export function Sidebar() {
  const { pathname } = useLocation();
  const settingsActive = isPathActive(pathname, "/settings");

  return (
    <aside className="flex h-full w-[72px] select-none flex-col overflow-x-hidden border-r border-border bg-bg-secondary py-4 backdrop-blur-md">
      <div className="mb-6 flex justify-center">
        <div className="group relative cursor-pointer">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-cyan-500 text-lg font-bold text-white shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                stroke="white"
                strokeWidth="1.5"
              />
              <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse-slow rounded-full border-2 border-bg-secondary bg-success" />
          <div className="pointer-events-none absolute left-full z-50 ml-3 translate-x-2 whitespace-nowrap rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-xs font-medium text-primary opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
            OpenChat AI
          </div>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden py-2">
        {sidebarNavItems.map((item) => {
          const active = isPathActive(pathname, item.path);
          return (
            <NavLink
              key={item.id}
              to={item.path}
              aria-label={item.label}
              title={item.label}
              className="group relative flex h-12 w-12 items-center justify-center rounded-xl p-2.5 transition-all duration-200"
            >
              <div
                className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                  active
                    ? "bg-primary-soft shadow-[inset_0_0_20px_rgba(59,130,246,0.15)]"
                    : "opacity-0 group-hover:translate-x-0.5 group-hover:bg-bg-hover group-hover:opacity-100"
                }`}
              />

              <div className="relative z-10">{item.icon(active)}</div>

              {item.badge && item.badge > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full border-2 border-bg-secondary bg-error px-1 text-[10px] font-bold text-white shadow-md">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}

              <div className="pointer-events-none absolute left-full z-50 ml-3 translate-x-2 whitespace-nowrap rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-xs text-text-secondary opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                {item.label}
              </div>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto flex justify-center border-t border-border pt-3">
        <NavLink
          to="/settings"
          aria-label="Settings"
          title="Settings"
          className="group relative flex h-12 w-12 items-center justify-center rounded-xl p-2.5 transition-all duration-200"
        >
          <div
            className={`absolute inset-0 rounded-xl transition-all duration-300 ${
              settingsActive
                ? "bg-primary-soft shadow-[inset_0_0_20px_rgba(59,130,246,0.15)]"
                : "opacity-0 group-hover:translate-x-0.5 group-hover:bg-bg-hover group-hover:opacity-100"
            }`}
          />
          <div className="relative z-10 transition-transform duration-300 group-hover:rotate-45">
            <AISettingsIcon active={settingsActive} />
          </div>
          <div className="pointer-events-none absolute left-full z-50 ml-3 translate-x-2 whitespace-nowrap rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-xs text-text-secondary opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
            Settings
          </div>
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;
