import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function fail(message) {
  throw new Error(message);
}

function walkFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(target));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
      files.push(target);
    }
  }

  return files;
}

function main() {
  const infrastructureTarget = path.join(
    rootDir,
    'packages/opencat-admin-infrastructure/src/services/adminApi.ts',
  );
  const infrastructurePackageJson = JSON.parse(
    fs.readFileSync(
      path.join(rootDir, 'packages/opencat-admin-infrastructure/package.json'),
      'utf8',
    ),
  );
  const workspaceManifest = fs.readFileSync(path.join(rootDir, 'pnpm-workspace.yaml'), 'utf8');

  if (!fs.existsSync(infrastructureTarget)) {
    fail('Missing infrastructure admin API service');
  }

  const source = fs.readFileSync(infrastructureTarget, 'utf8');

  if (!source.includes('@openchat/sdkwork-im-admin-sdk')) {
    fail('Infrastructure admin API must depend on @openchat/sdkwork-im-admin-sdk');
  }

  if (infrastructurePackageJson.dependencies?.['@openchat/sdkwork-im-admin-sdk'] !== 'workspace:*') {
    fail('Infrastructure package must consume @openchat/sdkwork-im-admin-sdk through workspace linking');
  }

  if (source.includes('/admin/im/v3')) {
    fail('Infrastructure admin API must not hardcode /admin/im/v3 URLs');
  }

  if (/\bfetch\(/.test(source) || source.includes('axios.')) {
    fail('Infrastructure admin API must not use raw fetch or axios');
  }

  const coreIndex = fs.readFileSync(
    path.join(rootDir, 'packages/opencat-admin-core/src/index.ts'),
    'utf8',
  );
  if (!coreIndex.includes("@openchat/opencat-admin-infrastructure")) {
    fail('Core package must re-export the infrastructure boundary');
  }

  if (!workspaceManifest.includes('../../sdkwork-im-admin-sdk/sdkwork-im-admin-sdk-typescript/composed')) {
    fail('Workspace manifest must include the composed admin SDK package');
  }

  const packagesDir = path.join(rootDir, 'packages');
  const packageNames = fs.readdirSync(packagesDir).filter((name) => name.startsWith('opencat-admin-'));
  const adminSdkImports = [
    '@openchat/sdkwork-im-admin-sdk',
    '@sdkwork/im-admin-backend-sdk',
    '@sdkwork/im-backend-sdk',
  ];

  for (const packageName of packageNames) {
    const packageJsonPath = path.join(packagesDir, packageName, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = packageJson.dependencies || {};
    const sourceFiles = walkFiles(path.join(packagesDir, packageName, 'src'));

    for (const sdkImport of adminSdkImports) {
      if (packageName !== 'opencat-admin-infrastructure' && dependencies[sdkImport]) {
        fail(`${packageName} must not depend directly on ${sdkImport}`);
      }
    }

    for (const filePath of sourceFiles) {
      const implementation = fs.readFileSync(filePath, 'utf8');
      const relativeFilePath = path.relative(rootDir, filePath);

      for (const sdkImport of adminSdkImports) {
        if (packageName !== 'opencat-admin-infrastructure' && implementation.includes(sdkImport)) {
          fail(`${packageName} must not import ${sdkImport} directly: ${relativeFilePath}`);
        }
      }

      if (packageName !== 'opencat-admin-infrastructure' && implementation.includes('/admin/im/v3')) {
        fail(`${packageName} must not hardcode admin REST paths: ${relativeFilePath}`);
      }

      if (
        packageName !== 'opencat-admin-infrastructure'
        && (implementation.includes('Authorization') || implementation.includes('Access-Token') || implementation.includes('X-API-Key'))
      ) {
        fail(`${packageName} must not assemble admin auth headers manually: ${relativeFilePath}`);
      }
    }
  }
}

try {
  main();
  process.stdout.write('opencat-admin SDK boundary contract passed\n');
} catch (error) {
  process.stderr.write(`opencat-admin SDK boundary contract failed: ${error.message}\n`);
  process.exit(1);
}
