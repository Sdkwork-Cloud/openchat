import * as path from "node:path";

type DeployModule = {
  detectDatabaseAction: (
    projectRoot: string,
    options?: {
      environment?: string;
    },
  ) => string;
  renderSystemdUnit: (options: {
    envFile: string;
    environment: string;
    forceStop?: boolean;
    healthTimeoutMs: number;
    host: string;
    port: number;
    projectRoot: string;
    serviceGroup: string;
    serviceUser: string;
    shutdownTimeoutMs: number;
    strictPort?: boolean;
  }) => string;
};

const { parseCommand } = require("../../scripts/lib/node/cli.cjs") as {
  parseCommand: (argv: string[]) => Record<string, unknown>;
};

describe("openchat deploy cli", () => {
  test("parses deploy command with database action and service flags", () => {
    expect(
      parseCommand([
        "deploy",
        "prod",
        "--db-action",
        "patch",
        "--service",
        "--yes",
      ]),
    ).toMatchObject({
      kind: "deploy",
      command: "deploy",
      environment: "production",
      dbAction: "patch",
      service: true,
      yes: true,
    });
  });

  test("detects init action when the target database does not exist", () => {
    jest.resetModules();
    jest.doMock("../../scripts/lib/node/database.cjs", () => ({
      resolveDatabaseConfig: jest.fn(() => ({
        projectRoot: "/srv/openchat",
        environment: "production",
        host: "127.0.0.1",
        port: "5432",
        user: "openchat",
        password: "secret",
        database: "openchat",
      })),
    }));
    jest.doMock("../../scripts/lib/node/shared.cjs", () => {
      const actual = jest.requireActual("../../scripts/lib/node/shared.cjs");
      return {
        ...actual,
        commandExists: jest.fn(() => true),
        runCommand: jest.fn((command: string, args: string[]) => {
          expect(command).toBe("psql");
          const sql = args[args.indexOf("-c") + 1];
          if (sql.includes("SELECT 1 FROM pg_database")) {
            return { status: 0, stdout: "", stderr: "" };
          }
          return { status: 0, stdout: "", stderr: "" };
        }),
      };
    });

    let deployModule!: DeployModule;
    jest.isolateModules(() => {
      deployModule =
        require("../../scripts/lib/node/deploy.cjs") as DeployModule;
    });

    try {
      expect(
        deployModule.detectDatabaseAction("/srv/openchat", {
          environment: "production",
        }),
      ).toBe("init");
    } finally {
      jest.dontMock("../../scripts/lib/node/database.cjs");
      jest.dontMock("../../scripts/lib/node/shared.cjs");
      jest.resetModules();
    }
  });

  test("detects patch action when application tables already exist", () => {
    jest.resetModules();
    jest.doMock("../../scripts/lib/node/database.cjs", () => ({
      resolveDatabaseConfig: jest.fn(() => ({
        projectRoot: "/srv/openchat",
        environment: "production",
        host: "127.0.0.1",
        port: "5432",
        user: "openchat",
        password: "secret",
        database: "openchat",
      })),
    }));
    jest.doMock("../../scripts/lib/node/shared.cjs", () => {
      const actual = jest.requireActual("../../scripts/lib/node/shared.cjs");
      return {
        ...actual,
        commandExists: jest.fn(() => true),
        runCommand: jest.fn((command: string, args: string[]) => {
          expect(command).toBe("psql");
          const sql = args[args.indexOf("-c") + 1];
          if (sql.includes("SELECT 1 FROM pg_database")) {
            return { status: 0, stdout: "1\n", stderr: "" };
          }
          if (sql.includes("SELECT to_regclass('public.chat_users')")) {
            return { status: 0, stdout: "chat_users\n", stderr: "" };
          }
          return { status: 0, stdout: "", stderr: "" };
        }),
      };
    });

    let deployModule!: DeployModule;
    jest.isolateModules(() => {
      deployModule =
        require("../../scripts/lib/node/deploy.cjs") as DeployModule;
    });

    try {
      expect(
        deployModule.detectDatabaseAction("/srv/openchat", {
          environment: "production",
        }),
      ).toBe("patch");
    } finally {
      jest.dontMock("../../scripts/lib/node/database.cjs");
      jest.dontMock("../../scripts/lib/node/shared.cjs");
      jest.resetModules();
    }
  });

  test("renders a systemd unit that matches the current project root and runtime wrapper", () => {
    const { renderSystemdUnit } =
      require("../../scripts/lib/node/deploy.cjs") as DeployModule;

    const projectRoot = path.join(path.sep, "srv", "openchat");
    const unit = renderSystemdUnit({
      envFile: path.join(projectRoot, ".env.production"),
      environment: "production",
      healthTimeoutMs: 60000,
      host: "127.0.0.1",
      port: 7200,
      projectRoot,
      serviceGroup: "openchat",
      serviceUser: "openchat",
      shutdownTimeoutMs: 20000,
      strictPort: true,
      forceStop: true,
    });

    expect(unit).toContain(`WorkingDirectory=${projectRoot}`);
    expect(unit).toContain(`EnvironmentFile=${projectRoot}/.env.production`);
    expect(unit).toContain(
      `PIDFile=${projectRoot}/var/run/openchat.production.pid`,
    );
    expect(unit).toContain(
      `ExecStart=${projectRoot}/bin/openchat start --host 127.0.0.1 --port 7200 --environment production --health-timeout-ms 60000 --shutdown-timeout-ms 20000 --strict-port`,
    );
    expect(unit).toContain(
      `ExecStop=${projectRoot}/bin/openchat stop --environment production --shutdown-timeout-ms 20000 --force-stop`,
    );
    expect(unit).toContain("Type=forking");
    expect(unit).toContain("User=openchat");
    expect(unit).toContain("Group=openchat");
    expect(unit).toContain("TimeoutStartSec=90");
    expect(unit).toContain("TimeoutStopSec=30");
    expect(unit).toContain("NoNewPrivileges=yes");
    expect(unit).toContain(`ReadWritePaths=${projectRoot}/var`);
  });

  test("renders environment-aware systemd flags for non-production runtimes", () => {
    const { renderSystemdUnit } =
      require("../../scripts/lib/node/deploy.cjs") as DeployModule;

    const projectRoot = path.join(path.sep, "srv", "openchat");
    const unit = renderSystemdUnit({
      envFile: path.join(projectRoot, ".env.test"),
      environment: "test",
      forceStop: false,
      healthTimeoutMs: 30000,
      host: "127.0.0.1",
      port: 7201,
      projectRoot,
      serviceGroup: "openchat",
      serviceUser: "openchat",
      shutdownTimeoutMs: 15000,
      strictPort: false,
    });

    expect(unit).toContain(`EnvironmentFile=${projectRoot}/.env.test`);
    expect(unit).toContain(`PIDFile=${projectRoot}/var/run/openchat.test.pid`);
    expect(unit).toContain(
      `ExecStart=${projectRoot}/bin/openchat start --host 127.0.0.1 --port 7201 --environment test --health-timeout-ms 30000 --shutdown-timeout-ms 15000 --strict-port false`,
    );
    expect(unit).toContain(
      `ExecStop=${projectRoot}/bin/openchat stop --environment test --shutdown-timeout-ms 15000 --force-stop false`,
    );
    expect(unit).toContain(
      `ExecReload=${projectRoot}/bin/openchat restart --host 127.0.0.1 --port 7201 --environment test --health-timeout-ms 30000 --shutdown-timeout-ms 15000 --strict-port false`,
    );
  });
});
