const sidebarRoutePrefetchers = [
  ['/overview', () => import('@openchat/opencat-admin-dashboard')],
  ['/users', () => import('@openchat/opencat-admin-users')],
  ['/groups', () => import('@openchat/opencat-admin-groups')],
  ['/friends', () => import('@openchat/opencat-admin-friends')],
  ['/messages', () => import('@openchat/opencat-admin-messages')],
  ['/iot', () => import('@openchat/opencat-admin-iot')],
  ['/rtc', () => import('@openchat/opencat-admin-rtc')],
  ['/im-server', () => import('@openchat/opencat-admin-im-server')],
  ['/system', () => import('@openchat/opencat-admin-system')],
] as const;

const prefetchedSidebarRoutes = new Map<string, Promise<unknown>>();

function normalizeRoutePath(pathname: string) {
  return pathname.split(/[?#]/, 1)[0] || pathname;
}

export function resolveSidebarPrefetchTarget(pathname: string) {
  const normalizedPath = normalizeRoutePath(pathname);
  const match = sidebarRoutePrefetchers.find(([prefix]) => (
    normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  ));

  return match?.[0] || null;
}

export function prefetchSidebarRoute(pathname: string) {
  const routePrefix = resolveSidebarPrefetchTarget(pathname);
  if (!routePrefix) {
    return;
  }

  if (prefetchedSidebarRoutes.has(routePrefix)) {
    return;
  }

  const loadRoute = sidebarRoutePrefetchers.find(([prefix]) => prefix === routePrefix)?.[1];
  if (!loadRoute) {
    return;
  }

  const pending = loadRoute().catch((error) => {
    prefetchedSidebarRoutes.delete(routePrefix);
    throw error;
  });

  prefetchedSidebarRoutes.set(routePrefix, pending);
}
