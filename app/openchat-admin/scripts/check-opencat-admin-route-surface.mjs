import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function fail(message) {
  throw new Error(message);
}

function readFile(relativePath) {
  const target = path.join(rootDir, relativePath);
  if (!fs.existsSync(target)) {
    fail(`Missing file: ${relativePath}`);
  }

  return fs.readFileSync(target, 'utf8');
}

function main() {
  const routesSource = readFile('packages/opencat-admin-shell/src/application/router/AppRoutes.tsx');
  const routePathsSource = readFile('packages/opencat-admin-shell/src/application/router/routePaths.ts');
  const routePrefetchSource = readFile('packages/opencat-admin-shell/src/application/router/routePrefetch.ts');
  const sidebarSource = readFile('packages/opencat-admin-shell/src/components/Sidebar.tsx');
  const navigationSource = readFile('packages/opencat-admin-shell/src/application/router/navigation.ts');

  const requiredPaths = [
    '/overview',
    '/users',
    '/groups',
    '/friends',
    '/messages',
    '/iot',
    '/rtc',
    '/im-server',
    '/system',
    '/login',
  ];

  for (const routePath of requiredPaths) {
    if (!routesSource.includes(routePath) && !routePathsSource.includes(routePath)) {
      fail(`Shell route surface is missing ${routePath}`);
    }
  }

  const requiredLazyImports = [
    '@openchat/opencat-admin-auth',
    '@openchat/opencat-admin-dashboard',
    '@openchat/opencat-admin-users',
    '@openchat/opencat-admin-groups',
    '@openchat/opencat-admin-friends',
    '@openchat/opencat-admin-messages',
    '@openchat/opencat-admin-iot',
    '@openchat/opencat-admin-rtc',
    '@openchat/opencat-admin-im-server',
    '@openchat/opencat-admin-system',
  ];

  for (const packageName of requiredLazyImports) {
    if (!routesSource.includes(packageName)) {
      fail(`Shell router must lazy-load ${packageName}`);
    }
  }

  if (!routesSource.includes('AnimatePresence')) {
    fail('Shell router must use AnimatePresence for route transitions');
  }

  if (!sidebarSource.includes('prefetchSidebarRoute')) {
    fail('Sidebar must prefetch route modules before navigation');
  }

  if (!routePrefetchSource.includes('@openchat/opencat-admin-dashboard')) {
    fail('Shell route prefetch surface must include admin feature packages');
  }

  const requiredSidebarPaths = requiredPaths.filter((item) => item !== '/login');
  for (const routePath of requiredSidebarPaths) {
    if (
      !sidebarSource.includes(routePath) &&
      !navigationSource.includes(routePath) &&
      !routePathsSource.includes(routePath)
    ) {
      fail(`Sidebar navigation is missing ${routePath}`);
    }
  }
}

try {
  main();
  process.stdout.write('opencat-admin route surface contract passed\n');
} catch (error) {
  process.stderr.write(`opencat-admin route surface contract failed: ${error.message}\n`);
  process.exit(1);
}
