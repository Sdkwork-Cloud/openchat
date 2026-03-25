#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const sharedScript = path.resolve(
  scriptDir,
  '..',
  '..',
  'sdkwork-im-sdk',
  'bin',
  'ensure-openapi-runtime.mjs',
);

const result = spawnSync(process.execPath, [sharedScript, ...process.argv.slice(2)], {
  stdio: ['inherit', 'pipe', 'pipe'],
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

process.exit(result.status ?? 1);
