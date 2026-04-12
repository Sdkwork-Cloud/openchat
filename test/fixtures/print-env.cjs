#!/usr/bin/env node

const keys = process.argv.slice(2);
const payload = {};

for (const key of keys) {
  payload[key] = process.env[key] ?? null;
}

process.stdout.write(JSON.stringify(payload));
