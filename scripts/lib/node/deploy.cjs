const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  assertCommandSucceeded,
  commandExists,
  ensureDirectory,
  getCanonicalEnvironmentFileName,
  logInfo,
  logSuccess,
  logWarn,
  normalizeEnvironmentName,
  parseBoolean,
  parseInteger,
  quoteSqlLiteral,
  resolveEnvironmentContext,
  runCommand,
} = require("./shared.cjs");
const {
  resolveDatabaseConfig,
  runDatabaseInit,
  runDatabasePatch,
} = require("./database.cjs");
const { runInstall } = require("./install.cjs");
const { restartRuntime } = require("./runtime.cjs");

function runLocalCommand(command, args, options = {}) {
  const result = runCommand(command, args, {
    stdio: "inherit",
    ...options,
  });

  return assertCommandSucceeded(result, command);
}

function runPsqlQuery(config, databaseName, sql) {
  const result = runCommand(
    "psql",
    [
      "-h",
      config.host,
      "-p",
      String(config.port),
      "-U",
      config.user,
      "-d",
      databaseName,
      "-tA",
      "-c",
      sql,
    ],
    {
      cwd: config.projectRoot,
      env: {
        ...process.env,
        PGPASSWORD: config.password,
      },
    },
  );

  return (assertCommandSucceeded(result, "psql").stdout || "").trim();
}

function detectDatabaseAction(projectRoot, options = {}) {
  if (!commandExists("psql")) {
    throw new Error(
      "psql was not found in PATH. Install the PostgreSQL client before running deploy.",
    );
  }

  const environment =
    normalizeEnvironmentName(
      options.environment || process.env.NODE_ENV || "production",
    ) || "production";
  const config = resolveDatabaseConfig(projectRoot, environment);
  const databaseExists = runPsqlQuery(
    config,
    "postgres",
    `SELECT 1 FROM pg_database WHERE datname = ${quoteSqlLiteral(config.database)};`,
  );

  if (!databaseExists) {
    return "init";
  }

  const appTable = runPsqlQuery(
    config,
    config.database,
    "SELECT to_regclass('public.chat_users');",
  );

  if (!appTable) {
    return "init";
  }

  return "patch";
}

function resolveServiceIdentity() {
  const username =
    process.env.SUDO_USER ||
    process.env.USER ||
    process.env.USERNAME ||
    os.userInfo().username;

  return {
    group: username,
    user: username,
  };
}

function isPlaceholderValue(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    "replace-with",
    "your-",
    "changeme",
    "example.com",
    "placeholder",
  ].some((token) => normalized.includes(token));
}

function validateDeployEnvironment(projectRoot, options = {}) {
  const environment =
    normalizeEnvironmentName(
      options.environment || process.env.NODE_ENV || "production",
    ) || "production";
  const envContext = resolveEnvironmentContext(projectRoot, environment, {
    envFile: options.envFile,
    fallbackEnvironment: "production",
  });

  if (!envContext.envFile) {
    throw new Error(
      `No environment file found for ${environment}. Expected ${getCanonicalEnvironmentFileName(environment)} or .env.`,
    );
  }

  const requiredVars = [
    "DB_HOST",
    "DB_PORT",
    "DB_USERNAME",
    "DB_NAME",
    "REDIS_HOST",
    "REDIS_PORT",
    "JWT_SECRET",
  ];
  const missingVars = requiredVars.filter(
    (key) => !String(envContext.values[key] || "").trim(),
  );
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required deploy variables in ${envContext.envFile}: ${missingVars.join(", ")}`,
    );
  }

  if (environment === "production") {
    if (isPlaceholderValue(envContext.values.DB_PASSWORD)) {
      throw new Error(
        `DB_PASSWORD must be replaced with a real production value in ${envContext.envFile}`,
      );
    }
    if (
      isPlaceholderValue(envContext.values.JWT_SECRET) ||
      String(envContext.values.JWT_SECRET).trim().length < 32
    ) {
      throw new Error(
        `JWT_SECRET in ${envContext.envFile} must be a non-placeholder value with at least 32 characters`,
      );
    }
    if (
      envContext.values.CORS_ORIGINS &&
      ["*", "http://localhost:3000,http://localhost:5173"].includes(
        String(envContext.values.CORS_ORIGINS).trim(),
      )
    ) {
      logWarn(
        `CORS_ORIGINS in ${envContext.envFile} is too permissive for production`,
      );
    }
    if (!String(envContext.values.EXTERNAL_IP || "").trim()) {
      logWarn(
        `EXTERNAL_IP is not set in ${envContext.envFile}; RTC and external IM access may fail`,
      );
    }
  }

  return envContext;
}

function renderSystemdUnit(options) {
  const strictPortFlag =
    options.strictPort === false ? "--strict-port false" : "--strict-port";
  const forceStopFlag =
    options.forceStop === false ? "--force-stop false" : "--force-stop";

  return [
    "[Unit]",
    "Description=OpenChat Server",
    "After=network-online.target postgresql.service redis-server.service",
    "Wants=network-online.target",
    "",
    "[Service]",
    "Type=forking",
    `User=${options.serviceUser}`,
    `Group=${options.serviceGroup}`,
    `WorkingDirectory=${options.projectRoot}`,
    `EnvironmentFile=${options.envFile}`,
    `Environment=OPENCHAT_HOME=${options.projectRoot}`,
    `Environment=OPENCHAT_CONFIG=${options.projectRoot}/etc/config.json`,
    `Environment=OPENCHAT_LOG_DIR=${options.projectRoot}/var/logs`,
    `Environment=OPENCHAT_DATA_DIR=${options.projectRoot}/var/data`,
    `PIDFile=${options.projectRoot}/var/run/openchat.${options.environment}.pid`,
    "GuessMainPID=no",
    `ExecStart=${options.projectRoot}/bin/openchat start --host ${options.host} --port ${options.port} --environment ${options.environment} --health-timeout-ms ${options.healthTimeoutMs} --shutdown-timeout-ms ${options.shutdownTimeoutMs} ${strictPortFlag}`,
    `ExecStop=${options.projectRoot}/bin/openchat stop --environment ${options.environment} --shutdown-timeout-ms ${options.shutdownTimeoutMs} ${forceStopFlag}`,
    `ExecReload=${options.projectRoot}/bin/openchat restart --host ${options.host} --port ${options.port} --environment ${options.environment} --health-timeout-ms ${options.healthTimeoutMs} --shutdown-timeout-ms ${options.shutdownTimeoutMs} ${strictPortFlag}`,
    "Restart=on-failure",
    "RestartSec=5",
    "TimeoutStartSec=90",
    "TimeoutStopSec=30",
    "KillSignal=SIGTERM",
    "FinalKillSignal=SIGKILL",
    "SendSIGKILL=yes",
    "SuccessExitStatus=143",
    "StartLimitIntervalSec=120",
    "StartLimitBurst=10",
    "LimitNOFILE=65535",
    "NoNewPrivileges=yes",
    "PrivateTmp=yes",
    "ProtectSystem=full",
    "ProtectHome=true",
    `ReadWritePaths=${options.projectRoot}/var`,
    "",
    "[Install]",
    "WantedBy=multi-user.target",
    "",
  ].join("\n");
}

function installSystemdService(projectRoot, options) {
  if (process.platform !== "linux") {
    logWarn(
      "Systemd service installation is only supported on Linux. Skipping --service.",
    );
    return 0;
  }

  const serviceIdentity = resolveServiceIdentity();
  const unitContents = renderSystemdUnit({
    envFile: options.envFile,
    environment: options.environment,
    forceStop: options.forceStop,
    healthTimeoutMs: options.healthTimeoutMs,
    host: options.host,
    port: options.port,
    projectRoot,
    serviceGroup: options.serviceGroup || serviceIdentity.group,
    serviceUser: options.serviceUser || serviceIdentity.user,
    shutdownTimeoutMs: options.shutdownTimeoutMs,
    strictPort: options.strictPort,
  });

  const localUnitPath = path.join(projectRoot, "etc", "openchat.service");
  const stagedUnitPath = path.join(
    projectRoot,
    "var",
    "data",
    "openchat.service.generated",
  );
  const systemdUnitPath = "/etc/systemd/system/openchat.service";
  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
  const shouldUseSudo = !isRoot && commandExists("sudo");

  ensureDirectory(path.dirname(localUnitPath));
  ensureDirectory(path.dirname(stagedUnitPath));
  fs.writeFileSync(localUnitPath, unitContents, "utf8");
  fs.writeFileSync(stagedUnitPath, unitContents, "utf8");

  const systemctlArgs = shouldUseSudo ? ["sudo", "systemctl"] : ["systemctl"];
  const copyArgs = shouldUseSudo
    ? ["sudo", "cp", stagedUnitPath, systemdUnitPath]
    : ["cp", stagedUnitPath, systemdUnitPath];

  if (
    !commandExists(
      systemctlArgs[0],
      systemctlArgs.length === 2
        ? [systemctlArgs[1], "--version"]
        : ["--version"],
    )
  ) {
    throw new Error("systemctl is required to install the OpenChat service.");
  }

  runLocalCommand(copyArgs[0], copyArgs.slice(1));
  runLocalCommand(systemctlArgs[0], [
    ...systemctlArgs.slice(1),
    "daemon-reload",
  ]);
  runLocalCommand(systemctlArgs[0], [
    ...systemctlArgs.slice(1),
    "enable",
    "openchat.service",
  ]);
  runLocalCommand(systemctlArgs[0], [
    ...systemctlArgs.slice(1),
    "restart",
    "openchat.service",
  ]);

  logSuccess(`Systemd service installed: ${systemdUnitPath}`);
  return 0;
}

async function runDeploy(projectRoot, options = {}) {
  const environment =
    normalizeEnvironmentName(
      options.environment || process.env.NODE_ENV || "production",
    ) || "production";
  const envContext = validateDeployEnvironment(projectRoot, options);
  const host = options.host || envContext.values.HOST || "127.0.0.1";
  const port = parseInteger(options.port || envContext.values.PORT, 7200);
  const start = options.start !== false;
  const requestedDbAction = String(options.dbAction || "auto").toLowerCase();
  const healthTimeoutMs = parseInteger(
    options.healthTimeoutMs || envContext.values.OPENCHAT_HEALTH_TIMEOUT_MS,
    environment === "production" ? 60000 : 30000,
  );
  const shutdownTimeoutMs = parseInteger(
    options.shutdownTimeoutMs || envContext.values.OPENCHAT_SHUTDOWN_TIMEOUT_MS,
    20000,
  );
  const strictPort = parseBoolean(
    options.strictPort !== undefined
      ? options.strictPort
      : envContext.values.OPENCHAT_STRICT_PORT,
    environment !== "development",
  );
  const forceStop = parseBoolean(
    options.forceStop !== undefined
      ? options.forceStop
      : envContext.values.OPENCHAT_FORCE_STOP_ON_TIMEOUT,
    true,
  );

  if (!["auto", "init", "patch", "skip"].includes(requestedDbAction)) {
    throw new Error(`Unsupported deploy db action: ${requestedDbAction}`);
  }

  await runInstall(projectRoot, {
    command: "deploy",
    mode: "standalone",
    environment,
    envFile: envContext.envFile,
    initDb: false,
    seed: options.seed,
    skipBuild: options.skipBuild,
    start: false,
    yes: options.yes,
  });

  const databaseAction =
    requestedDbAction === "auto"
      ? detectDatabaseAction(projectRoot, { environment })
      : requestedDbAction;
  logInfo(`Deploy database action: ${databaseAction}`);

  if (databaseAction === "init") {
    await runDatabaseInit(projectRoot, {
      environment,
      seed: options.seed,
      yes: options.yes,
    });
  } else if (databaseAction === "patch") {
    await runDatabasePatch(projectRoot, {
      environment,
    });
  } else {
    logInfo("Skipping database action");
  }

  if (options.service === true) {
    installSystemdService(projectRoot, {
      environment,
      envFile: envContext.envFile,
      forceStop,
      healthTimeoutMs,
      host,
      port,
      serviceGroup: options.serviceGroup,
      serviceUser: options.serviceUser,
      shutdownTimeoutMs,
      strictPort,
    });
    logSuccess("Deployment completed with systemd service management");
    return 0;
  }

  if (start) {
    await restartRuntime(projectRoot, {
      environment,
      envFile: envContext.envFile,
      forceStop,
      healthHost: envContext.values.APP_HOST,
      healthTimeoutMs,
      host,
      port,
      shutdownTimeoutMs,
      skipHealthCheck: options.skipHealthCheck,
      strictPort,
    });
  }

  logSuccess("Deployment completed");
  return 0;
}

module.exports = {
  detectDatabaseAction,
  renderSystemdUnit,
  runDeploy,
  validateDeployEnvironment,
};
