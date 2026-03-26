const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const {
  ensureDirectory,
  findAvailablePort,
  followFile,
  isProcessRunning,
  killProcess,
  logError,
  logInfo,
  logSuccess,
  logWarn,
  parsePort,
  probeHttpStatus,
  readJsonFile,
  sleep,
  tailLines,
  waitForExit,
  writeJsonFile,
} = require('./shared.cjs');

function getRuntimePaths(projectRoot) {
  return {
    appHome: projectRoot,
    configFile: path.join(projectRoot, 'etc', 'config.json'),
    mainJs: path.join(projectRoot, 'dist', 'main.js'),
    pidFile: path.join(projectRoot, 'var', 'run', 'openchat.pid'),
    runtimeFile: path.join(projectRoot, 'var', 'run', 'openchat.runtime.json'),
    logDir: path.join(projectRoot, 'var', 'logs'),
    dataDir: path.join(projectRoot, 'var', 'data'),
    stdoutLog: path.join(projectRoot, 'var', 'logs', 'stdout.log'),
    errorLog: path.join(projectRoot, 'var', 'logs', 'stderr.log'),
  };
}

function validateRuntimeInstall(projectRoot) {
  const runtimePaths = getRuntimePaths(projectRoot);
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
  if (!fs.existsSync(runtimePaths.pidFile)) {
    return null;
  }

  const value = Number.parseInt(fs.readFileSync(runtimePaths.pidFile, 'utf8').trim(), 10);
  return Number.isInteger(value) ? value : null;
}

function readRuntimeState(projectRoot) {
  return readJsonFile(getRuntimePaths(projectRoot).runtimeFile);
}

function writeRuntimeState(runtimePaths, state) {
  fs.writeFileSync(runtimePaths.pidFile, `${state.pid}\n`, 'utf8');
  writeJsonFile(runtimePaths.runtimeFile, state);
}

function clearRuntimeState(runtimePaths) {
  if (fs.existsSync(runtimePaths.pidFile)) {
    fs.rmSync(runtimePaths.pidFile, { force: true });
  }
  if (fs.existsSync(runtimePaths.runtimeFile)) {
    fs.rmSync(runtimePaths.runtimeFile, { force: true });
  }
}

function resolveRuntimeOptions(projectRoot, options = {}) {
  const runtimePaths = getRuntimePaths(projectRoot);
  return {
    runtimePaths,
    environment: options.environment || process.env.NODE_ENV || 'production',
    host: options.host || process.env.HOST || '0.0.0.0',
    port: parsePort(options.port || process.env.PORT, 7200),
  };
}

async function startRuntime(projectRoot, options = {}) {
  const resolved = resolveRuntimeOptions(projectRoot, options);
  const runtimePaths = validateRuntimeInstall(projectRoot);
  ensureRuntimeDirectories(runtimePaths);

  const existingPid = readPid(runtimePaths);
  if (existingPid && isProcessRunning(existingPid)) {
    logWarn(`OpenChat is already running (PID: ${existingPid})`);
    return 1;
  }

  clearRuntimeState(runtimePaths);

  const availablePort = await findAvailablePort(resolved.host, resolved.port);
  if (availablePort !== resolved.port) {
    logWarn(`Port ${resolved.port} is in use, using port ${availablePort}`);
  }

  const stdoutFd = fs.openSync(runtimePaths.stdoutLog, 'a');
  const stderrFd = fs.openSync(runtimePaths.errorLog, 'a');
  const child = spawn(process.execPath, [runtimePaths.mainJs], {
    cwd: projectRoot,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', stdoutFd, stderrFd],
    env: {
      ...process.env,
      OPENCHAT_HOME: runtimePaths.appHome,
      OPENCHAT_CONFIG: runtimePaths.configFile,
      OPENCHAT_LOG_DIR: runtimePaths.logDir,
      OPENCHAT_DATA_DIR: runtimePaths.dataDir,
      NODE_ENV: resolved.environment,
      HOST: resolved.host,
      PORT: String(availablePort),
    },
  });

  fs.closeSync(stdoutFd);
  fs.closeSync(stderrFd);
  child.unref();

  await sleep(1500);

  if (!isProcessRunning(child.pid)) {
    clearRuntimeState(runtimePaths);
    throw new Error(`OpenChat failed to start. See ${runtimePaths.errorLog} or ${runtimePaths.stdoutLog}.`);
  }

  writeRuntimeState(runtimePaths, {
    pid: child.pid,
    host: resolved.host,
    port: availablePort,
    environment: resolved.environment,
    startedAt: new Date().toISOString(),
  });

  logSuccess(`OpenChat started (PID: ${child.pid})`);
  logInfo(`Environment: ${resolved.environment}`);
  logInfo(`Access URL: http://${resolved.host}:${availablePort}`);
  logInfo(`Logs: ${runtimePaths.stdoutLog}`);
  return 0;
}

async function stopRuntime(projectRoot) {
  const runtimePaths = getRuntimePaths(projectRoot);
  const pid = readPid(runtimePaths);

  if (!pid) {
    logWarn('OpenChat is not running');
    clearRuntimeState(runtimePaths);
    return 0;
  }

  if (!isProcessRunning(pid)) {
    logWarn(`Found stale PID file for PID ${pid}, cleaning up`);
    clearRuntimeState(runtimePaths);
    return 0;
  }

  logInfo(`Stopping OpenChat (PID: ${pid})`);
  killProcess(pid);
  const exited = await waitForExit(pid, 7000);
  if (!exited) {
    throw new Error(`Failed to stop OpenChat process ${pid}`);
  }

  clearRuntimeState(runtimePaths);
  logSuccess('OpenChat stopped');
  return 0;
}

async function restartRuntime(projectRoot, options = {}) {
  await stopRuntime(projectRoot);
  return startRuntime(projectRoot, options);
}

function statusRuntime(projectRoot) {
  const runtimePaths = getRuntimePaths(projectRoot);
  const state = readRuntimeState(projectRoot);
  const pid = readPid(runtimePaths);

  logInfo(`Installation directory: ${projectRoot}`);
  if (!pid || !isProcessRunning(pid)) {
    clearRuntimeState(runtimePaths);
    logWarn('Service status: Not running');
    return 0;
  }

  logSuccess('Service status: Running');
  logInfo(`PID: ${pid}`);
  if (state) {
    logInfo(`Environment: ${state.environment}`);
    logInfo(`Host: ${state.host}`);
    logInfo(`Port: ${state.port}`);
    logInfo(`Started at: ${state.startedAt}`);
  }
  logInfo(`Stdout log: ${runtimePaths.stdoutLog}`);
  logInfo(`Stderr log: ${runtimePaths.errorLog}`);
  return 0;
}

function consoleRuntime(projectRoot, options = {}) {
  const resolved = resolveRuntimeOptions(projectRoot, options);
  const runtimePaths = validateRuntimeInstall(projectRoot);
  ensureRuntimeDirectories(runtimePaths);

  const existingPid = readPid(runtimePaths);
  if (existingPid && isProcessRunning(existingPid)) {
    logWarn(`OpenChat is already running (PID: ${existingPid}). Stop it before using console mode.`);
    return Promise.resolve(1);
  }

  return new Promise(async (resolve, reject) => {
    try {
      const availablePort = await findAvailablePort(resolved.host, resolved.port);
      if (availablePort !== resolved.port) {
        logWarn(`Port ${resolved.port} is in use, using port ${availablePort}`);
      }

      logInfo('Running OpenChat in console mode. Press Ctrl+C to stop.');
      const child = spawn(process.execPath, [runtimePaths.mainJs], {
        cwd: projectRoot,
        stdio: 'inherit',
        env: {
          ...process.env,
          OPENCHAT_HOME: runtimePaths.appHome,
          OPENCHAT_CONFIG: runtimePaths.configFile,
          OPENCHAT_LOG_DIR: runtimePaths.logDir,
          OPENCHAT_DATA_DIR: runtimePaths.dataDir,
          NODE_ENV: resolved.environment || 'development',
          HOST: resolved.host,
          PORT: String(availablePort),
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
  const runtimePaths = getRuntimePaths(projectRoot);
  const state = readRuntimeState(projectRoot);
  const pid = readPid(runtimePaths);

  if (!pid || !isProcessRunning(pid)) {
    logError('OpenChat is not running');
    clearRuntimeState(runtimePaths);
    return 1;
  }

  const host = (state && state.host) || options.host || process.env.HOST || '127.0.0.1';
  const port = (state && state.port) || parsePort(options.port || process.env.PORT, 7200);
  const statusCode = await probeHttpStatus(`http://${host}:${port}/health`);

  if (statusCode === 200) {
    logSuccess(`Health check passed (HTTP ${statusCode})`);
    return 0;
  }

  if (statusCode === 0) {
    logWarn(`Health check could not connect to http://${host}:${port}/health`);
    return 1;
  }

  logWarn(`Health check returned HTTP ${statusCode}`);
  return 1;
}

async function showLogs(projectRoot, options = {}) {
  const runtimePaths = getRuntimePaths(projectRoot);
  if (!fs.existsSync(runtimePaths.stdoutLog)) {
    logWarn(`Log file not found: ${runtimePaths.stdoutLog}`);
    return 0;
  }

  const lines = tailLines(runtimePaths.stdoutLog, 50);
  if (lines.length > 0) {
    process.stdout.write(`${lines.join('\n')}\n`);
  }

  const follow = options.follow !== false && process.stdout.isTTY;
  if (!follow) {
    return 0;
  }

  logInfo('Following logs. Press Ctrl+C to stop.');
  await followFile(runtimePaths.stdoutLog);
  return 0;
}

function cleanLogs(projectRoot) {
  const runtimePaths = getRuntimePaths(projectRoot);
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
  restartRuntime,
  showLogs,
  startRuntime,
  statusRuntime,
  stopRuntime,
};
