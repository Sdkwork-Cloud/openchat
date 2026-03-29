const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  checkPortAvailable,
  commandExists,
  commandWorks,
  detectExternalIp,
  detectPlatformLabel,
  ensureDirectory,
  getCanonicalEnvironmentFileName,
  getDiskFreeGigabytes,
  logInfo,
  logSuccess,
  logWarn,
  normalizeEnvironmentName,
  readJsonFile,
  resolveEnvironmentContext,
  runCommand,
  writeJsonFile,
} = require('./shared.cjs');
const { runDatabaseInit } = require('./database.cjs');
const { startRuntime } = require('./runtime.cjs');

function getInstallStatePath(projectRoot) {
  return path.join(projectRoot, '.openchat-install-state');
}

function loadInstallState(projectRoot) {
  return readJsonFile(getInstallStatePath(projectRoot));
}

function saveInstallState(projectRoot, state) {
  writeJsonFile(getInstallStatePath(projectRoot), {
    ...state,
    updatedAt: new Date().toISOString(),
  });
}

function clearInstallState(projectRoot) {
  const statePath = getInstallStatePath(projectRoot);
  if (fs.existsSync(statePath)) {
    fs.rmSync(statePath, { force: true });
  }
}

function shouldReplaceEnvValue(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    'replace-with',
    'your-',
    'changeme',
    'example.com',
    'placeholder',
  ].some((token) => normalized.includes(token));
}

function updateEnvFile(filePath, updates, options = {}) {
  const original = fs.readFileSync(filePath, 'utf8').split(/\r?\n/u);
  const remaining = new Set(Object.keys(updates));
  const nextLines = original.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/u);
    if (!match) {
      return line;
    }

    const key = match[1];
    if (!remaining.has(key)) {
      return line;
    }

    const currentValue = line.slice(line.indexOf('=') + 1).trim();
    if (!options.overwrite && !shouldReplaceEnvValue(currentValue)) {
      remaining.delete(key);
      return line;
    }

    remaining.delete(key);
    return `${key}=${updates[key]}`;
  });

  for (const key of remaining) {
    nextLines.push(`${key}=${updates[key]}`);
  }

  fs.writeFileSync(filePath, `${nextLines.join('\n').replace(/\n+$/u, '')}\n`, 'utf8');
}

function ensureEnvFile(projectRoot, options = {}) {
  const environment = normalizeEnvironmentName(options.environment || 'development') || 'development';
  const envFile = path.join(projectRoot, getCanonicalEnvironmentFileName(environment));
  const legacyEnvFile = path.join(projectRoot, '.env');
  if (!fs.existsSync(envFile)) {
    const examplePath = path.join(projectRoot, '.env.example');
    if (fs.existsSync(legacyEnvFile)) {
      fs.copyFileSync(legacyEnvFile, envFile);
    } else if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envFile);
    } else {
      throw new Error(`Missing environment template: ${examplePath}`);
    }
  }

  const externalIp = detectExternalIp();
  updateEnvFile(envFile, {
    NODE_ENV: environment,
    EXTERNAL_IP: externalIp,
    USE_EXTERNAL_DB: options.mode === 'standalone' ? 'true' : 'false',
    USE_EXTERNAL_REDIS: options.mode === 'standalone' ? 'true' : 'false',
    DB_HOST: options.mode === 'standalone' ? 'localhost' : 'postgres',
    REDIS_HOST: options.mode === 'standalone' ? 'localhost' : 'redis',
    HOST: environment === 'production' ? '0.0.0.0' : '127.0.0.1',
    PORT: environment === 'test' ? '7201' : '7200',
  });

  return envFile;
}

async function runPrecheck(projectRoot, options = {}) {
  const mode = options.mode || 'standalone';
  const failures = [];
  const warnings = [];

  const platform = detectPlatformLabel();
  const architecture = os.arch();
  const memoryGb = Math.floor(os.totalmem() / (1024 ** 3));
  const diskGb = getDiskFreeGigabytes(projectRoot);

  logInfo(`Platform: ${platform}`);
  logInfo(`Architecture: ${architecture}`);
  logInfo(`Memory: ${memoryGb}GB`);
  if (diskGb !== null) {
    logInfo(`Free disk: ${diskGb}GB`);
  }

  if (!commandExists('node')) {
    failures.push('Node.js >= 20.19.0 is required');
  }
  if (!commandExists('npm')) {
    failures.push('npm is required');
  }

  if (mode === 'standalone') {
    if (!commandExists('psql')) {
      failures.push('psql is required for standalone deployment');
    }
    if (!commandExists('redis-cli')) {
      warnings.push('redis-cli was not found. Redis server access should still be verified manually.');
    }
  }

  if (mode === 'docker') {
    if (!commandExists('docker')) {
      failures.push('Docker is required for docker deployment');
    } else if (!commandWorks('docker', ['compose', 'version'])) {
      failures.push('docker compose is required for docker deployment');
    }
  }

  const trackedPorts = [3000, 5432, 6379, 5001, 5100, 5200, 5300];
  for (const port of trackedPorts) {
    // eslint-disable-next-line no-await-in-loop
    const available = await checkPortAvailable('0.0.0.0', port);
    if (!available) {
      warnings.push(`Port ${port} is already in use`);
    }
  }

  if (memoryGb < 4) {
    warnings.push('Less than 4GB of RAM detected');
  }
  if (diskGb !== null && diskGb < 20) {
    warnings.push('Less than 20GB of free disk space detected');
  }

  for (const warning of warnings) {
    logWarn(warning);
  }
  for (const failure of failures) {
    logWarn(failure);
  }

  if (failures.length > 0) {
    return 1;
  }

  logSuccess(`Precheck passed for ${mode} mode`);
  return 0;
}

function ensureProjectDirectories(projectRoot) {
  ensureDirectory(path.join(projectRoot, 'var', 'logs'));
  ensureDirectory(path.join(projectRoot, 'var', 'data'));
  ensureDirectory(path.join(projectRoot, 'var', 'run'));
  ensureDirectory(path.join(projectRoot, 'backups'));
}

function runLocalCommand(projectRoot, command, args) {
  const result = runCommand(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    if (result.error) {
      throw result.error;
    }
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
  }
}

async function runInstall(projectRoot, options = {}) {
  const mode = options.mode || 'standalone';
  const environment = normalizeEnvironmentName(options.environment || 'development') || 'development';
  const isDeployPhase = options.command === 'deploy';

  saveInstallState(projectRoot, {
    status: 'installing',
    command: options.command || 'install',
    mode,
    environment,
  });

  const precheckExitCode = await runPrecheck(projectRoot, { mode });
  if (precheckExitCode !== 0) {
    saveInstallState(projectRoot, {
      status: 'failed',
      command: options.command || 'install',
      mode,
      environment,
      reason: 'precheck-failed',
    });
    return precheckExitCode;
  }

  ensureProjectDirectories(projectRoot);
  const envFile = ensureEnvFile(projectRoot, { mode, environment });
  const envContext = resolveEnvironmentContext(projectRoot, environment, {
    envFile,
  });
  logSuccess(`Environment file ready: ${envFile}`);

  if (mode === 'docker') {
    const composeArgs =
      options.command === 'quick-install'
        ? ['compose', '--env-file', envFile, '-f', 'docker-compose.quick.yml', 'up', '-d']
        : ['compose', '--env-file', envFile, 'up', '-d'];
    runLocalCommand(projectRoot, 'docker', composeArgs);
    saveInstallState(projectRoot, {
      status: 'installed',
      command: options.command || 'install',
      mode,
      environment,
    });
    logSuccess('Docker deployment started');
    return 0;
  }

  const hasPackageLock = fs.existsSync(path.join(projectRoot, 'package-lock.json'));
  runLocalCommand(projectRoot, 'npm', hasPackageLock ? ['ci'] : ['install']);

  if (!options.skipBuild) {
    runLocalCommand(projectRoot, 'npm', ['run', 'build']);
  }

  if (options.initDb) {
    await runDatabaseInit(projectRoot, {
      environment,
      yes: options.yes,
      seed: options.seed,
    });
  }

  if (options.start) {
    await startRuntime(projectRoot, {
      environment,
      envFile,
      host: envContext.values.HOST,
      port: envContext.values.PORT,
      healthHost: envContext.values.APP_HOST,
      healthTimeoutMs: options.healthTimeoutMs,
      shutdownTimeoutMs: options.shutdownTimeoutMs,
      strictPort: options.strictPort,
      forceStop: options.forceStop,
      skipHealthCheck: options.skipHealthCheck,
    });
  }

  saveInstallState(projectRoot, {
    status: 'installed',
    command: options.command || 'install',
    mode,
    environment,
  });

  logSuccess('Standalone installation completed');
  if (!isDeployPhase) {
    logInfo('Next steps:');
    logInfo(`1. Review ${envFile}`);
    logInfo(`2. Run "node scripts/openchat-cli.cjs db init ${environment}" if the database is not initialized`);
    logInfo('3. Run "./bin/openchat start" after the build is ready');
  }
  return 0;
}

async function handleInstallManager(projectRoot, options = {}) {
  const command = options.command || 'status';

  if (command === 'status') {
    const state = loadInstallState(projectRoot);
    if (!state) {
      logInfo('No install state recorded');
      return 0;
    }
    process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
    return 0;
  }

  if (command === 'reset') {
    clearInstallState(projectRoot);
    logSuccess('Install state reset');
    return 0;
  }

  if (command === 'resume') {
    const state = loadInstallState(projectRoot);
    if (!state) {
      throw new Error('No install state found to resume');
    }
    return runInstall(projectRoot, {
      command: state.command || 'install',
      mode: state.mode || 'standalone',
      environment: state.environment || 'development',
    });
  }

  throw new Error(`Unsupported install-manager command: ${command}`);
}

module.exports = {
  clearInstallState,
  getInstallStatePath,
  getDefaultInstallMode: () => 'standalone',
  handleInstallManager,
  loadInstallState,
  runInstall,
  runPrecheck,
};
