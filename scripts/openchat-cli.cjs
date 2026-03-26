#!/usr/bin/env node

const { main } = require('./lib/node/cli.cjs');

main(process.argv.slice(2)).catch((error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});
