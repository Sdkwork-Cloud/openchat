#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

function hasModule(moduleName) {
  try {
    require.resolve(moduleName);
    return true;
  } catch {
    return false;
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

const hasTypeScriptEslint =
  hasModule('@typescript-eslint/parser') && hasModule('@typescript-eslint/eslint-plugin');

if (hasTypeScriptEslint) {
  process.exit(run('npm', ['run', 'lint:eslint']));
}

console.warn(
  '[lint] @typescript-eslint dependencies are not installed; falling back to `npm run lint:types`.',
);
process.exit(run('npm', ['run', 'lint:types']));
