
import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { MobileLayout } from '../layouts/MobileLayout';

// Eager load critical initial pages
import HomePage from '../pages/HomePage';

// --- Route Configuration ---
// Lazy load mappings
const routes = {
  // Main Tab Pages
  '/': { component: HomePage, useLayout: true },
  '/agents': { component: React.lazy(() => import('../modules/agents/pages/AgentsPage').then(m => ({ default: m.AgentsPage }))), useLayout: true },
  '/creation': { component: React.lazy(() => import('../modules/creation/pages/CreationPage').then(m => ({ default: m.CreationPage }))), useLayout: true },
  '/discover': { component: React.lazy(() => import('../modules/discover/pages/DiscoverPage').then(m => ({ default: m.DiscoverPage }))), useLayout: true },
  '/me': { component: React.lazy(() => import('../modules/user/pages/MePage').then(m => ({ default: m.MePage }))), useLayout: true },
  
  // Immersive Feature Pages
  '/chat': { component: React.lazy(() => import('../modules/chat/pages/ChatPage').then(m => ({ default: m.ChatPage }))), useLayout: false },
  '/chat/details': { component: React.lazy(() => import('../modules/chat/pages/ChatDetailsPage').then(m => ({ default: m.ChatDetailsPage }))), useLayout: false },
  '/contacts': { component: React.lazy(() => import('../modules/contacts/pages/ContactsPage').then(m => ({ default: m.ContactsPage }))), useLayout: false },
  '/search': { component: React.lazy(() => import('../modules/search/pages/SearchPage').then(m => ({ default: m.SearchPage }))), useLayout: false },
  '/video-channel': { component: React.lazy(() => import('../modules/video/pages/VideoChannelPage').then(m => ({ default: m.VideoChannelPage }))), useLayout: false },
  '/scan': { component: React.lazy(() => import('../modules/tools/pages/ScanPage').then(m => ({ default: m.ScanPage }))), useLayout: false },
  
  // Settings & General
  '/settings': { component: React.lazy(() => import('../modules/settings/pages/SettingsPage').then(m => ({ default: m.SettingsPage }))), useLayout: false },
  '/settings/theme': { component: React.lazy(() => import('../modules/settings/pages/ThemePage').then(m => ({ default: m.ThemePage }))), useLayout: false },
  '/general': { component: React.lazy(() => import('../pages/GeneralPage').then(m => ({ default: m.GeneralPage }))), useLayout: false },
  
  // Sub-Modules
  '/wallet': { component: React.lazy(() => import('../modules/wallet/pages/WalletPage').then(m => ({ default: m.WalletPage }))), useLayout: false },
  '/moments': { component: React.lazy(() => import('../modules/social/pages/MomentsPage').then(m => ({ default: m.MomentsPage }))), useLayout: false },
  '/profile/self': { component: React.lazy(() => import('../modules/user/pages/ProfileInfoPage').then(m => ({ default: m.ProfileInfoPage }))), useLayout: false },
  '/profile/qrcode': { component: React.lazy(() => import('../modules/user/pages/MyQRCodePage').then(m => ({ default: m.MyQRCodePage }))), useLayout: false },
  '/favorites': { component: React.lazy(() => import('../modules/social/pages/FavoritesPage').then(m => ({ default: m.FavoritesPage }))), useLayout: false },
  '/video-call': { component: React.lazy(() => import('../modules/communication/pages/VideoCallPage').then(m => ({ default: m.VideoCallPage }))), useLayout: false },
  '/contact/profile': { component: React.lazy(() => import('../modules/contacts/pages/ContactProfilePage').then(m => ({ default: m.ContactProfilePage }))), useLayout: false },
  
  // New Independent User Pages
  '/my-agents': { component: React.lazy(() => import('../modules/user/pages/MyAgentsPage').then(m => ({ default: m.MyAgentsPage }))), useLayout: false },
  '/my-creations': { component: React.lazy(() => import('../modules/user/pages/MyCreationsPage').then(m => ({ default: m.MyCreationsPage }))), useLayout: false },
};

// --- Utilities ---

const parseHash = () => {
  const hash = window.location.hash.slice(1) || '/';
  const [path, queryStr] = hash.split('?');
  const query = new URLSearchParams(queryStr || '');
  return { path, query };
};

const pathStack: string[] = [parseHash().path];
let isNavigatingBack = false;

// Enhanced Loading Spinner
const PageLoader = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)' }}>
        <div className="loader-ring">
            <div></div><div></div><div></div><div></div>
        </div>
        <style>{`
            .loader-ring { display: inline-block; position: relative; width: 40px; height: 40px; }
            .loader-ring div { box-sizing: border-box; display: block; position: absolute; width: 32px; height: 32px; margin: 4px; border: 3px solid var(--primary-color); border-radius: 50%; animation: loader-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite; border-color: var(--primary-color) transparent transparent transparent; }
            .loader-ring div:nth-child(1) { animation-delay: -0.45s; }
            .loader-ring div:nth-child(2) { animation-delay: -0.3s; }
            .loader-ring div:nth-child(3) { animation-delay: -0.15s; }
            @keyframes loader-ring { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
    </div>
);

// --- Router Component ---

export const Router: React.FC = () => {
  const [route, setRoute] = useState(parseHash());
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const onHashChange = () => {
        const newRoute = parseHash();
        const currentPath = newRoute.path;
        
        // Simple stack management for transitions
        const lastPath = pathStack[pathStack.length - 1];
        const prevPath = pathStack[pathStack.length - 2];

        if (currentPath === lastPath) {
            // Same path
        } else if (currentPath === prevPath) {
            pathStack.pop();
        } else {
            pathStack.push(currentPath);
            // Cap stack size to prevent memory leaks in long sessions
            if (pathStack.length > 15) pathStack.splice(1, 1);
        }

        setIsAnimating(true);
        setRoute(newRoute);
        isNavigatingBack = false;

        setTimeout(() => setIsAnimating(false), 300);
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const { path } = route;
  
  // Resolve Route
  // Fallback to GeneralPage if path not found, or HomePage if root
  const routeConfig = routes[path as keyof typeof routes] || routes['/general'];
  
  // Special case: if path is empty string, map to home
  const finalConfig = path === '' ? routes['/'] : routeConfig;

  const Content = finalConfig.component;
  const useLayout = finalConfig.useLayout;

  // Wrap Content
  const AnimatedContent = () => (
      <div className={isAnimating ? 'page-enter' : 'page-enter-active'} style={{ height: '100%' }}>
          <Suspense fallback={<PageLoader />}>
            <Content />
          </Suspense>
      </div>
  );

  if (useLayout) {
    return (
      <MobileLayout>
        <AnimatedContent />
      </MobileLayout>
    );
  }

  return <AnimatedContent />;
};

// --- Navigation Helpers ---

export const navigate = (path: string, params?: Record<string, string>) => {
  const hash = params 
    ? `${path}?${new URLSearchParams(params).toString()}` 
    : path;
  window.location.hash = hash;
};

export const navigateBack = (fallbackPath: string = '/') => {
    if (isNavigatingBack) return; 
    if (pathStack.length > 1) {
        isNavigatingBack = true;
        const previousPath = window.location.hash;
        window.history.back();
        // Fallback check: if history didn't change (e.g., first page), force navigation
        setTimeout(() => {
            if (window.location.hash === previousPath) {
                navigate(fallbackPath); 
                isNavigatingBack = false;
            }
        }, 50);
    } else {
        navigate(fallbackPath);
    }
};

export const useQueryParams = () => {
    const [params, setParams] = useState(new URLSearchParams(window.location.hash.split('?')[1]));
    useEffect(() => {
        const handleHashChange = () => setParams(new URLSearchParams(window.location.hash.split('?')[1]));
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);
    return params;
};
