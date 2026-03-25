import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuthStore } from '@openchat/opencat-admin-core';
import { ROUTE_PATHS } from './routePaths';

const AuthPage = lazy(() => import('@openchat/opencat-admin-auth').then((module) => ({ default: module.AuthPage })));
const DashboardPage = lazy(() => import('@openchat/opencat-admin-dashboard').then((module) => ({ default: module.DashboardPage })));
const UserListPage = lazy(() => import('@openchat/opencat-admin-users').then((module) => ({ default: module.UserListPage })));
const GroupListPage = lazy(() => import('@openchat/opencat-admin-groups').then((module) => ({ default: module.GroupListPage })));
const FriendListPage = lazy(() => import('@openchat/opencat-admin-friends').then((module) => ({ default: module.FriendListPage })));
const MessageListPage = lazy(() => import('@openchat/opencat-admin-messages').then((module) => ({ default: module.MessageListPage })));
const DeviceListPage = lazy(() => import('@openchat/opencat-admin-iot').then((module) => ({ default: module.DeviceListPage })));
const RtcPage = lazy(() => import('@openchat/opencat-admin-rtc').then((module) => ({ default: module.RtcPage })));
const ImServerPage = lazy(() => import('@openchat/opencat-admin-im-server').then((module) => ({ default: module.ImServerPage })));
const SystemSettingsPage = lazy(() => import('@openchat/opencat-admin-system').then((module) => ({ default: module.SystemSettingsPage })));

function RouteFallback() {
  return (
    <div className="app-shell">
      <div className="boot-splash">
        <div className="boot-orbit" />
        <div>
          <p className="boot-title">OpenChat Super Admin</p>
          <p className="boot-subtitle">Loading workspace surface...</p>
        </div>
      </div>
    </div>
  );
}

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="content-stack"
    >
      {children}
    </motion.div>
  );
}

function buildLoginRedirect(pathname: string, search: string) {
  return `${ROUTE_PATHS.LOGIN}?redirect=${encodeURIComponent(`${pathname}${search || ''}`)}`;
}

function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  if (isBootstrapping) {
    return <RouteFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to={buildLoginRedirect(location.pathname, location.search)} replace />;
  }

  return <Outlet />;
}

export function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path={ROUTE_PATHS.ROOT} element={<Navigate to={ROUTE_PATHS.OVERVIEW} replace />} />
          <Route path={ROUTE_PATHS.LOGIN} element={<AuthPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path={ROUTE_PATHS.OVERVIEW} element={<PageFrame><DashboardPage /></PageFrame>} />
            <Route path={ROUTE_PATHS.USERS} element={<PageFrame><UserListPage /></PageFrame>} />
            <Route path={ROUTE_PATHS.GROUPS} element={<PageFrame><GroupListPage /></PageFrame>} />
            <Route path={ROUTE_PATHS.FRIENDS} element={<PageFrame><FriendListPage /></PageFrame>} />
            <Route path={ROUTE_PATHS.MESSAGES} element={<PageFrame><MessageListPage /></PageFrame>} />
            <Route path={ROUTE_PATHS.IOT} element={<PageFrame><DeviceListPage /></PageFrame>} />
            <Route path={ROUTE_PATHS.RTC} element={<PageFrame><RtcPage /></PageFrame>} />
            <Route path={ROUTE_PATHS.IM_SERVER} element={<PageFrame><ImServerPage /></PageFrame>} />
            <Route path={ROUTE_PATHS.SYSTEM} element={<PageFrame><SystemSettingsPage /></PageFrame>} />
          </Route>
          <Route path="*" element={<Navigate to={ROUTE_PATHS.OVERVIEW} replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
