const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const readline = require('node:readline');
const http = require('node:http');
const https = require('node:https');
const { spawnSync } = require('node:child_process');

function log(level, message, stream = process.stdout) {
  stream.write(`[${level}] ${message}\n`);
}

function logInfo(message) {
  log('INFO', message);
}

function logSuccess(message) {
  log('SUCCESS', message);
}

function logWarn(message) {
  log('WARN', message);
}

function logError(message) {
  log('ERROR', message, process.stderr);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEnvironmentName(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  switch (normalized) {
    case 'development':
    case 'dev':
      return 'development';
    case 'test':
      return 'test';
    case 'production':
    case 'prod':
      return 'production';
    default:
      return null;
  }
}

function resolveEnvironmentFile(projectRoot, value) {
  const normalized = value === undefined ? null : normalizeEnvironmentName(value);
  if (value !== undefined && !normalized) {
    return null;
  }

  const candidates = [];

  if (normalized === 'development') {
    candidates.push('.env.development', '.env.dev');
  }
  if (normalized === 'test') {
    candidates.push('.env.test');
  }
  if (normalized === 'production') {
    candidates.push('.env.production', '.env.prod');
  }

  candidates.push('.env');

  for (const candidate of candidates) {
    const absolutePath = path.join(projectRoot, candidate);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  return null;
}

function parseEnvFile(content) {
  const values = {};
  const lines = content.split(/\r?\n/u);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
    ) {
      rawValue = rawValue.slice(1, -1);
    }

    values[key] = rawValue;
  }

  return values;
}

function loadEnvFile(filePath) {
  return parseEnvFile(fs.readFileSync(filePath, 'utf8'));
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
  });

  return result;
}

function assertCommandSucceeded(result, label) {
  if (result.status !== 0) {
    if (result.error) {
      throw result.error;
    }
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    throw new Error(stderr || stdout || `${label} exited with status ${result.status}`);
  }

  return result;
}

function commandExists(command, args = ['--version']) {
  const result = runCommand(command, args);
  return result.status === 0;
}

function commandWorks(command, args) {
  const result = runCommand(command, args);
  return result.status === 0;
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function parsePort(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) {
    return parsed;
  }
  return fallback;
}

function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (_error) {
    return false;
  }
}

function killProcess(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
    return;
  } catch (_error) {
    if (process.platform === 'win32') {
      const taskKill = runCommand('taskkill', ['/PID', String(pid), '/T', '/F']);
      if (taskKill.error || taskKill.status !== 0) {
        throw taskKill.error || new Error(taskKill.stderr || 'taskkill failed');
      }
      return;
    }
  }

  process.kill(pid, 'SIGKILL');
}

async function waitForExit(pid, timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    if (!isProcessRunning(pid)) {
      return true;
    }
    await sleep(200);
  }
  return !isProcessRunning(pid);
}

function checkPortAvailable(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function findAvailablePort(host, startPort, maxAttempts = 100) {
  let currentPort = startPort;
  for (let index = 0; index < maxAttempts && currentPort <= 65535; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await checkPortAvailable(host, currentPort)) {
      return currentPort;
    }
    currentPort += 1;
  }

  throw new Error(`Could not find an available port starting at ${startPort}`);
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function detectPlatformLabel() {
  switch (process.platform) {
    case 'win32':
      return 'Windows';
    case 'darwin':
      return 'macOS';
    default:
      return 'Linux';
  }
}

function detectExternalIp() {
  const interfaces = os.networkInterfaces();
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses || []) {
      if (address && address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }

  return '127.0.0.1';
}

function getDiskFreeGigabytes(targetPath) {
  if (typeof fs.statfsSync !== 'function') {
    return null;
  }

  try {
    const stats = fs.statfsSync(targetPath);
    return Math.floor((stats.bavail * stats.bsize) / (1024 ** 3));
  } catch (_error) {
    return null;
  }
}

function tailLines(filePath, lineCount = 50) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return content.split(/\r?\n/u).filter(Boolean).slice(-lineCount);
}

async function followFile(filePath) {
  let position = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;

  await new Promise((resolve) => {
    const watcher = fs.watch(filePath, () => {
      if (!fs.existsSync(filePath)) {
        return;
      }

      const stats = fs.statSync(filePath);
      if (stats.size <= position) {
        return;
      }

      const handle = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(stats.size - position);
      fs.readSync(handle, buffer, 0, buffer.length, position);
      fs.closeSync(handle);
      position = stats.size;
      process.stdout.write(buffer.toString('utf8'));
    });

    process.once('SIGINT', () => {
      watcher.close();
      resolve();
    });
  });
}

function prompt(question) {
  if (!process.stdin.isTTY) {
    return Promise.resolve('');
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function quoteSqlLiteral(value) {
  return `'${String(value).replace(/'/gu, "''")}'`;
}

function quoteSqlIdentifier(value) {
  return `"${String(value).replace(/"/gu, '""')}"`;
}

function probeHttpStatus(url) {
  const client = url.startsWith('https://') ? https : http;

  return new Promise((resolve) => {
    const request = client.get(url, { timeout: 5000 }, (response) => {
      response.resume();
      resolve(response.statusCode || 0);
    });

    request.on('timeout', () => {
      request.destroy();
      resolve(0);
    });

    request.on('error', () => {
      resolve(0);
    });
  });
}

module.exports = {
  assertCommandSucceeded,
  checkPortAvailable,
  commandExists,
  commandWorks,
  detectExternalIp,
  detectPlatformLabel,
  ensureDirectory,
  findAvailablePort,
  followFile,
  getDiskFreeGigabytes,
  isProcessRunning,
  killProcess,
  loadEnvFile,
  logError,
  logInfo,
  logSuccess,
  logWarn,
  normalizeEnvironmentName,
  parseEnvFile,
  parsePort,
  probeHttpStatus,
  prompt,
  quoteSqlIdentifier,
  quoteSqlLiteral,
  readJsonFile,
  resolveEnvironmentFile,
  runCommand,
  sleep,
  tailLines,
  waitForExit,
  writeJsonFile,
};
