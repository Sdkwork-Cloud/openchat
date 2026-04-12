#!/usr/bin/env node

const path = require("node:path");
const { spawn } = require("node:child_process");
const { resolveEnvironmentContext } = require("./lib/node/shared.cjs");

const [, , nodeEnv, command, ...args] = process.argv;

if (!nodeEnv || !command) {
  console.error(
    "Usage: node scripts/run-with-env.cjs <environment> <command> [args...]",
  );
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, "..");
const envContext = resolveEnvironmentContext(projectRoot, nodeEnv, {
  fallbackEnvironment: nodeEnv,
});

const child = spawn(command, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: envContext.values,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
