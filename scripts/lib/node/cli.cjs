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
    port: flags.port,
    host: flags.host,
    environment: flags.environment || flags.env,
    yes: flags.yes === true,
    seed: flags.seed === true,
    service: flags.service === true,
    start: flags.start === true,
    initDb: flags['init-db'] === true,
    skipBuild: flags['skip-build'] === true,
    follow: flags.follow === undefined ? undefined : flags.follow !== 'false',
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
    '  start [--port <port>] [--host <host>] [--environment <env>]',
    '  stop',
    '  restart [--port <port>] [--host <host>] [--environment <env>]',
    '  status',
    '  console [--port <port>] [--host <host>] [--environment <env>]',
    '  health',
    '  logs [--follow false]',
    '  clean',
    '',
    'Deployment commands:',
    '  precheck [--mode standalone|docker]',
    '  install [standalone|docker] [development|test|production] [--init-db] [--start] [--yes]',
    '  deploy [development|test|production] [--db-action auto|init|patch|skip] [--service] [--start] [--yes]',
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
