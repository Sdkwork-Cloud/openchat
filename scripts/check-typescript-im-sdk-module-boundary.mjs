import { existsSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';

const workspaceRoot = process.cwd();
const typescriptSdkRoot = path.join(workspaceRoot, 'sdkwork-im-sdk', 'sdkwork-im-sdk-typescript');

const packages = [
  {
    label: '@openchat/sdkwork-im-sdk',
    dir: path.join(typescriptSdkRoot, 'composed'),
  },
  {
    label: '@openchat/sdkwork-im-wukongim-adapter',
    dir: path.join(typescriptSdkRoot, 'adapter-wukongim'),
  },
];

for (const pkg of packages) {
  const packageJsonPath = path.join(pkg.dir, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const distDir = path.join(pkg.dir, 'dist');
  const esmEntryPath = path.join(distDir, 'index.js');
  const cjsEntryPath = path.join(distDir, 'index.cjs');

  assert.equal(
    packageJson.type,
    'module',
    `${pkg.label} must publish as a module package so dist/index.js is treated as browser-safe ESM.`,
  );
  assert.equal(
    packageJson.main,
    './dist/index.cjs',
    `${pkg.label} main must point to the CommonJS entrypoint.`,
  );
  assert.equal(
    packageJson.module,
    './dist/index.js',
    `${pkg.label} module must point to the ESM entrypoint.`,
  );
  assert.equal(
    packageJson.types,
    './dist/index.d.ts',
    `${pkg.label} types must point to the generated declaration entrypoint.`,
  );
  assert.equal(
    packageJson.exports?.['.']?.import,
    './dist/index.js',
    `${pkg.label} exports.import must point to the ESM entrypoint.`,
  );
  assert.equal(
    packageJson.exports?.['.']?.require,
    './dist/index.cjs',
    `${pkg.label} exports.require must point to the CommonJS entrypoint.`,
  );

  assert.equal(existsSync(esmEntryPath), true, `${pkg.label} must emit dist/index.js.`);
  assert.equal(existsSync(cjsEntryPath), true, `${pkg.label} must emit dist/index.cjs.`);

  const esmEntry = readFileSync(esmEntryPath, 'utf8');
  const cjsEntry = readFileSync(cjsEntryPath, 'utf8');

  assert.match(
    esmEntry,
    /\bexport\b/,
    `${pkg.label} dist/index.js must contain native ESM exports for browser and Vite consumption.`,
  );
  assert.doesNotMatch(
    esmEntry,
    /Object\.defineProperty\(exports|module\.exports|exports\./,
    `${pkg.label} dist/index.js must not contain CommonJS export markers.`,
  );
  assert.match(
    cjsEntry,
    /Object\.defineProperty\(exports|module\.exports|exports\./,
    `${pkg.label} dist/index.cjs must contain CommonJS export markers.`,
  );
}

console.log('TypeScript IM SDK handwritten packages expose correct ESM/CJS boundaries.');
