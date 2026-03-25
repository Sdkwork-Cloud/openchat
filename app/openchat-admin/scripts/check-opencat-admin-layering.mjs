import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function fail(message) {
  throw new Error(message);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
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

    if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(target);
    }
  }

  return files;
}

function main() {
  const corePackage = readJson('packages/opencat-admin-core/package.json');
  const coreDependencies = corePackage.dependencies || {};
  const uiPackage = readJson('packages/opencat-admin-ui/package.json');
  const uiDependencies = uiPackage.dependencies || {};

  if (!coreDependencies['@openchat/opencat-admin-types']) {
    fail('Core package must depend on @openchat/opencat-admin-types');
  }

  if (!coreDependencies['@openchat/opencat-admin-infrastructure']) {
    fail('Core package must depend on @openchat/opencat-admin-infrastructure');
  }

  if (!uiDependencies['@openchat/opencat-admin-commons']) {
    fail('UI package must depend on @openchat/opencat-admin-commons');
  }

  const packagesDir = path.join(rootDir, 'packages');
  const packageNames = fs.readdirSync(packagesDir).filter((name) => name.startsWith('opencat-admin-'));

  for (const packageName of packageNames) {
    if (packageName === 'opencat-admin-core' || packageName === 'opencat-admin-infrastructure' || packageName === 'opencat-admin-web') {
      continue;
    }

    const packageJsonPath = path.join(packagesDir, packageName, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = packageJson.dependencies || {};

    if (dependencies['@openchat/opencat-admin-infrastructure']) {
      fail(`${packageName} must not depend directly on @openchat/opencat-admin-infrastructure`);
    }

    const srcDir = path.join(packagesDir, packageName, 'src');
    if (!fs.existsSync(srcDir)) {
      continue;
    }

    for (const filePath of walkFiles(srcDir)) {
      const source = fs.readFileSync(filePath, 'utf8');
      if (source.includes('@openchat/opencat-admin-infrastructure')) {
        const relativeFilePath = path.relative(rootDir, filePath);
        fail(`${packageName} must not import @openchat/opencat-admin-infrastructure directly: ${relativeFilePath}`);
      }
    }
  }
}

try {
  main();
  process.stdout.write('opencat-admin layering contract passed\n');
} catch (error) {
  process.stderr.write(`opencat-admin layering contract failed: ${error.message}\n`);
  process.exit(1);
}
