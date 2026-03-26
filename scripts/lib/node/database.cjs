const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  assertCommandSucceeded,
  commandExists,
  loadEnvFile,
  logError,
  logInfo,
  logSuccess,
  logWarn,
  normalizeEnvironmentName,
  prompt,
  quoteSqlIdentifier,
  quoteSqlLiteral,
  resolveEnvironmentFile,
  runCommand,
} = require('./shared.cjs');

const MIGRATION_TABLE = 'chat_schema_migrations';

function resolveDatabaseConfig(projectRoot, environmentInput) {
  const canonicalEnvironment = normalizeEnvironmentName(
    environmentInput || process.env.NODE_ENV || 'development',
  );
  if (!canonicalEnvironment) {
    throw new Error(`Unsupported environment: ${environmentInput}`);
  }

  const envFile = resolveEnvironmentFile(projectRoot, canonicalEnvironment);
  if (!envFile) {
    throw new Error(
      `No environment file found for ${canonicalEnvironment}. Expected .env.${canonicalEnvironment} or .env.`,
    );
  }

  const values = loadEnvFile(envFile);
  const config = {
    projectRoot,
    environment: canonicalEnvironment,
    envFile,
    host: values.DB_HOST || 'localhost',
    port: values.DB_PORT || '5432',
    user: values.DB_USERNAME || 'openchat',
    password: values.DB_PASSWORD || '',
    database: values.DB_NAME || 'openchat',
  };

  return config;
}

function ensurePsqlAvailable() {
  if (!commandExists('psql')) {
    throw new Error('psql was not found in PATH. Install the PostgreSQL client before running database commands.');
  }
}

function runPsql(config, databaseName, args) {
  const result = runCommand(
    'psql',
    ['-h', config.host, '-p', String(config.port), '-U', config.user, '-d', databaseName, ...args],
    {
      cwd: config.projectRoot,
      env: {
        ...process.env,
        PGPASSWORD: config.password,
      },
    },
  );

  return assertCommandSucceeded(result, 'psql');
}

function runPsqlQuery(config, databaseName, sql) {
  const result = runPsql(config, databaseName, ['-v', 'ON_ERROR_STOP=1', '-tA', '-c', sql]);
  return (result.stdout || '').trim();
}

function listPatchEntries(patchDirectory) {
  if (!fs.existsSync(patchDirectory)) {
    return [];
  }

  const patchFiles = fs
    .readdirSync(patchDirectory)
    .filter((entry) => entry.endsWith('.sql'))
    .sort();

  let previousVersion = '';

  return patchFiles.map((patchName) => {
    if (!/^[0-9]{8}_.+\.sql$/u.test(patchName)) {
      throw new Error(`Patch file does not match YYYYMMDD_name.sql: ${patchName}`);
    }

    const version = patchName.slice(0, 8);
    if (previousVersion && version < previousVersion) {
      throw new Error(`Patch order is invalid: ${patchName} is earlier than ${previousVersion}`);
    }
    previousVersion = version;

    const patchPath = path.join(patchDirectory, patchName);

    return {
      checksum: sha256ForFile(patchPath),
      name: patchName,
      path: patchPath,
      version,
    };
  });
}

async function confirmAction(question, yes) {
  if (yes) {
    return true;
  }

  const answer = await prompt(`${question} `);
  return answer === 'yes';
}

async function runDatabaseInit(projectRoot, options = {}) {
  ensurePsqlAvailable();
  const config = resolveDatabaseConfig(projectRoot, options.environment);

  logInfo(`Environment: ${config.environment}`);
  logInfo(`Environment file: ${config.envFile}`);
  logInfo(`Database host: ${config.host}`);
  logInfo(`Database port: ${config.port}`);
  logInfo(`Database user: ${config.user}`);
  logInfo(`Database name: ${config.database}`);

  const confirmed = await confirmAction(
    'This will create or reinitialize schema objects. Type "yes" to continue:',
    options.yes,
  );
  if (!confirmed) {
    logWarn('Database initialization cancelled');
    return 1;
  }

  runPsql(config, 'postgres', ['-v', 'ON_ERROR_STOP=1', '-c', 'SELECT 1']);
  logSuccess('Database connection check passed');

  const databaseExists = runPsqlQuery(
    config,
    'postgres',
    `SELECT 1 FROM pg_database WHERE datname = ${quoteSqlLiteral(config.database)};`,
  );

  if (!databaseExists) {
    runPsql(
      config,
      'postgres',
      ['-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE ${quoteSqlIdentifier(config.database)};`],
    );
    logSuccess(`Database created: ${config.database}`);
  } else {
    logInfo(`Database already exists: ${config.database}`);
  }

  const schemaPath = path.join(projectRoot, 'database', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Missing schema file: ${schemaPath}`);
  }

  runPsql(config, config.database, ['-v', 'ON_ERROR_STOP=1', '-f', schemaPath]);
  logSuccess('Schema applied');

  const seedPath = path.join(projectRoot, 'database', 'seed.sql');
  if (config.environment !== 'production' && fs.existsSync(seedPath)) {
    const seedApproved = options.seed || (
      await confirmAction('Apply seed data as well? Type "yes" to continue:', false)
    );
    if (seedApproved) {
      runPsql(config, config.database, ['-v', 'ON_ERROR_STOP=1', '-f', seedPath]);
      logSuccess('Seed data applied');
    } else {
      logInfo('Seed data skipped');
    }
  }

  const indexesPath = path.join(projectRoot, 'database', 'indexes-optimization.sql');
  if (fs.existsSync(indexesPath)) {
    runPsql(config, config.database, ['-v', 'ON_ERROR_STOP=1', '-f', indexesPath]);
    logSuccess('Index optimization applied');
  }

  const patchDirectory = path.join(projectRoot, 'database', 'patches');
  const patchEntries = listPatchEntries(patchDirectory);
  if (patchEntries.length > 0) {
    ensureMigrationTable(config);

    let insertedCount = 0;
    let existingCount = 0;
    let backfilledCount = 0;

    for (const patch of patchEntries) {
      const migrationStatus = syncMigrationRecord(
        config,
        patch.name,
        patch.version,
        patch.checksum,
      );

      if (migrationStatus === 'missing') {
        insertMigrationRecord(config, patch.name, patch.version, patch.checksum);
        insertedCount += 1;
        continue;
      }

      if (migrationStatus === 'backfilled') {
        backfilledCount += 1;
        continue;
      }

      existingCount += 1;
    }

    logSuccess(
      `Patch baseline recorded. Inserted: ${insertedCount}, backfilled: ${backfilledCount}, existing: ${existingCount}`,
    );
  }

  logSuccess('Database initialization completed');
  return 0;
}

function sha256ForFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function ensureMigrationTable(config) {
  runPsql(
    config,
    config.database,
    [
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `
CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
  filename TEXT PRIMARY KEY,
  version TEXT,
  checksum TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ${MIGRATION_TABLE}
  ADD COLUMN IF NOT EXISTS version TEXT,
  ADD COLUMN IF NOT EXISTS checksum TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_schema_migrations_version_uniq
  ON ${MIGRATION_TABLE}(version)
  WHERE version IS NOT NULL;
      `,
    ],
  );
}

function normalizePsqlRow(row) {
  return row
    .split('|')
    .map((segment) => segment.trim())
    .filter((segment, index, values) => !(values.length === 1 && index === 0 && segment === ''));
}

function insertMigrationRecord(config, patchName, version, checksum) {
  runPsql(
    config,
    config.database,
    [
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `INSERT INTO ${MIGRATION_TABLE} (filename, version, checksum) VALUES (${quoteSqlLiteral(patchName)}, ${quoteSqlLiteral(version)}, ${quoteSqlLiteral(checksum)});`,
    ],
  );
}

function updateMigrationRecord(config, patchName, version, checksum) {
  runPsql(
    config,
    config.database,
    [
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `UPDATE ${MIGRATION_TABLE} SET version = ${quoteSqlLiteral(version)}, checksum = ${quoteSqlLiteral(checksum)} WHERE filename = ${quoteSqlLiteral(patchName)};`,
    ],
  );
}

function syncMigrationRecord(config, patchName, version, checksum) {
  const byVersion = runPsqlQuery(
    config,
    config.database,
    `SELECT filename, COALESCE(checksum, '') FROM ${MIGRATION_TABLE} WHERE version = ${quoteSqlLiteral(version)} LIMIT 1;`,
  );
  if (byVersion) {
    const [storedFilename, storedChecksum] = normalizePsqlRow(byVersion);
    if (storedFilename !== patchName) {
      throw new Error(`Patch version conflict for ${version}: stored ${storedFilename}, current ${patchName}`);
    }
    if (storedChecksum && storedChecksum !== checksum) {
      throw new Error(`Checksum mismatch for patch ${patchName}`);
    }
    if (!storedChecksum) {
      updateMigrationRecord(config, patchName, version, checksum);
      return 'backfilled';
    }
    return 'exists';
  }

  const byFilename = runPsqlQuery(
    config,
    config.database,
    `SELECT COALESCE(version, ''), COALESCE(checksum, '') FROM ${MIGRATION_TABLE} WHERE filename = ${quoteSqlLiteral(patchName)} LIMIT 1;`,
  );
  if (!byFilename) {
    return 'missing';
  }

  const [storedVersion, storedChecksum] = normalizePsqlRow(byFilename);
  if (storedVersion && storedVersion !== version) {
    throw new Error(`Patch filename conflict for ${patchName}: stored version ${storedVersion}`);
  }
  if (storedChecksum && storedChecksum !== checksum) {
    throw new Error(`Checksum mismatch for patch ${patchName}`);
  }
  if (storedVersion === version && storedChecksum === checksum) {
    return 'exists';
  }

  updateMigrationRecord(config, patchName, version, checksum);
  return 'backfilled';
}

async function runDatabasePatch(projectRoot, options = {}) {
  ensurePsqlAvailable();
  const config = resolveDatabaseConfig(projectRoot, options.environment);
  const patchDirectory = path.join(projectRoot, 'database', 'patches');

  if (!fs.existsSync(patchDirectory)) {
    logInfo(`Patch directory not found: ${patchDirectory}`);
    return 0;
  }

  const patchEntries = listPatchEntries(patchDirectory);
  if (patchEntries.length === 0) {
    logInfo('No patch files found');
    return 0;
  }

  runPsql(config, config.database, ['-v', 'ON_ERROR_STOP=1', '-c', 'SELECT 1']);
  ensureMigrationTable(config);

  let appliedCount = 0;
  let skippedCount = 0;

  for (const patch of patchEntries) {
    const migrationStatus = syncMigrationRecord(
      config,
      patch.name,
      patch.version,
      patch.checksum,
    );
    if (migrationStatus === 'exists') {
      logWarn(`Skipping already applied patch: ${patch.name}`);
      skippedCount += 1;
      continue;
    }
    if (migrationStatus === 'backfilled') {
      logWarn(`Backfilled version/checksum for historical patch record: ${patch.name}`);
      skippedCount += 1;
      continue;
    }

    logInfo(`Applying patch: ${patch.name}`);
    runPsql(config, config.database, ['-v', 'ON_ERROR_STOP=1', '-f', patch.path]);
    insertMigrationRecord(config, patch.name, patch.version, patch.checksum);
    appliedCount += 1;
    logSuccess(`Applied patch: ${patch.name}`);
  }

  logSuccess(`Patch run completed. Applied: ${appliedCount}, skipped: ${skippedCount}`);
  return 0;
}

module.exports = {
  resolveDatabaseConfig,
  runDatabaseInit,
  runDatabasePatch,
};
