import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const featurePackages = [
  'opencat-admin-auth',
  'opencat-admin-dashboard',
  'opencat-admin-users',
  'opencat-admin-groups',
  'opencat-admin-friends',
  'opencat-admin-messages',
  'opencat-admin-iot',
  'opencat-admin-rtc',
  'opencat-admin-im-server',
  'opencat-admin-shell',
  'opencat-admin-system',
];

const legacyPattern = /\b(?:slate-|bg-white|border-slate|text-sky|bg-sky|border-sky|rose-|amber-|emerald-)/;

function fail(message) {
  throw new Error(message);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(target, files);
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
      files.push(target);
    }
  }

  return files;
}

function main() {
  for (const packageName of featurePackages) {
    const srcDir = path.join(rootDir, 'packages', packageName, 'src');
    if (!fs.existsSync(srcDir)) {
      fail(`Missing feature source directory: packages/${packageName}/src`);
    }

    for (const filePath of walk(srcDir)) {
      const source = fs.readFileSync(filePath, 'utf8');
      const match = legacyPattern.exec(source);
      if (match) {
        const relativePath = path.relative(rootDir, filePath).replaceAll('\\', '/');
        fail(`Legacy theme utility "${match[0]}" remains in ${relativePath}`);
      }
    }
  }
}

try {
  main();
  process.stdout.write('opencat-admin semantic theme contract passed\n');
} catch (error) {
  process.stderr.write(`opencat-admin semantic theme contract failed: ${error.message}\n`);
  process.exit(1);
}
