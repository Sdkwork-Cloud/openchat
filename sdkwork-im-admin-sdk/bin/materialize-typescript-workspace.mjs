#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function fail(message) {
  console.error(`[sdkwork-im-admin-sdk] ${message}`);
  process.exit(1);
}

function run(command, args, cwd, label) {
  const result = spawnSync(command, args, {
    cwd,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    fail(`${label} failed in ${cwd} with exit code ${result.status ?? 1}`);
  }
}

function ensurePackageDir(dirPath, label) {
  if (!existsSync(path.join(dirPath, 'package.json'))) {
    fail(`Missing package.json for ${label}: ${dirPath}`);
  }
}

function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(workspaceRoot, '..');
  const npmCommand = 'npm';

  const packages = [
    {
      label: 'app generated TypeScript backend SDK',
      dir: path.join(
        repoRoot,
        'sdkwork-im-sdk',
        'sdkwork-im-sdk-typescript',
        'generated',
        'server-openapi',
      ),
    },
    {
      label: 'admin generated TypeScript backend SDK',
      dir: path.join(
        workspaceRoot,
        'sdkwork-im-admin-sdk-typescript',
        'generated',
        'server-openapi',
      ),
    },
    {
      label: 'admin composed TypeScript SDK',
      dir: path.join(
        workspaceRoot,
        'sdkwork-im-admin-sdk-typescript',
        'composed',
      ),
    },
  ];

  for (const sdkPackage of packages) {
    ensurePackageDir(sdkPackage.dir, sdkPackage.label);
    process.stdout.write(`[sdkwork-im-admin-sdk] materializing ${sdkPackage.label}\n`);
    run(
      npmCommand,
      ['install', '--no-fund', '--no-audit'],
      sdkPackage.dir,
      `${sdkPackage.label}:install`,
    );
    run(
      npmCommand,
      ['run', 'build'],
      sdkPackage.dir,
      `${sdkPackage.label}:build`,
    );
  }

  process.stdout.write('[sdkwork-im-admin-sdk] TypeScript workspace packages are ready for consumption\n');
}

main();
