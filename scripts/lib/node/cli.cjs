const path = require('node:path');
const {
  logInfo,
  normalizeEnvironmentName,
} = require('./shared.cjs');
const {
  cleanLogs,
  consoleRuntime,
  healthRuntime,
  restartRuntime,
  showLogs,
  startRuntime,
  statusRuntime,
  stopRuntime,
} = require('./runtime.cjs');
const { runDatabaseInit, runDatabasePatch } = require('./database.cjs');
const { runDeploy } = require('./deploy.cjs');
const { runEdge } = require('./edge.cjs');
const {
  getDefaultInstallMode,
  handleInstallManager,
  runInstall,
  runPrecheck,
} = require('./install.cjs');

const RUNTIME_COMMANDS = new Set([
  'start',
  'stop',
  'restart',
  'status',
  'console',
  'health',
  'logs',
  'clean',
]);

function parseFlags(argv) {
  const flags = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split('=');
    if (inlineValue !== undefined) {
      flags[rawKey] = inlineValue;
      continue;
    }

    const nextToken = argv[index + 1];
    if (nextToken && !nextToken.startsWith('--')) {
      flags[rawKey] = nextToken;
      index += 1;
    } else {
      flags[rawKey] = true;
    }
  }

  return { flags, positionals };
}

function readCommonOptions(flags) {
  return {
    dbAction: flags['db-action'] || flags.dbAction,
    envFile: flags['env-file'] || flags.envFile,
    forceStop: flags['force-stop'] === undefined
      ? undefined
      : flags['force-stop'] !== 'false',
    port: flags.port,
    host: flags.host,
    healthHost: flags['health-host'] || flags.healthHost,
    healthTimeoutMs: flags['health-timeout-ms'] || flags.healthTimeoutMs,
    environment: flags.environment || flags.env,
    yes: flags.yes === true,
    seed: flags.seed === true,
    service: flags.service === true,
    serviceGroup: flags['service-group'] || flags.serviceGroup,
    serviceUser: flags['service-user'] || flags.serviceUser,
    shutdownTimeoutMs: flags['shutdown-timeout-ms'] || flags.shutdownTimeoutMs,
    skipHealthCheck: flags['skip-health-check'] === undefined
      ? undefined
      : flags['skip-health-check'] !== 'false',
    start: flags.start === true,
    strictPort: flags['strict-port'] === undefined
      ? undefined
      : flags['strict-port'] !== 'false',
    initDb: flags['init-db'] === true,
    skipBuild: flags['skip-build'] === true,
    follow: flags.follow === undefined ? undefined : flags.follow !== 'false',
    domain: flags.domain,
    install: flags.install === true,
    openchatPort: flags['openchat-port'] || flags.openchatPort,
    publicIp: flags['public-ip'] || flags.publicIp,
    reload: flags.reload === true,
    restartOpenChat: flags['restart-openchat'] === undefined
      ? undefined
      : flags['restart-openchat'] === true,
    runtimeEnvironment: flags['runtime-environment'] || flags.runtimeEnvironment,
    serverIp: flags['server-ip'] || flags.serverIp,
    startWukongim: flags['start-wukongim'] === undefined
      ? undefined
      : flags['start-wukongim'] === true,
    publicTcpPort: flags['public-tcp-port'] || flags.publicTcpPort,
    wukongApiBindPort: flags['wukong-api-bind-port'] || flags.wukongApiBindPort,
    wukongTcpBindPort: flags['wukong-tcp-bind-port'] || flags.wukongTcpBindPort,
    wukongWsBindPort: flags['wukong-ws-bind-port'] || flags.wukongWsBindPort,
    wukongManagerBindPort: flags['wukong-manager-bind-port'] || flags.wukongManagerBindPort,
    wukongDemoBindPort: flags['wukong-demo-bind-port'] || flags.wukongDemoBindPort,
    wukongClusterBindPort: flags['wukong-cluster-bind-port'] || flags.wukongClusterBindPort,
  };
}

function parseCommand(argv) {
  const [firstToken = 'help', ...restTokens] = argv;
  const normalizedFirst = firstToken === '--help' || firstToken === '-h' ? 'help' : firstToken;

  if (RUNTIME_COMMANDS.has(normalizedFirst)) {
    const { flags } = parseFlags(restTokens);
    if (flags.help === true) {
      return {
        kind: 'help',
        command: 'help',
      };
    }
    return {
      kind: 'runtime',
      command: normalizedFirst,
      ...readCommonOptions(flags),
    };
  }

  if (normalizedFirst === 'db') {
    const [databaseCommand = 'help', environmentToken, ...rest] = restTokens;
    const { flags } = parseFlags(rest);
    if (databaseCommand === 'help' || flags.help === true) {
      return {
        kind: 'help',
        command: 'help',
      };
    }
    return {
      kind: 'database',
      command: databaseCommand,
      ...readCommonOptions(flags),
      environment: normalizeEnvironmentName(flags.environment || flags.env || environmentToken) || 'development',
    };
  }

  if (normalizedFirst === 'install-manager') {
    const [installManagerCommand = 'status'] = restTokens;
    if (installManagerCommand === 'help') {
      return {
        kind: 'help',
        command: 'help',
      };
    }
    return {
      kind: 'install-manager',
      command: installManagerCommand,
    };
  }

  if (normalizedFirst === 'precheck') {
    const { flags } = parseFlags(restTokens);
    if (flags.help === true) {
      return {
        kind: 'help',
        command: 'help',
      };
    }
    return {
      kind: 'install',
      command: 'precheck',
      ...readCommonOptions(flags),
      mode: flags.mode || getDefaultInstallMode(),
    };
  }

  if (normalizedFirst === 'quick-install') {
    const { flags } = parseFlags(restTokens);
    if (flags.help === true) {
      return {
        kind: 'help',
        command: 'help',
      };
    }
    return {
      kind: 'install',
      command: 'quick-install',
      ...readCommonOptions(flags),
      mode: 'docker',
    };
  }

  if (normalizedFirst === 'install') {
    const { flags, positionals } = parseFlags(restTokens);
    if (flags.help === true) {
      return {
        kind: 'help',
        command: 'help',
      };
    }
    return {
      kind: 'install',
      command: 'install',
      ...readCommonOptions(flags),
      mode: flags.mode || positionals[0] || getDefaultInstallMode(),
      environment: normalizeEnvironmentName(flags.environment || flags.env || positionals[1]) || 'development',
    };
  }

  if (normalizedFirst === 'deploy') {
    const { flags, positionals } = parseFlags(restTokens);
    if (flags.help === true) {
      return {
        kind: 'help',
        command: 'help',
      };
    }
    return {
      kind: 'deploy',
      command: 'deploy',
      ...readCommonOptions(flags),
      environment: normalizeEnvironmentName(flags.environment || flags.env || positionals[0]) || 'production',
      dbAction: flags['db-action'] || flags.dbAction || 'auto',
      start: flags.start === undefined ? true : flags.start === true,
      service: flags.service === true,
    };
  }

  if (normalizedFirst === 'edge') {
    const [edgeCommand = 'generate', environmentToken, ...rest] = restTokens;
    const { flags } = parseFlags(rest);
    if (edgeCommand === 'help' || flags.help === true) {
      return {
        kind: 'help',
        command: 'help',
      };
    }
    return {
      kind: 'edge',
      command: edgeCommand,
      ...readCommonOptions(flags),
      environment: normalizeEnvironmentName(flags.environment || flags.env || environmentToken) || 'development',
      install: flags.install === undefined ? edgeCommand === 'apply' : flags.install === true,
      reload: flags.reload === undefined ? edgeCommand === 'apply' : flags.reload === true,
      restartOpenChat: flags['restart-openchat'] === undefined
        ? edgeCommand === 'apply'
        : flags['restart-openchat'] === true,
      startWukongim: flags['start-wukongim'] === undefined
        ? edgeCommand === 'apply'
        : flags['start-wukongim'] === true,
    };
  }

  return {
    kind: 'help',
    command: 'help',
  };
}

function showHelp() {
  const lines = [
    'OpenChat Unified CLI',
    '',
    'Runtime commands:',
    '  start [--port <port>] [--host <host>] [--environment <env>] [--strict-port] [--health-timeout-ms <ms>]',
    '  stop [--environment <env>] [--shutdown-timeout-ms <ms>] [--force-stop]',
    '  restart [--port <port>] [--host <host>] [--environment <env>] [--strict-port]',
    '  status [--environment <env>]',
    '  console [--port <port>] [--host <host>] [--environment <env>]',
    '  health [--environment <env>]',
    '  logs [--environment <env>] [--follow false]',
    '  clean',
    '',
    'Deployment commands:',
    '  precheck [--mode standalone|docker]',
    '  install [standalone|docker] [development|test|production] [--init-db] [--start] [--yes]',
    '  deploy [development|test|production] [--db-action auto|init|patch|skip] [--service] [--start] [--yes] [--strict-port]',
    '  edge [generate|apply] [development|test|production] [--domain <domain>] [--public-ip <ip>] [--server-ip <ip>] [--install] [--reload]',
    '  quick-install',
    '  install-manager <status|resume|reset>',
    '  db init [development|test|production] [--yes] [--seed]',
    '  db patch [development|test|production]',
  ];

  process.stdout.write(`${lines.join('\n')}\n`);
}

async function dispatch(projectRoot, parsed) {
  switch (parsed.kind) {
    case 'runtime':
      switch (parsed.command) {
        case 'start':
          return startRuntime(projectRoot, parsed);
        case 'stop':
          return stopRuntime(projectRoot, parsed);
        case 'restart':
          return restartRuntime(projectRoot, parsed);
        case 'status':
          return statusRuntime(projectRoot, parsed);
        case 'console':
          return consoleRuntime(projectRoot, parsed);
        case 'health':
          return healthRuntime(projectRoot, parsed);
        case 'logs':
          return showLogs(projectRoot, parsed);
        case 'clean':
          return cleanLogs(projectRoot, parsed);
        default:
          showHelp();
          return 1;
      }
    case 'database':
      if (parsed.command === 'init') {
        return runDatabaseInit(projectRoot, parsed);
      }
      if (parsed.command === 'patch') {
        return runDatabasePatch(projectRoot, parsed);
      }
      showHelp();
      return 1;
    case 'install':
      if (parsed.command === 'precheck') {
        return runPrecheck(projectRoot, parsed);
      }
      return runInstall(projectRoot, parsed);
    case 'deploy':
      return runDeploy(projectRoot, parsed);
    case 'edge':
      return runEdge(projectRoot, parsed);
    case 'install-manager':
      return handleInstallManager(projectRoot, parsed);
    default:
      showHelp();
      return 0;
  }
}

async function main(argv, projectRoot = path.resolve(__dirname, '..', '..', '..')) {
  const parsed = parseCommand(argv);
  logInfo(`Using project root: ${projectRoot}`);
  const exitCode = await dispatch(projectRoot, parsed);
  if (typeof exitCode === 'number') {
    process.exitCode = exitCode;
  }
}

module.exports = {
  getDefaultInstallMode,
  main,
  parseCommand,
  showHelp,
};
