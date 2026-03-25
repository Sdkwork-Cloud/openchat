import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertFile(relativePath, label = relativePath) {
  const target = path.join(rootDir, relativePath);
  if (!fs.existsSync(target)) {
    fail(`Missing ${label}: ${relativePath}`);
  }
}

function assertPackage(relativeDir, expectedName) {
  const packageJsonPath = path.join(rootDir, relativeDir, 'package.json');
  assertFile(path.relative(rootDir, packageJsonPath), `${expectedName} package.json`);
  const packageJson = readJson(packageJsonPath);
  if (packageJson.name !== expectedName) {
    fail(`Expected ${relativeDir}/package.json name to be ${expectedName}, got ${packageJson.name}`);
  }
}

function main() {
  assertFile('pnpm-workspace.yaml', 'workspace manifest');
  assertFile('tsconfig.base.json', 'workspace tsconfig');
  const workspaceManifestSource = fs.readFileSync(
    path.join(rootDir, 'pnpm-workspace.yaml'),
    'utf8',
  );

  const rootPackageJson = readJson(path.join(rootDir, 'package.json'));
  const devScript = rootPackageJson.scripts?.dev || '';
  const buildScript = rootPackageJson.scripts?.build || '';
  const prepareSharedSdkScript = rootPackageJson.scripts?.['prepare:shared-sdk'] || '';
  const lintScript = rootPackageJson.scripts?.lint || '';
  const cleanScript = rootPackageJson.scripts?.clean || '';
  const parityScript = rootPackageJson.scripts?.['check:parity'] || '';

  if (!devScript.includes('pnpm --filter @openchat/opencat-admin-web dev')) {
    fail('Root dev script must target the opencat-admin web package through pnpm --filter');
  }

  if (!prepareSharedSdkScript.includes('../../sdkwork-im-admin-sdk/bin/materialize-typescript-workspace.mjs')) {
    fail('Root workspace must expose a prepare:shared-sdk script for admin SDK materialization');
  }

  if (!buildScript.includes('pnpm prepare:shared-sdk && pnpm --filter @openchat/opencat-admin-web build')) {
    fail('Root build script must materialize the shared admin SDK before building the web package');
  }

  if (!lintScript.includes('check:arch')) {
    fail('Root lint script must include architecture checks');
  }

  if (!cleanScript.includes('pnpm --filter @openchat/opencat-admin-web')) {
    fail('Root clean script must delegate to the opencat-admin web package');
  }

  if (!parityScript.includes('check:routes') || !parityScript.includes('check:sdk')) {
    fail('Root check:parity script must aggregate route and SDK parity checks');
  }

  const requiredWorkspacePackages = [
    "packages/opencat-admin-*",
    '../../sdkwork-im-admin-sdk/sdkwork-im-admin-sdk-typescript/composed',
    '../../sdkwork-im-admin-sdk/sdkwork-im-admin-sdk-typescript/generated/server-openapi',
    '../../sdkwork-im-sdk/sdkwork-im-sdk-typescript/generated/server-openapi',
  ];

  for (const workspacePackage of requiredWorkspacePackages) {
    if (!workspaceManifestSource.includes(workspacePackage)) {
      fail(`Workspace manifest must include ${workspacePackage}`);
    }
  }

  const requiredExternalPackageJsonFiles = [
    '../../sdkwork-im-admin-sdk/sdkwork-im-admin-sdk-typescript/composed/package.json',
    '../../sdkwork-im-admin-sdk/sdkwork-im-admin-sdk-typescript/generated/server-openapi/package.json',
    '../../sdkwork-im-sdk/sdkwork-im-sdk-typescript/generated/server-openapi/package.json',
  ];

  for (const relativePath of requiredExternalPackageJsonFiles) {
    assertFile(relativePath, `shared SDK package ${relativePath}`);
  }

  const requiredPackages = [
    ['packages/opencat-admin-web', '@openchat/opencat-admin-web'],
    ['packages/opencat-admin-shell', '@openchat/opencat-admin-shell'],
    ['packages/opencat-admin-commons', '@openchat/opencat-admin-commons'],
    ['packages/opencat-admin-core', '@openchat/opencat-admin-core'],
    ['packages/opencat-admin-types', '@openchat/opencat-admin-types'],
    ['packages/opencat-admin-infrastructure', '@openchat/opencat-admin-infrastructure'],
    ['packages/opencat-admin-ui', '@openchat/opencat-admin-ui'],
    ['packages/opencat-admin-i18n', '@openchat/opencat-admin-i18n'],
    ['packages/opencat-admin-auth', '@openchat/opencat-admin-auth'],
    ['packages/opencat-admin-dashboard', '@openchat/opencat-admin-dashboard'],
    ['packages/opencat-admin-users', '@openchat/opencat-admin-users'],
    ['packages/opencat-admin-groups', '@openchat/opencat-admin-groups'],
    ['packages/opencat-admin-friends', '@openchat/opencat-admin-friends'],
    ['packages/opencat-admin-messages', '@openchat/opencat-admin-messages'],
    ['packages/opencat-admin-iot', '@openchat/opencat-admin-iot'],
    ['packages/opencat-admin-rtc', '@openchat/opencat-admin-rtc'],
    ['packages/opencat-admin-im-server', '@openchat/opencat-admin-im-server'],
    ['packages/opencat-admin-system', '@openchat/opencat-admin-system'],
  ];

  for (const [relativeDir, expectedName] of requiredPackages) {
    assertPackage(relativeDir, expectedName);
  }

  const shellOwnedFiles = [
    'packages/opencat-admin-shell/src/application/app/AppRoot.tsx',
    'packages/opencat-admin-shell/src/application/providers/AppProviders.tsx',
    'packages/opencat-admin-shell/src/application/layouts/MainLayout.tsx',
    'packages/opencat-admin-shell/src/application/router/AppRoutes.tsx',
    'packages/opencat-admin-shell/src/application/router/routePrefetch.ts',
    'packages/opencat-admin-shell/src/components/Sidebar.tsx',
    'packages/opencat-admin-shell/src/styles/index.css',
  ];

  for (const relativePath of shellOwnedFiles) {
    assertFile(relativePath);
  }

  const foundationOwnedFiles = [
    'packages/opencat-admin-commons/src/index.ts',
    'packages/opencat-admin-commons/src/lib/utils.ts',
    'packages/opencat-admin-types/src/index.ts',
    'packages/opencat-admin-infrastructure/src/index.ts',
    'packages/opencat-admin-infrastructure/src/auth/session.ts',
    'packages/opencat-admin-infrastructure/src/services/adminApi.ts',
    'packages/opencat-admin-infrastructure/src/services/adminAuthService.ts',
  ];

  for (const relativePath of foundationOwnedFiles) {
    assertFile(relativePath);
  }

  const forbiddenLegacyPaths = [
    'src',
    'index.html',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.node.json',
    'package-lock.json',
    'postcss.config.js',
    'tailwind.config.js',
    'packages/opencat-admin-core/src/services/adminApi.ts',
    'packages/opencat-admin-core/src/services/adminAuthService.ts',
    'packages/opencat-admin-core/src/utils/auth.ts',
  ];

  for (const relativePath of forbiddenLegacyPaths) {
    const target = path.join(rootDir, relativePath);
    if (fs.existsSync(target)) {
      fail(`Legacy single-package artifact must be removed: ${relativePath}`);
    }
  }

  const webOwnedFiles = [
    'packages/opencat-admin-web/index.html',
    'packages/opencat-admin-web/vite.config.ts',
    'packages/opencat-admin-web/src/main.tsx',
    'packages/opencat-admin-web/src/App.tsx',
  ];

  for (const relativePath of webOwnedFiles) {
    assertFile(relativePath);
  }

  assertFile('packages/opencat-admin-auth/src/pages/AuthPage.tsx', 'auth page package');

  const coreIndexSource = fs.readFileSync(
    path.join(rootDir, 'packages/opencat-admin-core/src/index.ts'),
    'utf8',
  );
  if (!coreIndexSource.includes("@openchat/opencat-admin-types")) {
    fail('Core package must re-export the opencat-admin types package');
  }
  if (!coreIndexSource.includes("@openchat/opencat-admin-infrastructure")) {
    fail('Core package must re-export the opencat-admin infrastructure package');
  }

  const stylesSource = fs.readFileSync(
    path.join(rootDir, 'packages/opencat-admin-shell/src/styles/index.css'),
    'utf8',
  );
  if (!stylesSource.includes('@theme')) {
    fail('Shell styles must expose a Tailwind v4 @theme token block');
  }
  if (!stylesSource.includes('[data-theme="green-tech"]')) {
    fail('Shell styles must define the green-tech theme variant');
  }
}

try {
  main();
  process.stdout.write('opencat-admin structure contract passed\n');
} catch (error) {
  process.stderr.write(`opencat-admin structure contract failed: ${error.message}\n`);
  process.exit(1);
}
