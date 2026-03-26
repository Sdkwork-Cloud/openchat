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
  test('fresh db init backfills baseline patches so db patch skips them', async () => {
    const projectRoot = mkdtempSync(path.join(os.tmpdir(), 'openchat-db-cli-'));
    const databaseDir = path.join(projectRoot, 'database');
    const patchesDir = path.join(databaseDir, 'patches');
    const migrationsByFilename = new Map<string, MigrationRecord>();
    const migrationsByVersion = new Map<string, MigrationRecord>();
    const executedSqlFiles: string[] = [];

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
});
