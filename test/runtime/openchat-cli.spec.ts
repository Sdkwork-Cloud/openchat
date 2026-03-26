import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const {
  parseCommand,
  getDefaultInstallMode,
} = require('../../scripts/lib/node/cli.cjs') as {
  parseCommand: (argv: string[]) => Record<string, unknown>;
  getDefaultInstallMode: () => string;
};
const {
  normalizeEnvironmentName,
  resolveEnvironmentFile,
} = require('../../scripts/lib/node/shared.cjs') as {
  normalizeEnvironmentName: (value?: string) => string | null;
  resolveEnvironmentFile: (projectRoot: string, value?: string) => string | null;
};

describe('openchat shared cli', () => {
  test('normalizes database environment aliases', () => {
    expect(normalizeEnvironmentName('dev')).toBe('development');
    expect(normalizeEnvironmentName('development')).toBe('development');
    expect(normalizeEnvironmentName('test')).toBe('test');
    expect(normalizeEnvironmentName('prod')).toBe('production');
    expect(normalizeEnvironmentName('production')).toBe('production');
    expect(normalizeEnvironmentName('staging')).toBeNull();
  });

  test('resolves environment files with .env fallback', () => {
    const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'openchat-cli-env-'));

    try {
      writeFileSync(path.join(tempRoot, '.env'), 'NODE_ENV=development\n', 'utf8');
      writeFileSync(path.join(tempRoot, '.env.production'), 'NODE_ENV=production\n', 'utf8');

      expect(resolveEnvironmentFile(tempRoot, 'production')).toBe(
        path.join(tempRoot, '.env.production'),
      );
      expect(resolveEnvironmentFile(tempRoot, 'development')).toBe(path.join(tempRoot, '.env'));
      expect(resolveEnvironmentFile(tempRoot, undefined)).toBe(path.join(tempRoot, '.env'));
      expect(resolveEnvironmentFile(tempRoot, 'staging')).toBeNull();
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('parses legacy wrapper command shapes into shared commands', () => {
    expect(parseCommand(['start'])).toMatchObject({
      kind: 'runtime',
      command: 'start',
    });
    expect(parseCommand(['db', 'init', 'dev'])).toMatchObject({
      kind: 'database',
      command: 'init',
      environment: 'development',
    });
    expect(parseCommand(['db', 'patch', 'prod'])).toMatchObject({
      kind: 'database',
      command: 'patch',
      environment: 'production',
    });
    expect(parseCommand(['install-manager', 'status'])).toMatchObject({
      kind: 'install-manager',
      command: 'status',
    });
    expect(parseCommand(['quick-install'])).toMatchObject({
      kind: 'install',
      command: 'quick-install',
      mode: 'docker',
    });
  });

  test('defaults install mode to standalone to keep host deployment first class', () => {
    expect(getDefaultInstallMode()).toBe('standalone');
  });

  test('bin wrappers delegate to the shared cli implementation', () => {
    const bashWrapper = readFileSync(path.join(process.cwd(), 'bin', 'openchat'), 'utf8');
    const powerShellWrapper = readFileSync(path.join(process.cwd(), 'bin', 'openchat.ps1'), 'utf8');

    expect(bashWrapper).toContain('scripts/openchat-cli.cjs');
    expect(powerShellWrapper).toContain('scripts/openchat-cli.cjs');

    expect(bashWrapper).not.toContain('load_modules');
    expect(powerShellWrapper).not.toContain('function Start-OpenChatService');
  });

  test('deployment wrappers also delegate to the shared cli implementation', () => {
    for (const relativePath of [
      path.join('scripts', 'install.sh'),
      path.join('scripts', 'install.ps1'),
      path.join('scripts', 'deploy-server.sh'),
      path.join('scripts', 'deploy-server.ps1'),
      path.join('scripts', 'quick-install.sh'),
      path.join('scripts', 'quick-install.ps1'),
      path.join('scripts', 'precheck.sh'),
      path.join('scripts', 'precheck.ps1'),
      path.join('scripts', 'init-database.sh'),
      path.join('scripts', 'init-database.ps1'),
      path.join('scripts', 'apply-db-patches.sh'),
      path.join('scripts', 'apply-db-patches.ps1'),
      path.join('scripts', 'install-manager.sh'),
      path.join('scripts', 'install-manager.ps1'),
      path.join('scripts', 'setup-wizard.sh'),
      path.join('scripts', 'setup-wizard.ps1'),
    ]) {
      expect(existsSync(path.join(process.cwd(), relativePath))).toBe(true);
      const content = readFileSync(path.join(process.cwd(), relativePath), 'utf8');
      expect(content).toContain('openchat-cli.cjs');
      expect(content).not.toContain('鈺');
    }
  });

  test('windows support is PowerShell-only and does not ship batch wrappers', () => {
    for (const relativePath of [
      path.join('scripts', 'install.bat'),
      path.join('scripts', 'quick-install.bat'),
      path.join('scripts', 'precheck.bat'),
      path.join('scripts', 'install-manager.bat'),
      path.join('scripts', 'setup-wizard.bat'),
      path.join(
        'sdkwork-im-admin-sdk',
        'sdkwork-im-admin-sdk-typescript',
        'generated',
        'server-openapi',
        'bin',
        'sdk-gen.bat',
      ),
    ]) {
      expect(existsSync(path.join(process.cwd(), relativePath))).toBe(false);
    }
  });

  test('systemd unit reuses bin/openchat so service state matches wrapper commands', () => {
    const systemdUnit = readFileSync(
      path.join(process.cwd(), 'etc', 'openchat.service'),
      'utf8',
    );

    expect(systemdUnit).toContain('Type=forking');
    expect(systemdUnit).toContain('PIDFile=/opt/source/openchat/var/run/openchat.pid');
    expect(systemdUnit).toContain('/opt/source/openchat/bin/openchat start');
    expect(systemdUnit).toContain('/opt/source/openchat/bin/openchat stop');
  });
});
