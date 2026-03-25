import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { NavLink } from 'react-router-dom';
import { useAppStore, useAuthStore } from '@openchat/opencat-admin-core';
import { StatusBadge, classNames } from '@openchat/opencat-admin-ui';
import { navigationGroups } from '../application/router/navigation';
import { prefetchSidebarRoute } from '../application/router/routePrefetch';

const COLLAPSED_WIDTH = 76;
const MIN_WIDTH = 236;
const MAX_WIDTH = 360;

function clampSidebarWidth(width: number) {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
}

export function Sidebar() {
  const {
    isSidebarCollapsed,
    sidebarWidth,
    toggleSidebar,
    setSidebarCollapsed,
    setSidebarWidth,
  } = useAppStore();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);

  const resolvedSidebarWidth = useMemo(
    () => clampSidebarWidth(sidebarWidth),
    [sidebarWidth],
  );

  useEffect(() => {
    if (resolvedSidebarWidth !== sidebarWidth) {
      setSidebarWidth(resolvedSidebarWidth);
    }
  }, [resolvedSidebarWidth, setSidebarWidth, sidebarWidth]);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (event: PointerEvent) => {
      const nextWidth = clampSidebarWidth(
        resizeStartWidthRef.current + (event.clientX - resizeStartXRef.current),
      );
      setSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing, setSidebarWidth]);

  const startSidebarResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const nextWidth = isSidebarCollapsed ? MIN_WIDTH : resolvedSidebarWidth;
    resizeStartXRef.current = event.clientX;
    resizeStartWidthRef.current = nextWidth;

    if (isSidebarCollapsed) {
      setSidebarCollapsed(false);
      setSidebarWidth(nextWidth);
    }

    setIsResizing(true);
  }, [isSidebarCollapsed, resolvedSidebarWidth, setSidebarCollapsed, setSidebarWidth]);

  const currentWidth = isSidebarCollapsed ? COLLAPSED_WIDTH : resolvedSidebarWidth;

  return (
    <aside
      className={`relative z-20 flex h-full shrink-0 ${
        isResizing ? '' : 'transition-[width] duration-200 ease-out'
      }`}
      style={{ width: currentWidth }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="sidebar-surface">
        <div className={classNames('sidebar-divider border-b', isSidebarCollapsed ? 'px-2 py-4' : 'px-4 py-5')}>
          <div className={classNames('sidebar-panel', isSidebarCollapsed ? 'p-3' : 'p-4')}>
            {isSidebarCollapsed ? (
              <div className="sidebar-brand-mark">
                OA
              </div>
            ) : (
              <>
                <p className="sidebar-brand-kicker">
                  OpenChat
                </p>
                <h1 className="sidebar-brand-title">
                  Super Admin
                </h1>
                <p className="sidebar-brand-description">
                  Standardized control shell for identity, content and infrastructure operations.
                </p>
              </>
            )}
          </div>
        </div>

        <nav className={`scrollbar-hide flex-1 overflow-x-hidden overflow-y-auto ${isSidebarCollapsed ? 'px-2 py-4' : 'px-3 py-5'}`}>
          <div className="space-y-6">
            {navigationGroups.map((group) => (
              <div key={group.section}>
                {!isSidebarCollapsed ? (
                  <div className="sidebar-section-label">
                    {group.section}
                  </div>
                ) : (
                  <div className="sidebar-rule" />
                )}

                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.id}
                      to={item.to}
                      title={isSidebarCollapsed ? item.label : undefined}
                      onMouseEnter={() => prefetchSidebarRoute(item.to)}
                      onFocus={() => prefetchSidebarRoute(item.to)}
                      onPointerDown={() => prefetchSidebarRoute(item.to)}
                      className={({ isActive }) =>
                        classNames(
                          'sidebar-link group',
                          isSidebarCollapsed
                            ? 'mx-auto h-11 w-11 justify-center'
                            : 'justify-between px-3 py-2.5',
                          isActive ? 'sidebar-link-active' : 'sidebar-link-idle',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && !isSidebarCollapsed ? (
                            <motion.div
                              layoutId="sidebar-active-indicator"
                              className="sidebar-active-indicator"
                            />
                          ) : null}
                          <div className="flex items-center gap-3">
                            <item.icon
                              className={classNames(
                                'h-4 w-4 shrink-0 transition-colors',
                                isActive ? 'text-primary-300' : 'sidebar-link-icon-idle',
                              )}
                            />
                            {!isSidebarCollapsed ? (
                              <div className="min-w-0">
                                <div className="text-[14px] tracking-tight">{item.label}</div>
                                <div className="sidebar-link-meta">
                                  {item.description}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className={classNames('sidebar-divider border-t', isSidebarCollapsed ? 'px-2 py-4' : 'px-3 py-4')}>
          <div className={classNames('sidebar-panel', isSidebarCollapsed ? 'p-3' : 'p-4')}>
            {isSidebarCollapsed ? (
              <div className="flex items-center justify-center">
                <div className="sidebar-user-avatar">
                  {user?.displayName?.slice(0, 2).toUpperCase() || 'AD'}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="sidebar-user-avatar">
                    {user?.displayName?.slice(0, 2).toUpperCase() || 'AD'}
                  </div>
                  <div className="min-w-0">
                    <div className="sidebar-user-name truncate">
                      {user?.displayName || 'Unknown operator'}
                    </div>
                    <div className="sidebar-user-username truncate">
                      {user?.username || '-'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(user?.roles || []).map((roleName) => (
                    <StatusBadge key={roleName} value={roleName} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void signOut();
                  }}
                  className="btn btn-ghost mt-4"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing out...' : 'Sign out'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={toggleSidebar}
        className={classNames(
          'sidebar-toggle absolute right-1 top-5 z-30 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200',
          isHovered || isResizing ? 'opacity-100 hover:scale-105' : 'pointer-events-none opacity-0'
        )}
      >
        {isSidebarCollapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>

      <div
        data-slot="sidebar-resize-handle"
        onPointerDown={startSidebarResize}
        className="absolute inset-y-0 right-0 z-20 w-3 cursor-col-resize touch-none"
      />
    </aside>
  );
}
