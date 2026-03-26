import * as path from 'node:path';

type DeployModule = {
  detectDatabaseAction: (
    projectRoot: string,
    options?: {
      environment?: string;
    },
  ) => string;
  renderSystemdUnit: (options: {
    environment: string;
    host: string;
    port: number;
    projectRoot: string;
    serviceGroup: string;
    serviceUser: string;
  }) => string;
};

const { parseCommand } = require('../../scripts/lib/node/cli.cjs') as {
  parseCommand: (argv: string[]) => Record<string, unknown>;
};

describe('openchat deploy cli', () => {
  test('parses deploy command with database action and service flags', () => {
    expect(
      parseCommand([
        'deploy',
        'prod',
        '--db-action',
        'patch',
        '--service',
        '--yes',
      ]),
    ).toMatchObject({
      kind: 'deploy',
      command: 'deploy',
      environment: 'production',
      dbAction: 'patch',
      service: true,
      yes: true,
    });
  });

  test('detects init action when the target database does not exist', () => {
    jest.resetModules();
    jest.doMock('../../scripts/lib/node/database.cjs', () => ({
      resolveDatabaseConfig: jest.fn(() => ({
        projectRoot: '/srv/openchat',
        environment: 'production',
        host: '127.0.0.1',
        port: '5432',
        user: 'openchat',
        password: 'secret',
        database: 'openchat',
      })),
    }));
    jest.doMock('../../scripts/lib/node/shared.cjs', () => {
      const actual = jest.requireActual('../../scripts/lib/node/shared.cjs');
      return {
        ...actual,
        commandExists: jest.fn(() => true),
        runCommand: jest.fn((command: string, args: string[]) => {
          expect(command).toBe('psql');
          const sql = args[args.indexOf('-c') + 1];
          if (sql.includes('SELECT 1 FROM pg_database')) {
            return { status: 0, stdout: '', stderr: '' };
          }
          return { status: 0, stdout: '', stderr: '' };
        }),
      };
    });

    let deployModule!: DeployModule;
    jest.isolateModules(() => {
      deployModule = require('../../scripts/lib/node/deploy.cjs') as DeployModule;
    });

    try {
      expect(
        deployModule.detectDatabaseAction('/srv/openchat', {
          environment: 'production',
        }),
      ).toBe('init');
    } finally {
      jest.dontMock('../../scripts/lib/node/database.cjs');
      jest.dontMock('../../scripts/lib/node/shared.cjs');
      jest.resetModules();
    }
  });

  test('detects patch action when application tables already exist', () => {
    jest.resetModules();
    jest.doMock('../../scripts/lib/node/database.cjs', () => ({
      resolveDatabaseConfig: jest.fn(() => ({
        projectRoot: '/srv/openchat',
        environment: 'production',
        host: '127.0.0.1',
        port: '5432',
        user: 'openchat',
        password: 'secret',
        database: 'openchat',
      })),
    }));
    jest.doMock('../../scripts/lib/node/shared.cjs', () => {
      const actual = jest.requireActual('../../scripts/lib/node/shared.cjs');
      return {
        ...actual,
        commandExists: jest.fn(() => true),
        runCommand: jest.fn((command: string, args: string[]) => {
          expect(command).toBe('psql');
          const sql = args[args.indexOf('-c') + 1];
          if (sql.includes('SELECT 1 FROM pg_database')) {
            return { status: 0, stdout: '1\n', stderr: '' };
          }
          if (sql.includes("SELECT to_regclass('public.chat_users')")) {
            return { status: 0, stdout: 'chat_users\n', stderr: '' };
          }
          return { status: 0, stdout: '', stderr: '' };
        }),
      };
    });

    let deployModule!: DeployModule;
    jest.isolateModules(() => {
      deployModule = require('../../scripts/lib/node/deploy.cjs') as DeployModule;
    });

    try {
      expect(
        deployModule.detectDatabaseAction('/srv/openchat', {
          environment: 'production',
        }),
      ).toBe('patch');
    } finally {
      jest.dontMock('../../scripts/lib/node/database.cjs');
      jest.dontMock('../../scripts/lib/node/shared.cjs');
      jest.resetModules();
    }
  });

  test('renders a systemd unit that matches the current project root and runtime wrapper', () => {
    const { renderSystemdUnit } = require('../../scripts/lib/node/deploy.cjs') as DeployModule;

    const projectRoot = path.join(path.sep, 'srv', 'openchat');
    const unit = renderSystemdUnit({
      environment: 'production',
      host: '127.0.0.1',
      port: 7200,
      projectRoot,
      serviceGroup: 'openchat',
      serviceUser: 'openchat',
    });

    expect(unit).toContain(`WorkingDirectory=${projectRoot}`);
    expect(unit).toContain(`EnvironmentFile=${projectRoot}/.env`);
    expect(unit).toContain(`PIDFile=${projectRoot}/var/run/openchat.pid`);
    expect(unit).toContain(`ExecStart=${projectRoot}/bin/openchat start --host 127.0.0.1 --port 7200 --environment production`);
    expect(unit).toContain(`ExecStop=${projectRoot}/bin/openchat stop`);
    expect(unit).toContain('Type=forking');
    expect(unit).toContain('User=openchat');
    expect(unit).toContain('Group=openchat');
  });
});
