
import React, { useEffect, useState, Suspense, useRef } from 'react';
import { MobileLayout } from '../layouts/MobileLayout';
import { useAuth } from '../modules/auth/AuthContext';

// Eager load critical initial pages
import HomePage from '../pages/HomePage';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { RegisterPage } from '../modules/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '../modules/auth/pages/ForgotPasswordPage';

// --- Route Configuration ---
const routes: any = {
  // Public Routes
  '/login': { component: LoginPage, useLayout: false, public: true },
  '/register': { component: RegisterPage, useLayout: false, public: true },
  '/forgot-password': { component: ForgotPasswordPage, useLayout: false, public: true },

  // Main Tab Pages (Protected)
  '/': { component: HomePage, useLayout: true },
  '/agents': { component: React.lazy(() => import('../modules/agents/pages/AgentsPage').then(m => ({ default: m.AgentsPage }))), useLayout: true },
  '/creation': { component: React.lazy(() => import('../modules/creation/pages/CreationPage').then(m => ({ default: m.CreationPage }))), useLayout: true },
  '/discover': { component: React.lazy(() => import('../pages/DiscoverPage').then(m => ({ default: m.DiscoverPage }))), useLayout: true },
  '/me': { component: React.lazy(() => import('../modules/user/pages/MePage').then(m => ({ default: m.MePage }))), useLayout: true },
  
  // Feature Pages
  '/notifications': { component: React.lazy(() => import('../modules/notification/pages/NotificationsPage').then(m => ({ default: m.NotificationsPage }))), useLayout: false },
  
  '/chat': { component: React.lazy(() => import('../modules/chat/pages/ChatPage').then(m => ({ default: m.ChatPage }))), useLayout: false },
  '/chat/details': { component: React.lazy(() => import('../modules/chat/pages/ChatDetailsPage').then(m => ({ default: m.ChatDetailsPage }))), useLayout: false },
  '/chat/files': { component: React.lazy(() => import('../modules/chat/pages/ChatFilesPage').then(m => ({ default: m.ChatFilesPage }))), useLayout: false },
  '/contacts': { component: React.lazy(() => import('../modules/contacts/pages/ContactsPage').then(m => ({ default: m.ContactsPage }))), useLayout: false },
  '/contacts/new-friends': { component: React.lazy(() => import('../modules/contacts/pages/NewFriendsPage').then(m => ({ default: m.NewFriendsPage }))), useLayout: false },
  '/search': { component: React.lazy(() => import('../modules/search/pages/SearchPage').then(m => ({ default: m.SearchPage }))), useLayout: false },
  '/video-channel': { component: React.lazy(() => import('../modules/video/pages/VideoChannelPage').then(m => ({ default: m.VideoChannelPage }))), useLayout: false },
  '/scan': { component: React.lazy(() => import('../modules/tools/pages/ScanPage').then(m => ({ default: m.ScanPage }))), useLayout: false },
  '/shake': { component: React.lazy(() => import('../modules/discover/pages/ShakePage').then(m => ({ default: m.ShakePage }))), useLayout: false },
  
  // Content & Creation Details
  '/article/detail': { component: React.lazy(() => import('../modules/content/pages/ArticleDetailPage').then(m => ({ default: m.ArticleDetailPage }))), useLayout: false },
  '/creation/detail': { component: React.lazy(() => import('../modules/creation/pages/CreationDetailPage').then(m => ({ default: m.CreationDetailPage }))), useLayout: false },
  '/creation/search': { component: React.lazy(() => import('../modules/creation/pages/CreationSearchPage').then(m => ({ default: m.CreationSearchPage }))), useLayout: false },

  // Commerce & Others
  '/commerce/mall': { component: React.lazy(() => import('../modules/commerce/pages/MallPage').then(m => ({ default: m.MallPage }))), useLayout: false },
  '/commerce/item': { component: React.lazy(() => import('../modules/commerce/pages/MallProductDetailPage').then(m => ({ default: m.MallProductDetailPage }))), useLayout: false },
  '/commerce/cart': { component: React.lazy(() => import('../modules/commerce/pages/ShoppingCartPage').then(m => ({ default: m.ShoppingCartPage }))), useLayout: false },
  '/commerce/checkout': { component: React.lazy(() => import('../modules/commerce/pages/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage }))), useLayout: false }, 
  '/commerce/product': { component: React.lazy(() => import('../modules/commerce/pages/ProductDetailPage').then(m => ({ default: m.ProductDetailPage }))), useLayout: false },
  '/commerce/category': { component: React.lazy(() => import('../modules/commerce/pages/CategoryPage').then(m => ({ default: m.CategoryPage }))), useLayout: false },
  
  // Distribution
  '/commerce/distribution': { component: React.lazy(() => import('../modules/commerce/pages/DistributionCenterPage').then(m => ({ default: m.DistributionCenterPage }))), useLayout: false },
  '/commerce/distribution/team': { component: React.lazy(() => import('../modules/commerce/pages/MyTeamPage').then(m => ({ default: m.MyTeamPage }))), useLayout: false },
  '/commerce/distribution/goods': { component: React.lazy(() => import('../modules/commerce/pages/DistributionGoodsPage').then(m => ({ default: m.DistributionGoodsPage }))), useLayout: false },
  '/commerce/distribution/commission': { component: React.lazy(() => import('../modules/commerce/pages/CommissionPage').then(m => ({ default: m.CommissionPage }))), useLayout: false },
  '/commerce/distribution/poster': { component: React.lazy(() => import('../modules/commerce/pages/SharePosterPage').then(m => ({ default: m.SharePosterPage }))), useLayout: false },
  '/commerce/distribution/withdraw': { component: React.lazy(() => import('../modules/commerce/pages/WithdrawPage').then(m => ({ default: m.WithdrawPage }))), useLayout: false },
  '/commerce/distribution/rank': { component: React.lazy(() => import('../modules/commerce/pages/DistributionRankPage').then(m => ({ default: m.DistributionRankPage }))), useLayout: false },

  '/orders': { component: React.lazy(() => import('../modules/commerce/pages/OrderListPage').then(m => ({ default: m.OrderListPage }))), useLayout: false },
  '/orders/detail': { component: React.lazy(() => import('../modules/commerce/pages/OrderDetailPage').then(m => ({ default: m.OrderDetailPage }))), useLayout: false },
  '/discover/gigs': { component: React.lazy(() => import('../modules/commerce/pages/GigCenterPage').then(m => ({ default: m.GigCenterPage }))), useLayout: false },
  '/my-gigs': { component: React.lazy(() => import('../modules/commerce/pages/MyGigsPage').then(m => ({ default: m.MyGigsPage }))), useLayout: false },
  
  '/appointments': { component: React.lazy(() => import('../modules/appointments/pages/AppointmentListPage').then(m => ({ default: m.AppointmentListPage }))), useLayout: false },
  '/appointments/detail': { component: React.lazy(() => import('../modules/appointments/pages/AppointmentDetailPage').then(m => ({ default: m.AppointmentDetailPage }))), useLayout: false },
  
  // Settings & System
  '/settings': { component: React.lazy(() => import('../modules/settings/pages/SettingsPage').then(m => ({ default: m.SettingsPage }))), useLayout: false },
  '/settings/theme': { component: React.lazy(() => import('../modules/settings/pages/ThemePage').then(m => ({ default: m.ThemePage }))), useLayout: false },
  '/settings/background': { component: React.lazy(() => import('../modules/settings/pages/ChatBackgroundPage').then(m => ({ default: m.ChatBackgroundPage }))), useLayout: false },
  '/settings/models': { component: React.lazy(() => import('../modules/settings/pages/ModelSettingsPage').then(m => ({ default: m.ModelSettingsPage }))), useLayout: false },
  '/settings/models/detail': { component: React.lazy(() => import('../modules/settings/pages/ModelConfigDetailPage').then(m => ({ default: m.ModelConfigDetailPage }))), useLayout: false },
  
  '/general': { component: React.lazy(() => import('../pages/GeneralPage').then(m => ({ default: m.GeneralPage }))), useLayout: false },
  '/wallet': { component: React.lazy(() => import('../modules/wallet/pages/WalletPage').then(m => ({ default: m.WalletPage }))), useLayout: false },
  '/moments': { component: React.lazy(() => import('../modules/social/pages/MomentsPage').then(m => ({ default: m.MomentsPage }))), useLayout: false },
  '/profile/self': { component: React.lazy(() => import('../modules/user/pages/ProfileInfoPage').then(m => ({ default: m.ProfileInfoPage }))), useLayout: false },
  '/profile/qrcode': { component: React.lazy(() => import('../modules/user/pages/MyQRCodePage').then(m => ({ default: m.MyQRCodePage }))), useLayout: false },
  '/profile/invoice': { component: React.lazy(() => import('../modules/user/pages/MyInvoiceTitlePage').then(m => ({ default: m.MyInvoiceTitlePage }))), useLayout: false },
  '/my-address': { component: React.lazy(() => import('../modules/user/pages/MyAddressPage').then(m => ({ default: m.MyAddressPage }))), useLayout: false },
  '/favorites': { component: React.lazy(() => import('../modules/social/pages/FavoritesPage').then(m => ({ default: m.FavoritesPage }))), useLayout: false },
  '/drive': { component: React.lazy(() => import('../modules/drive/pages/CloudDrivePage').then(m => ({ default: m.CloudDrivePage }))), useLayout: false },
  '/video-call': { component: React.lazy(() => import('../modules/communication/pages/VideoCallPage').then(m => ({ default: m.VideoCallPage }))), useLayout: false },
  '/contact/profile': { component: React.lazy(() => import('../modules/contacts/pages/ContactProfilePage').then(m => ({ default: m.ContactProfilePage }))), useLayout: false },
  '/my-agents': { component: React.lazy(() => import('../modules/user/pages/MyAgentsPage').then(m => ({ default: m.MyAgentsPage }))), useLayout: false },
  '/my-creations': { component: React.lazy(() => import('../modules/user/pages/MyCreationsPage').then(m => ({ default: m.MyCreationsPage }))), useLayout: false },
};

// --- Utils ---
const parseHash = () => {
  const hash = window.location.hash.slice(1) || '/';
  const [path, queryStr] = hash.split('?');
  const query = new URLSearchParams(queryStr || '');
  return { path, query, fullPath: hash };
};

// --- History Stack Management ---
const STACK_KEY = 'sys_router_stack';

const getInitialStack = (): string[] => {
    try {
        const stored = sessionStorage.getItem(STACK_KEY);
        if (stored) {
            const stack = JSON.parse(stored);
            if (Array.isArray(stack) && stack.length > 0) return stack;
        }
    } catch (e) {}
    return [parseHash().path];
};

const pathStack: string[] = getInitialStack();
let isNavigatingBack = false;

const saveStack = () => {
    try {
        sessionStorage.setItem(STACK_KEY, JSON.stringify(pathStack));
    } catch (e) {}
};

const PageLoader = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)' }}>
        <div className="loader-ring"><div></div><div></div><div></div><div></div></div>
        <style>{`
            .loader-ring { display: inline-block; position: relative; width: 32px; height: 32px; }
            .loader-ring div { box-sizing: border-box; display: block; position: absolute; width: 24px; height: 24px; margin: 4px; border: 2px solid var(--primary-color); border-radius: 50%; animation: loader-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite; border-color: var(--primary-color) transparent transparent transparent; }
            .loader-ring div:nth-child(1) { animation-delay: -0.45s; }
            .loader-ring div:nth-child(2) { animation-delay: -0.3s; }
            .loader-ring div:nth-child(3) { animation-delay: -0.15s; }
            @keyframes loader-ring { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
    </div>
);

// --- Transition Manager ---
export const Router: React.FC = () => {
  const [activeRoute, setActiveRoute] = useState(parseHash());
  const [exitRoute, setExitRoute] = useState<{ path: string, query: URLSearchParams, fullPath: string } | null>(null);
  const [direction, setDirection] = useState<'forward' | 'back' | 'none'>('none');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Auth Hook
  const { user, isLoading } = useAuth();

  // Gesture State
  const gestureStartX = useRef(0);
  const gestureStartY = useRef(0);
  const isGestureActive = useRef(false);

  // --- Gesture Listener ---
  useEffect(() => {
      const handleTouchStart = (e: TouchEvent) => {
          if (pathStack.length <= 1) return;
          
          const touch = e.touches[0];
          if (touch.clientX < 25) {
              gestureStartX.current = touch.clientX;
              gestureStartY.current = touch.clientY;
              isGestureActive.current = true;
          } else {
              isGestureActive.current = false;
          }
      };

      const handleTouchEnd = (e: TouchEvent) => {
          if (!isGestureActive.current) return;
          
          const touch = e.changedTouches[0];
          const deltaX = touch.clientX - gestureStartX.current;
          const deltaY = Math.abs(touch.clientY - gestureStartY.current);

          if (deltaX > 80 && deltaX > deltaY * 2) {
              navigateBack();
          }
          isGestureActive.current = false;
      };

      window.addEventListener('touchstart', handleTouchStart);
      window.addEventListener('touchend', handleTouchEnd);

      return () => {
          window.removeEventListener('touchstart', handleTouchStart);
          window.removeEventListener('touchend', handleTouchEnd);
      };
  }, []);

  useEffect(() => {
    const onHashChange = () => {
        const newRoute = parseHash();
        const currentPath = newRoute.path;
        
        const lastPath = pathStack[pathStack.length - 1];
        const prevPath = pathStack[pathStack.length - 2];
        
        let newDirection: 'forward' | 'back' | 'none' = 'forward';

        if (currentPath === lastPath) {
            newDirection = 'none';
        } else if (currentPath === prevPath || isNavigatingBack) {
            newDirection = 'back';
            if (!isNavigatingBack) {
                pathStack.pop(); 
            }
        } else {
            newDirection = 'forward';
            pathStack.push(currentPath);
            if (pathStack.length > 20) pathStack.shift();
        }

        saveStack();
        isNavigatingBack = false;

        if (newDirection !== 'none') {
            setExitRoute(activeRoute);
            setDirection(newDirection);
            setIsTransitioning(true);
        } else {
            setExitRoute(null);
        }

        setActiveRoute(newRoute);
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [activeRoute]);

  const onAnimationEnd = () => {
      setExitRoute(null);
      setIsTransitioning(false);
  };

  if (isLoading) return <PageLoader />;

  const renderPage = (routeData: typeof activeRoute, isExit: boolean) => {
      let config = routes[routeData.path as keyof typeof routes];
      
      if (!config) config = routes['/'];

      const isPublic = (config as any).public;
      if (!isPublic && !user) {
          config = routes['/login'];
      }
      
      if (user && (routeData.path === '/login' || routeData.path === '/register')) {
          config = routes['/'];
      }

      const Component = config.component;
      const useLayout = config.useLayout;

      const pageContent = (
          <Suspense fallback={<PageLoader />}>
              <Component />
          </Suspense>
      );

      let animClass = '';
      if (isTransitioning) {
          if (direction === 'forward') {
              animClass = isExit ? 'page-forward-exit-active' : 'page-forward-enter-active';
          } else if (direction === 'back') {
              animClass = isExit ? 'page-back-exit-active' : 'page-back-enter-active';
          }
      }

      const style: React.CSSProperties = {
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          overflow: 'hidden',
          zIndex: isExit ? (direction === 'forward' ? 1 : 2) : (direction === 'forward' ? 2 : 1),
          backgroundColor: 'var(--bg-body)', 
      };

      const Inner = useLayout ? <MobileLayout>{pageContent}</MobileLayout> : pageContent;

      return (
          <div 
            key={routeData.fullPath} 
            className={animClass} 
            style={style}
            onAnimationEnd={isExit ? onAnimationEnd : undefined}
          >
              {Inner}
          </div>
      );
  };

  return (
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'black' }}>
          {exitRoute && renderPage(exitRoute, true)}
          {renderPage(activeRoute, false)}
      </div>
  );
};

export const navigate = (path: string, params?: Record<string, string>) => {
  const hash = params ? `${path}?${new URLSearchParams(params).toString()}` : path;
  window.location.hash = hash;
};

export const navigateBack = (fallbackPath: string = '/') => {
    isNavigatingBack = true;
    if (pathStack.length > 1) {
        pathStack.pop(); 
        saveStack();
        window.history.back();
        setTimeout(() => {
            if (isNavigatingBack) { 
                isNavigatingBack = false;
                navigate(fallbackPath);
            }
        }, 100);
    } else {
        isNavigatingBack = false;
        navigate(fallbackPath);
    }
};

export const useQueryParams = () => {
    const [params, setParams] = useState(new URLSearchParams(window.location.hash.split('?')[1]));
    useEffect(() => {
        const h = () => setParams(new URLSearchParams(window.location.hash.split('?')[1]));
        window.addEventListener('hashchange', h);
        return () => window.removeEventListener('hashchange', h);
    }, []);
    return params;
};
