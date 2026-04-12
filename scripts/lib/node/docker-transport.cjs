const path = require('node:path');
const { runCommand } = require('./shared.cjs');

const DEFAULT_PROBE_TIMEOUT_MS = 15000;
const WSL_DOCKER_USER = process.env.OPENCHAT_WSL_DOCKER_USER || 'root';

function shellQuote(value) {
  return `'${String(value).replace(/'/gu, `'\\''`)}'`;
}

function toWslPath(targetPath) {
  const normalized = path.resolve(targetPath).replace(/\\/gu, '/');
  const driveMatch = normalized.match(/^([A-Za-z]):(\/.*)?$/u);
  if (driveMatch) {
    return `/mnt/${driveMatch[1].toLowerCase()}${driveMatch[2] || ''}`;
  }
  return normalized;
}

function describeProbeFailure(label, result, timeoutMs) {
  if (result.error && result.error.code === 'ETIMEDOUT') {
    return `${label} timed out after ${timeoutMs}ms`;
  }
  if (result.error && result.error.code === 'ENOENT') {
    return `${label} is not installed`;
  }
  if (result.error) {
    return result.error.message || `${label} failed`;
  }
  const stderr = String(result.stderr || '').trim();
  const stdout = String(result.stdout || '').trim();
  if (stderr) {
    return stderr;
  }
  if (stdout) {
    return stdout;
  }
  if (typeof result.status === 'number') {
    return `${label} exited with status ${result.status}`;
  }
  return `${label} failed`;
}

function resolveNativeCompose(projectRoot, timeoutMs) {
  const plugin = runCommand('docker', ['compose', 'version'], {
    cwd: projectRoot,
    timeout: timeoutMs,
  });
  if (plugin.status === 0) {
    return {
      command: 'docker',
      label: 'docker compose',
      prefixArgs: ['compose'],
    };
  }

  const legacy = runCommand('docker-compose', ['--version'], {
    cwd: projectRoot,
    timeout: timeoutMs,
  });
  if (legacy.status === 0) {
    return {
      command: 'docker-compose',
      label: 'docker-compose',
      prefixArgs: [],
    };
  }

  return null;
}

function parseWslDistros(stdout) {
  return String(stdout || '')
    .split(/\r?\n/u)
    .map((line) => line.replace(/\u0000/gu, '').trim())
    .filter(Boolean);
}

function buildWslDistroCandidates(stdout) {
  const override = String(process.env.OPENCHAT_WSL_DOCKER_DISTRO || '').trim();
  const distros = parseWslDistros(stdout);
  const preferred = distros.filter((name) => !/^docker-desktop(?:-data)?$/iu.test(name));
  const fallback = distros.filter((name) => /^docker-desktop(?:-data)?$/iu.test(name));

  return [...new Set([override, ...preferred, ...fallback].filter(Boolean))];
}

function runWslShell(projectRoot, distro, user, script, options = {}) {
  return runCommand(
    'wsl',
    ['-d', distro, '-u', user, 'sh', '-lc', script],
    {
      cwd: projectRoot,
      env: options.env,
      input: options.input,
      timeout: options.timeout,
    },
  );
}

function resolveWslCompose(projectRoot, distro, user, timeoutMs) {
  const plugin = runWslShell(
    projectRoot,
    distro,
    user,
    'docker compose version >/dev/null 2>&1',
    { timeout: timeoutMs },
  );
  if (plugin.status === 0) {
    return {
      command: 'docker',
      label: 'docker compose',
      prefixArgs: ['compose'],
    };
  }

  const legacy = runWslShell(
    projectRoot,
    distro,
    user,
    'docker-compose --version >/dev/null 2>&1',
    { timeout: timeoutMs },
  );
  if (legacy.status === 0) {
    return {
      command: 'docker-compose',
      label: 'docker-compose',
      prefixArgs: [],
    };
  }

  return null;
}

function createNativeTransport(compose) {
  return {
    kind: 'native',
    composeCommand: compose ? compose.command : null,
    composeLabel: compose ? compose.label : null,
    composePrefixArgs: compose ? compose.prefixArgs : [],
    dockerCommand: 'docker',
  };
}

function createWslTransport(distro, user, compose) {
  return {
    kind: 'wsl',
    distro,
    user,
    composeCommand: compose ? compose.command : null,
    composeLabel: compose ? compose.label : null,
    composePrefixArgs: compose ? compose.prefixArgs : [],
    dockerCommand: 'docker',
  };
}

function resolveWslDockerTransport(projectRoot, options = {}) {
  const timeoutMs = Number.isInteger(options.timeoutMs)
    ? options.timeoutMs
    : DEFAULT_PROBE_TIMEOUT_MS;
  const requireCompose = options.requireCompose === true;

  const listResult = runCommand('wsl', ['-l', '-q'], {
    cwd: projectRoot,
    timeout: timeoutMs,
  });
  if (listResult.status !== 0) {
    return null;
  }

  const candidates = buildWslDistroCandidates(listResult.stdout);
  for (const distro of candidates) {
    const engineProbe = runWslShell(
      projectRoot,
      distro,
      WSL_DOCKER_USER,
      'docker version >/dev/null 2>&1',
      { timeout: timeoutMs },
    );
    if (engineProbe.status !== 0) {
      continue;
    }

    const compose = requireCompose
      ? resolveWslCompose(projectRoot, distro, WSL_DOCKER_USER, timeoutMs)
      : null;
    if (requireCompose && !compose) {
      continue;
    }

    return createWslTransport(distro, WSL_DOCKER_USER, compose);
  }

  return null;
}

function resolveDockerTransport(projectRoot, options = {}) {
  const timeoutMs = Number.isInteger(options.timeoutMs)
    ? options.timeoutMs
    : DEFAULT_PROBE_TIMEOUT_MS;
  const requireCompose = options.requireCompose === true;

  const nativeDockerProbe = runCommand('docker', ['version'], {
    cwd: projectRoot,
    timeout: timeoutMs,
  });

  if (nativeDockerProbe.status === 0) {
    const compose = requireCompose ? resolveNativeCompose(projectRoot, timeoutMs) : null;
    if (!requireCompose || compose) {
      return createNativeTransport(compose);
    }
  }

  if (process.platform === 'win32') {
    const wslTransport = resolveWslDockerTransport(projectRoot, {
      requireCompose,
      timeoutMs,
    });
    if (wslTransport) {
      return wslTransport;
    }
  }

  if (nativeDockerProbe.status === 0 && requireCompose) {
    throw new Error(
      'Docker engine is reachable but Docker Compose is unavailable. Install Docker Compose v2 (`docker compose`) or v1 (`docker-compose`).',
    );
  }

  const probeFailure = describeProbeFailure('docker version', nativeDockerProbe, timeoutMs);
  if (process.platform === 'win32') {
    throw new Error(
      `${probeFailure}. OpenChat also checked WSL distros for a working Docker CLI but did not find one. Start Docker Desktop, fix the current Docker context, or set OPENCHAT_WSL_DOCKER_DISTRO to a working WSL distro.`,
    );
  }

  throw new Error(`${probeFailure}. Install Docker and ensure the daemon is reachable before retrying.`);
}

function formatDockerTransport(transport) {
  if (transport.kind === 'wsl') {
    const scope = transport.composeLabel || 'docker';
    return `WSL ${scope} via ${transport.distro} (user ${transport.user})`;
  }

  return transport.composeLabel ? `native ${transport.composeLabel}` : 'native docker';
}

function runTransportCommand(projectRoot, transport, command, args, options = {}) {
  const cwd = options.cwd || projectRoot;
  if (transport.kind === 'native') {
    return runCommand(command, args, {
      cwd,
      env: options.env,
      input: options.input,
      timeout: options.timeout,
    });
  }

  const script = [
    `cd ${shellQuote(toWslPath(cwd))}`,
    [command, ...args.map((segment) => shellQuote(segment))].join(' '),
  ].join(' && ');

  return runWslShell(projectRoot, transport.distro, transport.user, script, {
    env: options.env,
    input: options.input,
    timeout: options.timeout,
  });
}

function runDocker(projectRoot, transport, args, options = {}) {
  return runTransportCommand(projectRoot, transport, transport.dockerCommand, args, options);
}

function resolveTransportPath(projectRoot, transport, targetPath) {
  if (transport.kind !== 'wsl') {
    return targetPath;
  }

  const absolutePath = path.isAbsolute(targetPath)
    ? targetPath
    : path.join(projectRoot, targetPath);
  return toWslPath(absolutePath);
}

function runCompose(projectRoot, transport, envFile, extraArgs, options = {}) {
  if (!transport.composeCommand) {
    throw new Error('Docker Compose is unavailable for the selected Docker transport.');
  }

  const resolvedEnvFile = resolveTransportPath(projectRoot, transport, envFile);
  return runTransportCommand(
    projectRoot,
    transport,
    transport.composeCommand,
    [...transport.composePrefixArgs, '--env-file', resolvedEnvFile, ...extraArgs],
    options,
  );
}

module.exports = {
  DEFAULT_PROBE_TIMEOUT_MS,
  formatDockerTransport,
  resolveDockerTransport,
  runCompose,
  runDocker,
};
