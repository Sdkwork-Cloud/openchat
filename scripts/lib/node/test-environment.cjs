const {
  assertCommandSucceeded,
  checkPortAvailable,
  logInfo,
  logSuccess,
  logWarn,
  parsePort,
  resolveEnvironmentContext,
} = require('./shared.cjs');
const {
  formatDockerTransport,
  resolveDockerTransport,
  runCompose,
} = require('./docker-transport.cjs');

function runComposeChecked(projectRoot, dockerTransport, envFile, extraArgs, timeout = 30000) {
  const result = runCompose(projectRoot, dockerTransport, envFile, extraArgs, {
    timeout,
  });

  if (result.error && result.error.code === 'ETIMEDOUT') {
    throw new Error(
      `${formatDockerTransport(dockerTransport)} ${extraArgs.join(' ')} timed out after ${timeout}ms. Check whether Docker Desktop, WSL Docker, or the current Docker context can reach the daemon.`,
    );
  }

  return assertCommandSucceeded(result, formatDockerTransport(dockerTransport));
}

function parseTestEnvironmentConfig(values) {
  return {
    dbHost: values.DB_HOST || '127.0.0.1',
    dbPort: parsePort(values.DB_PORT, 55432),
    dbName: values.DB_NAME || 'openchat_test',
    redisHost: values.REDIS_HOST || '127.0.0.1',
    redisPort: parsePort(values.REDIS_PORT, 56379),
    redisDb: parsePort(values.REDIS_DB, 10),
  };
}

async function collectPortStatus(config) {
  const databasePortAvailable = await checkPortAvailable(config.dbHost, config.dbPort);
  const redisPortAvailable = await checkPortAvailable(config.redisHost, config.redisPort);

  return {
    databaseListening: !databasePortAvailable,
    redisListening: !redisPortAvailable,
  };
}

async function runTestEnvironment(projectRoot, options = {}) {
  const envContext = resolveEnvironmentContext(projectRoot, 'test', {
    envFile: options.envFile,
    fallbackEnvironment: 'test',
  });

  if (!envContext.envFile) {
    throw new Error('Missing test environment file. Create `.env.test` before running test environment commands.');
  }

  const requestedCommand = options.command || 'status';
  const dockerTransport = resolveDockerTransport(projectRoot, {
    requireCompose: true,
  });
  const config = parseTestEnvironmentConfig(envContext.values);

  logInfo(`Test environment file: ${envContext.envFile}`);
  logInfo(`PostgreSQL: ${config.dbHost}:${config.dbPort}/${config.dbName}`);
  logInfo(`Redis: ${config.redisHost}:${config.redisPort} (db ${config.redisDb})`);
  logInfo(`Docker transport: ${formatDockerTransport(dockerTransport)}`);

  if (requestedCommand === 'up') {
    const portStatus = await collectPortStatus(config);
    if (portStatus.databaseListening) {
      logWarn(
        `Port ${config.dbPort} already has a listener. If this is not the OpenChat test PostgreSQL instance, stop the conflicting service or change DB_PORT in .env.test before retrying.`,
      );
    }
    if (portStatus.redisListening) {
      logWarn(
        `Port ${config.redisPort} already has a listener. If this is not the OpenChat test Redis instance, stop the conflicting service or change REDIS_PORT in .env.test before retrying.`,
      );
    }

    runComposeChecked(
      projectRoot,
      dockerTransport,
      envContext.envFile,
      ['--profile', 'database', '--profile', 'cache', 'up', '-d', 'postgres', 'redis'],
      120000,
    );
    logSuccess('OpenChat test dependencies started');
    logInfo('Next step: npm run db:init:test -- --yes --seed');
    return 0;
  }

  if (requestedCommand === 'down') {
    runComposeChecked(
      projectRoot,
      dockerTransport,
      envContext.envFile,
      ['--profile', 'database', '--profile', 'cache', 'down', '--remove-orphans'],
      120000,
    );
    logSuccess('OpenChat test dependencies stopped');
    return 0;
  }

  if (requestedCommand === 'status') {
    const portStatus = await collectPortStatus(config);
    logInfo(`Database TCP listener: ${portStatus.databaseListening ? 'present' : 'absent'}`);
    logInfo(`Redis TCP listener: ${portStatus.redisListening ? 'present' : 'absent'}`);

    const result = runCompose(
      projectRoot,
      dockerTransport,
      envContext.envFile,
      ['ps', 'postgres', 'redis'],
      {
        timeout: 30000,
      },
    );

    if (result.error && result.error.code === 'ETIMEDOUT') {
      logWarn(
        `${formatDockerTransport(dockerTransport)} ps postgres redis timed out after 30000ms. Docker may be installed but not currently responsive.`,
      );
    } else if (result.status === 0 && result.stdout) {
      process.stdout.write(result.stdout);
    } else if (result.stderr) {
      logWarn(result.stderr.trim());
    }

    return 0;
  }

  throw new Error(`Unsupported test environment command: ${requestedCommand}`);
}

module.exports = {
  runTestEnvironment,
};
