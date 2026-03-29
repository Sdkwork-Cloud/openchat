import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

type RuntimeModule = {
  getRuntimePaths: (projectRoot: string, environment?: string) => Record<string, string>;
  resolveRuntimeOptions: (
    projectRoot: string,
    options?: Record<string, unknown>,
  ) => Record<string, unknown>;
};

describe('openchat runtime cli', () => {
  test('stores runtime state and logs separately for each environment', () => {
    const { getRuntimePaths } = require('../../scripts/lib/node/runtime.cjs') as RuntimeModule;

    const projectRoot = path.join(path.sep, 'srv', 'openchat');
    const development = getRuntimePaths(projectRoot, 'development');
    const production = getRuntimePaths(projectRoot, 'production');

    expect(development.pidFile).toBe(path.join(projectRoot, 'var', 'run', 'openchat.development.pid'));
    expect(production.pidFile).toBe(path.join(projectRoot, 'var', 'run', 'openchat.production.pid'));
    expect(development.stdoutLog).toBe(path.join(projectRoot, 'var', 'logs', 'development.stdout.log'));
    expect(production.stdoutLog).toBe(path.join(projectRoot, 'var', 'logs', 'production.stdout.log'));
    expect(production.legacyPidFile).toBe(path.join(projectRoot, 'var', 'run', 'openchat.pid'));
  });

  test('resolves host, port and env file from the selected environment file', () => {
    const projectRoot = mkdtempSync(path.join(os.tmpdir(), 'openchat-runtime-cli-'));

    try {
      writeFileSync(
        path.join(projectRoot, '.env.production'),
        [
          'HOST=0.0.0.0',
          'PORT=7300',
          'APP_HOST=127.0.0.1',
          'OPENCHAT_HEALTH_TIMEOUT_MS=45000',
          'OPENCHAT_SHUTDOWN_TIMEOUT_MS=15000',
          'OPENCHAT_STRICT_PORT=true',
        ].join('\n'),
        'utf8',
      );

      const { resolveRuntimeOptions } = require('../../scripts/lib/node/runtime.cjs') as RuntimeModule;
      const resolved = resolveRuntimeOptions(projectRoot, {
        environment: 'production',
      });

      expect(resolved).toMatchObject({
        environment: 'production',
        envFile: path.join(projectRoot, '.env.production'),
        host: '0.0.0.0',
        healthHost: '127.0.0.1',
        port: 7300,
        healthTimeoutMs: 45000,
        shutdownTimeoutMs: 15000,
        strictPort: true,
      });
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('development runtime defaults to non-strict port handling for convenience', () => {
    const projectRoot = mkdtempSync(path.join(os.tmpdir(), 'openchat-runtime-cli-'));

    try {
      writeFileSync(
        path.join(projectRoot, '.env.development'),
        [
          'HOST=127.0.0.1',
          'PORT=7200',
        ].join('\n'),
        'utf8',
      );

      const { resolveRuntimeOptions } = require('../../scripts/lib/node/runtime.cjs') as RuntimeModule;
      const resolved = resolveRuntimeOptions(projectRoot, {
        environment: 'development',
      });

      expect(resolved).toMatchObject({
        environment: 'development',
        strictPort: false,
        host: '127.0.0.1',
        port: 7200,
      });
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
