import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');
const extraArgs = process.argv.slice(2);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function runTsc(tsconfigPath) {
  const result = spawnSync(
    'pnpm',
    ['exec', 'tsc', '-p', tsconfigPath, ...extraArgs],
    {
      cwd: rootDir,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    },
  );

  if (result.status !== 0) {
    fail(`TypeScript check failed for ${tsconfigPath}`);
  }
}

if (!fs.existsSync(packagesDir)) {
  fail('Missing packages directory for workspace TypeScript checks');
}

const packageNames = fs.readdirSync(packagesDir).filter((entry) => (
  fs.statSync(path.join(packagesDir, entry)).isDirectory()
));

for (const packageName of packageNames) {
  const tsconfigPath = path.join('packages', packageName, 'tsconfig.json');
  if (fs.existsSync(path.join(rootDir, tsconfigPath))) {
    runTsc(tsconfigPath);
  }
}
