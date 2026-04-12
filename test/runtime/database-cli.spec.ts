import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

type DatabaseModule = {
  runDatabaseInit: (
    projectRoot: string,
    options?: {
      environment?: string;
      yes?: boolean;
      seed?: boolean;
    },
  ) => Promise<number>;
  runDatabasePatch: (
    projectRoot: string,
    options?: {
      environment?: string;
    },
  ) => Promise<number>;
};

type MigrationRecord = {
  filename: string;
  version: string;
  checksum: string;
};

describe('openchat database cli', () => {
  test('existing non-production db init recreates the database and backfills baseline patches so db patch skips them', async () => {
    const projectRoot = mkdtempSync(path.join(os.tmpdir(), 'openchat-db-cli-'));
    const databaseDir = path.join(projectRoot, 'database');
    const patchesDir = path.join(databaseDir, 'patches');
    const migrationsByFilename = new Map<string, MigrationRecord>();
    const migrationsByVersion = new Map<string, MigrationRecord>();
    const executedSqlFiles: string[] = [];
    const adminSqlStatements: string[] = [];

    mkdirSync(patchesDir, { recursive: true });
    writeFileSync(
      path.join(projectRoot, '.env'),
      [
        'DB_HOST=127.0.0.1',
        'DB_PORT=5432',
        'DB_USERNAME=openchat',
        'DB_PASSWORD=secret',
        'DB_NAME=openchat',
      ].join('\n'),
      'utf8',
    );
    writeFileSync(path.join(databaseDir, 'schema.sql'), 'SELECT 1;\n', 'utf8');
    writeFileSync(path.join(databaseDir, 'seed.sql'), 'SELECT 2;\n', 'utf8');
    writeFileSync(path.join(databaseDir, 'indexes-optimization.sql'), 'SELECT 3;\n', 'utf8');
    writeFileSync(
      path.join(patchesDir, '20260305_add_chat_message_receipts.sql'),
      'SELECT 4;\n',
      'utf8',
    );
    writeFileSync(
      path.join(patchesDir, '20260306_add_chat_messages_im_indexes.sql'),
      'SELECT 5;\n',
      'utf8',
    );

    const runCommand = jest.fn((command: string, args: string[]) => {
      expect(command).toBe('psql');

      const sqlFileIndex = args.indexOf('-f');
      if (sqlFileIndex >= 0) {
        executedSqlFiles.push(path.basename(args[sqlFileIndex + 1]));
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      const sqlIndex = args.indexOf('-c');
      const sql = sqlIndex >= 0 ? args[sqlIndex + 1] : '';

      if (sql.trim() === 'SELECT 1') {
        return {
          status: 0,
          stdout: '1\n',
          stderr: '',
        };
      }

      if (sql.includes('SELECT 1 FROM pg_database')) {
        return {
          status: 0,
          stdout: '1\n',
          stderr: '',
        };
      }

      if (
        sql.includes('SELECT pg_terminate_backend')
        || sql.includes('DROP DATABASE "openchat"')
        || sql.includes('CREATE DATABASE "openchat"')
      ) {
        adminSqlStatements.push(sql);
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      if (sql.includes('CREATE TABLE IF NOT EXISTS chat_schema_migrations')) {
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      const selectByVersionMatch = sql.match(
        /SELECT filename, COALESCE\(checksum, ''\) FROM chat_schema_migrations WHERE version = '([0-9]{8})'/u,
      );
      if (selectByVersionMatch) {
        const record = migrationsByVersion.get(selectByVersionMatch[1]);
        return {
          status: 0,
          stdout: record ? `${record.filename}|${record.checksum}\n` : '',
          stderr: '',
        };
      }

      const selectByFilenameMatch = sql.match(
        /SELECT COALESCE\(version, ''\), COALESCE\(checksum, ''\) FROM chat_schema_migrations WHERE filename = '([^']+)'/u,
      );
      if (selectByFilenameMatch) {
        const record = migrationsByFilename.get(selectByFilenameMatch[1]);
        return {
          status: 0,
          stdout: record ? `${record.version}|${record.checksum}\n` : '',
          stderr: '',
        };
      }

      const insertMatch = sql.match(
        /INSERT INTO chat_schema_migrations \(filename, version, checksum\) VALUES \('([^']+)', '([0-9]{8})', '([a-f0-9]{64})'\)/u,
      );
      if (insertMatch) {
        const record = {
          filename: insertMatch[1],
          version: insertMatch[2],
          checksum: insertMatch[3],
        };
        migrationsByFilename.set(record.filename, record);
        migrationsByVersion.set(record.version, record);
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      const updateMatch = sql.match(
        /UPDATE chat_schema_migrations SET version = '([0-9]{8})', checksum = '([a-f0-9]{64})' WHERE filename = '([^']+)'/u,
      );
      if (updateMatch) {
        const record = {
          filename: updateMatch[3],
          version: updateMatch[1],
          checksum: updateMatch[2],
        };
        migrationsByFilename.set(record.filename, record);
        migrationsByVersion.set(record.version, record);
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      return {
        status: 0,
        stdout: '',
        stderr: '',
      };
    });

    jest.resetModules();
    jest.doMock('../../scripts/lib/node/shared.cjs', () => {
      const actual = jest.requireActual('../../scripts/lib/node/shared.cjs');
      return {
        ...actual,
        commandExists: jest.fn(() => true),
        logError: jest.fn(),
        logInfo: jest.fn(),
        logSuccess: jest.fn(),
        logWarn: jest.fn(),
        prompt: jest.fn(),
        runCommand,
      };
    });

    let databaseModule!: DatabaseModule;
    jest.isolateModules(() => {
      databaseModule = require('../../scripts/lib/node/database.cjs') as DatabaseModule;
    });

    try {
      await expect(
        databaseModule.runDatabaseInit(projectRoot, {
          environment: 'development',
          yes: true,
          seed: true,
        }),
      ).resolves.toBe(0);

      expect(executedSqlFiles).toEqual(['schema.sql', 'seed.sql', 'indexes-optimization.sql']);
      expect(adminSqlStatements).toHaveLength(3);
      expect(adminSqlStatements.some((sql) => sql.includes('SELECT pg_terminate_backend'))).toBe(true);
      expect(adminSqlStatements.some((sql) => sql.includes('DROP DATABASE "openchat"'))).toBe(true);
      expect(adminSqlStatements.some((sql) => sql.includes('CREATE DATABASE "openchat"'))).toBe(true);
      expect([...migrationsByFilename.keys()]).toEqual([
        '20260305_add_chat_message_receipts.sql',
        '20260306_add_chat_messages_im_indexes.sql',
      ]);

      await expect(
        databaseModule.runDatabasePatch(projectRoot, {
          environment: 'development',
        }),
      ).resolves.toBe(0);

      expect(executedSqlFiles).toEqual(['schema.sql', 'seed.sql', 'indexes-optimization.sql']);
    } finally {
      jest.dontMock('../../scripts/lib/node/shared.cjs');
      jest.resetModules();
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('falls back to docker exec psql when host psql is unavailable but test postgres container exists', async () => {
    const projectRoot = mkdtempSync(path.join(os.tmpdir(), 'openchat-db-cli-docker-'));
    const databaseDir = path.join(projectRoot, 'database');
    const patchesDir = path.join(databaseDir, 'patches');
    const migrationsByFilename = new Map<string, MigrationRecord>();
    const migrationsByVersion = new Map<string, MigrationRecord>();
    const commands: Array<{ command: string; args: string[] }> = [];
    const pipedSqlInputs: string[] = [];
    const adminSqlStatements: string[] = [];

    mkdirSync(patchesDir, { recursive: true });
    writeFileSync(
      path.join(projectRoot, '.env.test'),
      [
        'DB_HOST=127.0.0.1',
        'DB_PORT=55432',
        'DB_USERNAME=openchat',
        'DB_PASSWORD=openchat_password',
        'DB_NAME=openchat_test',
        'POSTGRES_CONTAINER_NAME=openchat-test-postgres',
      ].join('\n'),
      'utf8',
    );
    writeFileSync(path.join(databaseDir, 'schema.sql'), 'SELECT 1;\n', 'utf8');
    writeFileSync(
      path.join(patchesDir, '20260406_add_craw_agent_owner_email.sql'),
      'SELECT 2;\n',
      'utf8',
    );

    const runCommand = jest.fn((command: string, args: string[], options?: { input?: string }) => {
      commands.push({ command, args });

      expect(command).toBe('docker');

      if (args[0] === 'version') {
        return {
          status: 0,
          stdout: 'Server: Docker Desktop\n',
          stderr: '',
        };
      }

      expect(args[0]).toBe('exec');
      expect(args).toContain('-i');
      expect(args).toContain('openchat-test-postgres');
      expect(args).toContain('psql');

      const psqlArgs = args.slice(args.indexOf('psql') + 1);
      if (options?.input) {
        pipedSqlInputs.push(options.input);
        expect(psqlArgs).not.toContain('-f');
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      const sqlIndex = psqlArgs.indexOf('-c');
      const sql = sqlIndex >= 0 ? psqlArgs[sqlIndex + 1] : '';

      if (sql.trim() === 'SELECT 1') {
        return {
          status: 0,
          stdout: '1\n',
          stderr: '',
        };
      }

      if (sql.includes('SELECT 1 FROM pg_database')) {
        return {
          status: 0,
          stdout: '1\n',
          stderr: '',
        };
      }

      if (
        sql.includes('SELECT pg_terminate_backend')
        || sql.includes('DROP DATABASE "openchat_test"')
        || sql.includes('CREATE DATABASE "openchat_test"')
      ) {
        adminSqlStatements.push(sql);
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      if (sql.includes('CREATE TABLE IF NOT EXISTS chat_schema_migrations')) {
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      const selectByVersionMatch = sql.match(
        /SELECT filename, COALESCE\(checksum, ''\) FROM chat_schema_migrations WHERE version = '([0-9]{8})'/u,
      );
      if (selectByVersionMatch) {
        const record = migrationsByVersion.get(selectByVersionMatch[1]);
        return {
          status: 0,
          stdout: record ? `${record.filename}|${record.checksum}\n` : '',
          stderr: '',
        };
      }

      const selectByFilenameMatch = sql.match(
        /SELECT COALESCE\(version, ''\), COALESCE\(checksum, ''\) FROM chat_schema_migrations WHERE filename = '([^']+)'/u,
      );
      if (selectByFilenameMatch) {
        const record = migrationsByFilename.get(selectByFilenameMatch[1]);
        return {
          status: 0,
          stdout: record ? `${record.version}|${record.checksum}\n` : '',
          stderr: '',
        };
      }

      const insertMatch = sql.match(
        /INSERT INTO chat_schema_migrations \(filename, version, checksum\) VALUES \('([^']+)', '([0-9]{8})', '([a-f0-9]{64})'\)/u,
      );
      if (insertMatch) {
        const record = {
          filename: insertMatch[1],
          version: insertMatch[2],
          checksum: insertMatch[3],
        };
        migrationsByFilename.set(record.filename, record);
        migrationsByVersion.set(record.version, record);
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      return {
        status: 0,
        stdout: '',
        stderr: '',
      };
    });

    jest.resetModules();
    jest.doMock('../../scripts/lib/node/shared.cjs', () => {
      const actual = jest.requireActual('../../scripts/lib/node/shared.cjs');
      return {
        ...actual,
        commandExists: jest.fn((command: string) => command === 'docker'),
        logError: jest.fn(),
        logInfo: jest.fn(),
        logSuccess: jest.fn(),
        logWarn: jest.fn(),
        prompt: jest.fn(),
        runCommand,
      };
    });

    let databaseModule!: DatabaseModule;
    jest.isolateModules(() => {
      databaseModule = require('../../scripts/lib/node/database.cjs') as DatabaseModule;
    });

    try {
      await expect(
        databaseModule.runDatabaseInit(projectRoot, {
          environment: 'test',
          yes: true,
        }),
      ).resolves.toBe(0);

      expect(commands.length).toBeGreaterThan(0);
      expect(commands.every((entry) => entry.command === 'docker')).toBe(true);
      expect(pipedSqlInputs).toEqual(['SELECT 1;\n']);
      expect(adminSqlStatements).toHaveLength(3);
      expect(
        commands.some((entry) =>
          entry.args.includes('PGPASSWORD=openchat_password'),
        ),
      ).toBe(true);
    } finally {
      jest.dontMock('../../scripts/lib/node/shared.cjs');
      jest.resetModules();
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('falls back to wsl docker exec psql when host psql is unavailable and native docker engine is unresponsive on windows', async () => {
    const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
    const originalWslDistro = process.env.OPENCHAT_WSL_DOCKER_DISTRO;
    Object.defineProperty(process, 'platform', {
      value: 'win32',
    });
    process.env.OPENCHAT_WSL_DOCKER_DISTRO = 'Ubuntu-22.04';

    const projectRoot = mkdtempSync(path.join(os.tmpdir(), 'openchat-db-cli-wsl-'));
    const databaseDir = path.join(projectRoot, 'database');
    const patchesDir = path.join(databaseDir, 'patches');
    const migrationsByFilename = new Map<string, MigrationRecord>();
    const migrationsByVersion = new Map<string, MigrationRecord>();
    const commands: Array<{ command: string; args: string[] }> = [];
    const pipedSqlInputs: string[] = [];
    const adminSqlStatements: string[] = [];

    mkdirSync(patchesDir, { recursive: true });
    writeFileSync(
      path.join(projectRoot, '.env.test'),
      [
        'DB_HOST=127.0.0.1',
        'DB_PORT=55432',
        'DB_USERNAME=openchat',
        'DB_PASSWORD=openchat_password',
        'DB_NAME=openchat_test',
        'POSTGRES_CONTAINER_NAME=openchat-test-postgres',
      ].join('\n'),
      'utf8',
    );
    writeFileSync(path.join(databaseDir, 'schema.sql'), 'SELECT 1;\n', 'utf8');
    writeFileSync(
      path.join(patchesDir, '20260406_add_craw_agent_owner_email.sql'),
      'SELECT 2;\n',
      'utf8',
    );

    const runCommand = jest.fn((command: string, args: string[], options?: { input?: string; timeout?: number }) => {
      commands.push({ command, args });

      if (command === 'docker' && args.join(' ') === 'version') {
        return {
          status: null,
          stdout: '',
          stderr: '',
          error: {
            code: 'ETIMEDOUT',
            message: 'docker version timed out',
          },
        };
      }

      if (command === 'wsl' && args.join(' ') === '-l -q') {
        return {
          status: 0,
          stdout: 'docker-desktop\nUbuntu-22.04\n',
          stderr: '',
        };
      }

      const shellScript = String(args[args.length - 1] || '');
      if (
        command === 'wsl'
        && (
          shellScript.includes('docker version >/dev/null 2>&1')
          || shellScript.includes('docker compose version >/dev/null 2>&1')
        )
      ) {
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      if (
        command !== 'wsl'
        || !shellScript.includes('docker')
        || !shellScript.includes("'exec'")
      ) {
        return {
          status: 1,
          stdout: '',
          stderr: `unexpected command: ${command} ${args.join(' ')}`,
        };
      }

      expect(options?.timeout).toBeUndefined();
      expect(shellScript).toContain('openchat-test-postgres');
      expect(shellScript).toContain('psql');
      expect(shellScript).toContain('docker');

      if (shellScript.includes('SELECT 1 FROM pg_database')) {
        return {
          status: 0,
          stdout: '1\n',
          stderr: '',
        };
      }

      if (
        shellScript.includes('SELECT pg_terminate_backend')
        || shellScript.includes('DROP DATABASE "openchat_test"')
        || shellScript.includes('CREATE DATABASE "openchat_test"')
      ) {
        adminSqlStatements.push(shellScript);
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      if (options?.input) {
        pipedSqlInputs.push(options.input);
        expect(shellScript).not.toContain(" -f '");
        expect(shellScript).toContain('docker');
        expect(shellScript).toContain("'exec'");
        expect(shellScript).toContain("'-i'");
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      const sqlMatch = shellScript.match(/-c '([\s\S]+)'$/u);
      const sql = sqlMatch ? sqlMatch[1].replace(/''/gu, "'") : '';

      if (sql.trim() === 'SELECT 1') {
        return {
          status: 0,
          stdout: '1\n',
          stderr: '',
        };
      }

      if (sql.includes('SELECT 1 FROM pg_database')) {
        return {
          status: 0,
          stdout: '1\n',
          stderr: '',
        };
      }

      if (
        sql.includes('SELECT pg_terminate_backend')
        || sql.includes('DROP DATABASE "openchat_test"')
        || sql.includes('CREATE DATABASE "openchat_test"')
      ) {
        adminSqlStatements.push(sql);
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      if (sql.includes('CREATE TABLE IF NOT EXISTS chat_schema_migrations')) {
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      const selectByVersionMatch = sql.match(
        /SELECT filename, COALESCE\(checksum, ''\) FROM chat_schema_migrations WHERE version = '([0-9]{8})'/u,
      );
      if (selectByVersionMatch) {
        const record = migrationsByVersion.get(selectByVersionMatch[1]);
        return {
          status: 0,
          stdout: record ? `${record.filename}|${record.checksum}\n` : '',
          stderr: '',
        };
      }

      const selectByFilenameMatch = sql.match(
        /SELECT COALESCE\(version, ''\), COALESCE\(checksum, ''\) FROM chat_schema_migrations WHERE filename = '([^']+)'/u,
      );
      if (selectByFilenameMatch) {
        const record = migrationsByFilename.get(selectByFilenameMatch[1]);
        return {
          status: 0,
          stdout: record ? `${record.version}|${record.checksum}\n` : '',
          stderr: '',
        };
      }

      const insertMatch = sql.match(
        /INSERT INTO chat_schema_migrations \(filename, version, checksum\) VALUES \('([^']+)', '([0-9]{8})', '([a-f0-9]{64})'\)/u,
      );
      if (insertMatch) {
        const record = {
          filename: insertMatch[1],
          version: insertMatch[2],
          checksum: insertMatch[3],
        };
        migrationsByFilename.set(record.filename, record);
        migrationsByVersion.set(record.version, record);
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      return {
        status: 0,
        stdout: '',
        stderr: '',
      };
    });

    jest.resetModules();
    jest.doMock('../../scripts/lib/node/shared.cjs', () => {
      const actual = jest.requireActual('../../scripts/lib/node/shared.cjs');
      return {
        ...actual,
        commandExists: jest.fn(() => false),
        logError: jest.fn(),
        logInfo: jest.fn(),
        logSuccess: jest.fn(),
        logWarn: jest.fn(),
        prompt: jest.fn(),
        runCommand,
      };
    });

    let databaseModule!: DatabaseModule;
    jest.isolateModules(() => {
      databaseModule = require('../../scripts/lib/node/database.cjs') as DatabaseModule;
    });

    try {
      await expect(
        databaseModule.runDatabaseInit(projectRoot, {
          environment: 'test',
          yes: true,
        }),
      ).resolves.toBe(0);

      expect(commands.some((entry) => entry.command === 'wsl')).toBe(true);
      expect(pipedSqlInputs).toEqual(['SELECT 1;\n']);
      expect(adminSqlStatements).toHaveLength(3);
      expect(
        commands.some((entry) =>
          entry.command === 'wsl'
          && String(entry.args[entry.args.length - 1] || '').includes('docker')
          && String(entry.args[entry.args.length - 1] || '').includes("'exec'"),
        ),
      ).toBe(true);
    } finally {
      if (originalPlatformDescriptor) {
        Object.defineProperty(process, 'platform', originalPlatformDescriptor);
      }
      if (originalWslDistro === undefined) {
        delete process.env.OPENCHAT_WSL_DOCKER_DISTRO;
      } else {
        process.env.OPENCHAT_WSL_DOCKER_DISTRO = originalWslDistro;
      }
      jest.dontMock('../../scripts/lib/node/shared.cjs');
      jest.resetModules();
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
