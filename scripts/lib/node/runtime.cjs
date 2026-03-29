const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const {
  checkPortAvailable,
  ensureDirectory,
  findAvailablePort,
  followFile,
  forceKillProcess,
  isProcessRunning,
  logError,
  logInfo,
  logSuccess,
  logWarn,
  normalizeEnvironmentName,
  parseBoolean,
  parseInteger,
  parsePort,
  probeHttpStatus,
  readJsonFile,
  readProcessCommandLine,
  resolveEnvironmentContext,
  sendSignal,
  sleep,
  tailLines,
  waitForExit,
  waitForHttpHealthy,
  writeJsonFile,
} = require('./shared.cjs');

function getDefaultHost(environment) {
  return environment === 'production' ? '0.0.0.0' : '127.0.0.1';
}

function getDefaultPort(environment) {
  return environment === 'test' ? 7201 : 7200;
}

function getRuntimePaths(projectRoot, environment = 'production') {
  const normalizedEnvironment = normalizeEnvironmentName(environment) || 'production';
  const runtimePaths = {
    appHome: projectRoot,
    configFile: path.join(projectRoot, 'etc', 'config.json'),
    environment: normalizedEnvironment,
    mainJs: path.join(projectRoot, 'dist', 'main.js'),
    pidFile: path.join(projectRoot, 'var', 'run', `openchat.${normalizedEnvironment}.pid`),
    runtimeFile: path.join(
      projectRoot,
      'var',
      'run',
      `openchat.${normalizedEnvironment}.runtime.json`,
    ),
    logDir: path.join(projectRoot, 'var', 'logs'),
    dataDir: path.join(projectRoot, 'var', 'data'),
    stdoutLog: path.join(projectRoot, 'var', 'logs', `${normalizedEnvironment}.stdout.log`),
    errorLog: path.join(projectRoot, 'var', 'logs', `${normalizedEnvironment}.stderr.log`),
  };

  if (normalizedEnvironment === 'production') {
    runtimePaths.legacyPidFile = path.join(projectRoot, 'var', 'run', 'openchat.pid');
    runtimePaths.legacyRuntimeFile = path.join(
      projectRoot,
      'var',
      'run',
      'openchat.runtime.json',
    );
    runtimePaths.legacyStdoutLog = path.join(projectRoot, 'var', 'logs', 'stdout.log');
    runtimePaths.legacyErrorLog = path.join(projectRoot, 'var', 'logs', 'stderr.log');
  }

  return runtimePaths;
}

function resolveExistingPath(primaryPath, legacyPath) {
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }
  if (legacyPath && fs.existsSync(legacyPath)) {
    return legacyPath;
  }
  return primaryPath;
}

function validateRuntimeInstall(projectRoot, environment = 'production') {
  const runtimePaths = getRuntimePaths(projectRoot, environment);
  if (!fs.existsSync(runtimePaths.mainJs)) {
    throw new Error(
      `Missing built application entrypoint at ${runtimePaths.mainJs}. Run "npm run build" before using runtime commands.`,
    );
  }
  return runtimePaths;
}

function ensureRuntimeDirectories(runtimePaths) {
  ensureDirectory(runtimePaths.logDir);
  ensureDirectory(runtimePaths.dataDir);
  ensureDirectory(path.dirname(runtimePaths.pidFile));
}

function readPid(runtimePaths) {
  const pidFile = resolveExistingPath(runtimePaths.pidFile, runtimePaths.legacyPidFile);
  if (!fs.existsSync(pidFile)) {
    return null;
  }

  const value = Number.parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
  return Number.isInteger(value) ? value : null;
}

function readRuntimeState(projectRoot, environment = 'production') {
  const runtimePaths = getRuntimePaths(projectRoot, environment);
  const runtimeFile = resolveExistingPath(
    runtimePaths.runtimeFile,
    runtimePaths.legacyRuntimeFile,
  );
  return readJsonFile(runtimeFile);
}

function writeRuntimeState(runtimePaths, state) {
  fs.writeFileSync(runtimePaths.pidFile, `${state.pid}\n`, 'utf8');
  writeJsonFile(runtimePaths.runtimeFile, state);

  if (runtimePaths.legacyPidFile) {
    fs.writeFileSync(runtimePaths.legacyPidFile, `${state.pid}\n`, 'utf8');
  }
  if (runtimePaths.legacyRuntimeFile) {
    writeJsonFile(runtimePaths.legacyRuntimeFile, state);
  }
}

function clearRuntimeState(runtimePaths) {
  for (const filePath of [
    runtimePaths.pidFile,
    runtimePaths.runtimeFile,
    runtimePaths.legacyPidFile,
    runtimePaths.legacyRuntimeFile,
  ]) {
    if (filePath && fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

function buildHealthUrl(host, port) {
  return `http://${host}:${port}/health`;
}

function resolveRuntimeOptions(projectRoot, options = {}) {
  const envContext = resolveEnvironmentContext(projectRoot, options.environment, {
    baseEnv: process.env,
    envFile: options.envFile,
    fallbackEnvironment: 'production',
  });
  const environment = envContext.environment;
  const values = envContext.values;
  const host = options.host || values.HOST || getDefaultHost(environment);
  const healthHost = options.healthHost || values.APP_HOST || (host === '0.0.0.0' ? '127.0.0.1' : host);

  return {
    runtimePaths: getRuntimePaths(projectRoot, environment),
    envContext,
    envFile: envContext.envFile,
    environment,
    host,
    port: parsePort(options.port || values.PORT, getDefaultPort(environment)),
    healthHost,
    strictPort: parseBoolean(
      options.strictPort !== undefined ? options.strictPort : values.OPENCHAT_STRICT_PORT,
      environment !== 'development',
    ),
    skipHealthCheck: parseBoolean(
      options.skipHealthCheck !== undefined
        ? options.skipHealthCheck
        : values.OPENCHAT_SKIP_HEALTH_CHECK,
      false,
    ),
    healthTimeoutMs: parseInteger(
      options.healthTimeoutMs || values.OPENCHAT_HEALTH_TIMEOUT_MS,
      environment === 'production' ? 60000 : 30000,
    ),
    shutdownTimeoutMs: parseInteger(
      options.shutdownTimeoutMs || values.OPENCHAT_SHUTDOWN_TIMEOUT_MS,
      20000,
    ),
    forceStop: parseBoolean(
      options.forceStop !== undefined ? options.forceStop : values.OPENCHAT_FORCE_STOP_ON_TIMEOUT,
      true,
    ),
  };
}

function getLogTail(runtimePaths, lineCount = 20) {
  const errorLog = resolveExistingPath(runtimePaths.errorLog, runtimePaths.legacyErrorLog);
  const stdoutLog = resolveExistingPath(runtimePaths.stdoutLog, runtimePaths.legacyStdoutLog);
  const errorLines = tailLines(errorLog, lineCount);
  const stdoutLines = tailLines(stdoutLog, lineCount);

  const chunks = [];
  if (errorLines.length > 0) {
    chunks.push(`stderr:\n${errorLines.join('\n')}`);
  }
  if (stdoutLines.length > 0) {
    chunks.push(`stdout:\n${stdoutLines.join('\n')}`);
  }

  return chunks.join('\n\n');
}

function assertManagedRuntimeProcess(pid, runtimePaths, options = {}) {
  const commandLine = readProcessCommandLine(pid);
  if (!commandLine) {
    logWarn(`Unable to verify command line for PID ${pid}; proceeding with stop`);
    return;
  }

  const normalizedCommandLine = commandLine.toLowerCase();
  const expectedEntryPoint = runtimePaths.mainJs.toLowerCase();
  if (
    normalizedCommandLine.includes(expectedEntryPoint)
    || normalizedCommandLine.includes(path.basename(expectedEntryPoint))
  ) {
    return;
  }

  if (parseBoolean(options.forceStop, false)) {
    logWarn(
      `PID ${pid} does not look like OpenChat but force-stop is enabled. Command: ${commandLine}`,
    );
    return;
  }

  throw new Error(
    `Refusing to stop PID ${pid} because it does not look like OpenChat: ${commandLine}`,
  );
}

async function stopManagedProcess(pid, resolved, runtimePaths) {
  logInfo(`Sending SIGTERM to OpenChat (PID: ${pid})`);
  sendSignal(pid, 'SIGTERM');

  let exited = await waitForExit(pid, resolved.shutdownTimeoutMs);
  if (exited) {
    return;
  }

  if (!resolved.forceStop) {
    throw new Error(
      `OpenChat did not stop within ${resolved.shutdownTimeoutMs}ms and force stop is disabled.`,
    );
  }

  logWarn(
    `Graceful stop timed out after ${resolved.shutdownTimeoutMs}ms. Sending SIGKILL to PID ${pid}`,
  );
  forceKillProcess(pid);
  exited = await waitForExit(pid, 5000);

  if (!exited) {
    throw new Error(`Failed to stop OpenChat process ${pid}`);
  }
}

async function startRuntime(projectRoot, options = {}) {
  const resolved = resolveRuntimeOptions(projectRoot, options);
  const runtimePaths = validateRuntimeInstall(projectRoot, resolved.environment);
  ensureRuntimeDirectories(runtimePaths);

  const existingPid = readPid(runtimePaths);
  if (existingPid && isProcessRunning(existingPid)) {
    const state = readRuntimeState(projectRoot, resolved.environment);
    logWarn(`OpenChat is already running for ${resolved.environment} (PID: ${existingPid})`);
    if (state?.healthUrl) {
      logInfo(`Health URL: ${state.healthUrl}`);
    }
    return 1;
  }

  clearRuntimeState(runtimePaths);

  let runtimePort = resolved.port;
  if (resolved.strictPort) {
    const available = await checkPortAvailable(resolved.host, runtimePort);
    if (!available) {
      throw new Error(
        `Port ${runtimePort} is already in use and strict port mode is enabled for ${resolved.environment}.`,
      );
    }
  } else {
    runtimePort = await findAvailablePort(resolved.host, resolved.port);
    if (runtimePort !== resolved.port) {
      logWarn(`Port ${resolved.port} is in use, using port ${runtimePort} instead`);
    }
  }

  const healthUrl = buildHealthUrl(resolved.healthHost, runtimePort);
  const startedAt = new Date().toISOString();
  const stdoutFd = fs.openSync(runtimePaths.stdoutLog, 'a');
  const stderrFd = fs.openSync(runtimePaths.errorLog, 'a');
  const child = spawn(process.execPath, [runtimePaths.mainJs], {
    cwd: projectRoot,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', stdoutFd, stderrFd],
    env: {
      ...resolved.envContext.values,
      OPENCHAT_HOME: runtimePaths.appHome,
      OPENCHAT_CONFIG: runtimePaths.configFile,
      OPENCHAT_LOG_DIR: runtimePaths.logDir,
      OPENCHAT_DATA_DIR: runtimePaths.dataDir,
      NODE_ENV: resolved.environment,
      HOST: resolved.host,
      PORT: String(runtimePort),
      APP_HOST: resolved.healthHost,
      APP_PORT: String(runtimePort),
    },
  });

  fs.closeSync(stdoutFd);
  fs.closeSync(stderrFd);
  child.unref();

  await sleep(1000);

  if (!isProcessRunning(child.pid)) {
    clearRuntimeState(runtimePaths);
    const logTail = getLogTail(runtimePaths);
    throw new Error(
      `OpenChat failed to start. See ${runtimePaths.errorLog} or ${runtimePaths.stdoutLog}.${logTail ? `\n${logTail}` : ''}`,
    );
  }

  writeRuntimeState(runtimePaths, {
    pid: child.pid,
    host: resolved.host,
    healthHost: resolved.healthHost,
    port: runtimePort,
    requestedPort: resolved.port,
      environment: resolved.environment,
      envFile: resolved.envFile,
      healthUrl,
      startedAt,
      status: 'starting',
      strictPort: resolved.strictPort,
    });

  if (!resolved.skipHealthCheck) {
    const healthResult = await waitForHttpHealthy(healthUrl, {
      timeoutMs: resolved.healthTimeoutMs,
      intervalMs: 1000,
    });

    if (!healthResult.healthy) {
      if (isProcessRunning(child.pid)) {
        try {
          forceKillProcess(child.pid);
          await waitForExit(child.pid, 5000);
        } catch (_error) {
          // ignore cleanup failures here; the startup error below is the actionable signal
        }
      }

      clearRuntimeState(runtimePaths);
      const logTail = getLogTail(runtimePaths);
      throw new Error(
        `OpenChat failed health checks at ${healthUrl} within ${resolved.healthTimeoutMs}ms (last status: ${healthResult.lastStatus || 'unreachable'}).${logTail ? `\n${logTail}` : ''}`,
      );
    }

    writeRuntimeState(runtimePaths, {
      pid: child.pid,
      host: resolved.host,
      healthHost: resolved.healthHost,
      port: runtimePort,
      requestedPort: resolved.port,
      environment: resolved.environment,
      envFile: resolved.envFile,
      healthUrl,
      startedAt,
      healthyAt: new Date().toISOString(),
      status: 'running',
      strictPort: resolved.strictPort,
      lastHealthStatus: healthResult.lastStatus,
    });
  } else {
    writeRuntimeState(runtimePaths, {
      pid: child.pid,
      host: resolved.host,
      healthHost: resolved.healthHost,
      port: runtimePort,
      requestedPort: resolved.port,
      environment: resolved.environment,
      envFile: resolved.envFile,
      healthUrl,
      startedAt,
      status: 'running',
      strictPort: resolved.strictPort,
      healthCheckSkipped: true,
    });
  }

  logSuccess(`OpenChat started (PID: ${child.pid})`);
  logInfo(`Environment: ${resolved.environment}`);
  if (resolved.envFile) {
    logInfo(`Environment file: ${resolved.envFile}`);
  }
  logInfo(`Access URL: http://${resolved.healthHost}:${runtimePort}`);
  logInfo(`Health URL: ${healthUrl}`);
  logInfo(`Stdout log: ${runtimePaths.stdoutLog}`);
  logInfo(`Stderr log: ${runtimePaths.errorLog}`);
  return 0;
}

async function stopRuntime(projectRoot, options = {}) {
  const resolved = resolveRuntimeOptions(projectRoot, options);
  const runtimePaths = getRuntimePaths(projectRoot, resolved.environment);
  const state = readRuntimeState(projectRoot, resolved.environment);
  const pid = readPid(runtimePaths);

  if (!pid) {
    logWarn(`OpenChat is not running for ${resolved.environment}`);
    clearRuntimeState(runtimePaths);
    return 0;
  }

  if (!isProcessRunning(pid)) {
    logWarn(`Found stale PID file for PID ${pid}, cleaning up ${resolved.environment} runtime state`);
    clearRuntimeState(runtimePaths);
    return 0;
  }

  assertManagedRuntimeProcess(pid, runtimePaths, {
    forceStop: options.forceStop,
  });

  writeRuntimeState(runtimePaths, {
    ...(state || {}),
    pid,
    environment: resolved.environment,
    host: state?.host || resolved.host,
    healthHost: state?.healthHost || resolved.healthHost,
    port: state?.port || resolved.port,
    requestedPort: state?.requestedPort || resolved.port,
    envFile: state?.envFile || resolved.envFile,
    healthUrl: state?.healthUrl || buildHealthUrl(resolved.healthHost, state?.port || resolved.port),
    startedAt: state?.startedAt || new Date().toISOString(),
    status: 'stopping',
    stopRequestedAt: new Date().toISOString(),
  });

  await stopManagedProcess(pid, resolved, runtimePaths);
  clearRuntimeState(runtimePaths);
  logSuccess(`OpenChat stopped for ${resolved.environment}`);
  return 0;
}

async function restartRuntime(projectRoot, options = {}) {
  await stopRuntime(projectRoot, options);
  return startRuntime(projectRoot, options);
}

function statusRuntime(projectRoot, options = {}) {
  const resolved = resolveRuntimeOptions(projectRoot, options);
  const runtimePaths = getRuntimePaths(projectRoot, resolved.environment);
  const state = readRuntimeState(projectRoot, resolved.environment);
  const pid = readPid(runtimePaths);

  logInfo(`Installation directory: ${projectRoot}`);
  logInfo(`Environment: ${resolved.environment}`);
  if (!pid || !isProcessRunning(pid)) {
    clearRuntimeState(runtimePaths);
    logWarn('Service status: Not running');
    return 0;
  }

  logSuccess('Service status: Running');
  logInfo(`PID: ${pid}`);
  if (state) {
    logInfo(`Host: ${state.host}`);
    logInfo(`Port: ${state.port}`);
    logInfo(`Health host: ${state.healthHost}`);
    logInfo(`Health URL: ${state.healthUrl}`);
    logInfo(`Status: ${state.status}`);
    logInfo(`Started at: ${state.startedAt}`);
    if (state.envFile) {
      logInfo(`Environment file: ${state.envFile}`);
    }
  }
  logInfo(`Stdout log: ${runtimePaths.stdoutLog}`);
  logInfo(`Stderr log: ${runtimePaths.errorLog}`);
  return 0;
}

function consoleRuntime(projectRoot, options = {}) {
  const resolved = resolveRuntimeOptions(projectRoot, options);
  const runtimePaths = validateRuntimeInstall(projectRoot, resolved.environment);
  ensureRuntimeDirectories(runtimePaths);

  const existingPid = readPid(runtimePaths);
  if (existingPid && isProcessRunning(existingPid)) {
    logWarn(
      `OpenChat is already running for ${resolved.environment} (PID: ${existingPid}). Stop it before using console mode.`,
    );
    return Promise.resolve(1);
  }

  return new Promise(async (resolve, reject) => {
    try {
      let runtimePort = resolved.port;
      if (resolved.strictPort) {
        const available = await checkPortAvailable(resolved.host, runtimePort);
        if (!available) {
          throw new Error(
            `Port ${runtimePort} is already in use and strict port mode is enabled for ${resolved.environment}.`,
          );
        }
      } else {
        runtimePort = await findAvailablePort(resolved.host, resolved.port);
        if (runtimePort !== resolved.port) {
          logWarn(`Port ${resolved.port} is in use, using port ${runtimePort} instead`);
        }
      }

      logInfo('Running OpenChat in console mode. Press Ctrl+C to stop.');
      const child = spawn(process.execPath, [runtimePaths.mainJs], {
        cwd: projectRoot,
        stdio: 'inherit',
        env: {
          ...resolved.envContext.values,
          OPENCHAT_HOME: runtimePaths.appHome,
          OPENCHAT_CONFIG: runtimePaths.configFile,
          OPENCHAT_LOG_DIR: runtimePaths.logDir,
          OPENCHAT_DATA_DIR: runtimePaths.dataDir,
          NODE_ENV: resolved.environment,
          HOST: resolved.host,
          PORT: String(runtimePort),
          APP_HOST: resolved.healthHost,
          APP_PORT: String(runtimePort),
        },
      });

      child.on('exit', (code) => resolve(code || 0));
      child.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

async function healthRuntime(projectRoot, options = {}) {
  const resolved = resolveRuntimeOptions(projectRoot, options);
  const runtimePaths = getRuntimePaths(projectRoot, resolved.environment);
  const state = readRuntimeState(projectRoot, resolved.environment);
  const pid = readPid(runtimePaths);

  if (!pid || !isProcessRunning(pid)) {
    logError(`OpenChat is not running for ${resolved.environment}`);
    clearRuntimeState(runtimePaths);
    return 1;
  }

  const host = (state && state.healthHost) || resolved.healthHost;
  const port = (state && state.port) || resolved.port;
  const healthUrl = buildHealthUrl(host, port);
  const statusCode = await probeHttpStatus(healthUrl);

  if (statusCode === 200) {
    logSuccess(`Health check passed (HTTP ${statusCode})`);
    logInfo(`Health URL: ${healthUrl}`);
    return 0;
  }

  if (statusCode === 0) {
    logWarn(`Health check could not connect to ${healthUrl}`);
    return 1;
  }

  logWarn(`Health check returned HTTP ${statusCode} for ${healthUrl}`);
  return 1;
}

async function showLogs(projectRoot, options = {}) {
  const resolved = resolveRuntimeOptions(projectRoot, options);
  const runtimePaths = getRuntimePaths(projectRoot, resolved.environment);
  const stdoutLog = resolveExistingPath(runtimePaths.stdoutLog, runtimePaths.legacyStdoutLog);
  if (!fs.existsSync(stdoutLog)) {
    logWarn(`Log file not found: ${stdoutLog}`);
    return 0;
  }

  const lines = tailLines(stdoutLog, 50);
  if (lines.length > 0) {
    process.stdout.write(`${lines.join('\n')}\n`);
  }

  const follow = options.follow !== false && process.stdout.isTTY;
  if (!follow) {
    return 0;
  }

  logInfo('Following logs. Press Ctrl+C to stop.');
  await followFile(stdoutLog);
  return 0;
}

function cleanLogs(projectRoot) {
  const runtimePaths = getRuntimePaths(projectRoot, 'production');
  if (!fs.existsSync(runtimePaths.logDir)) {
    logInfo('No log directory to clean');
    return 0;
  }

  const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
  let removedCount = 0;
  for (const entry of fs.readdirSync(runtimePaths.logDir)) {
    const absolutePath = path.join(runtimePaths.logDir, entry);
    const stats = fs.statSync(absolutePath);
    if (stats.isFile() && entry.endsWith('.log') && stats.mtimeMs < cutoff) {
      fs.rmSync(absolutePath, { force: true });
      removedCount += 1;
    }
  }

  if (removedCount === 0) {
    logInfo('No old logs to clean');
  } else {
    logSuccess(`Removed ${removedCount} old log file(s)`);
  }
  return 0;
}

module.exports = {
  cleanLogs,
  consoleRuntime,
  getRuntimePaths,
  healthRuntime,
  readRuntimeState,
  resolveRuntimeOptions,
  restartRuntime,
  showLogs,
  startRuntime,
  statusRuntime,
  stopRuntime,
};
