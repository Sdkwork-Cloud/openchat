import { useLocation } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { Sidebar } from '../../components/Sidebar';
import { AppRoutes } from '../router/AppRoutes';
import { ROUTE_PATHS } from '../router/routePaths';

export function MainLayout() {
  const location = useLocation();
  const isAuthRoute = location.pathname === ROUTE_PATHS.LOGIN;

  if (isAuthRoute) {
    return (
      <div className="shell-frame shell-frame-auth">
        <div className="shell-backdrop">
          <div className="shell-backdrop-top" />
        </div>
        <main className="relative z-10 flex-1 overflow-auto scrollbar-hide">
          <AppRoutes />
        </main>
      </div>
    );
  }

  return (
    <div className="shell-app">
      <div className="shell-backdrop">
        <div className="shell-backdrop-top" />
        <div className="shell-backdrop-side" />
      </div>

      <AppHeader />
      <div className="shell-body">
        <Sidebar />
        <main className="shell-main scrollbar-hide">
          <AppRoutes />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
