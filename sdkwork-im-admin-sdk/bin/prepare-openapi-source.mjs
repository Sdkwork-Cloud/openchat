#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function fail(message) {
  console.error(`[sdkwork-im-admin-sdk] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {
    base: '',
    derived: '',
    preferDerived: false,
    refreshUrl: '',
    refreshTimeoutMs: 15000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--base') {
      parsed.base = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (current === '--derived') {
      parsed.derived = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (current === '--prefer-derived') {
      parsed.preferDerived = true;
      continue;
    }
    if (current === '--refresh-url') {
      parsed.refreshUrl = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (current === '--refresh-timeout-ms') {
      parsed.refreshTimeoutMs = Number.parseInt(argv[index + 1] || '', 10);
      index += 1;
      continue;
    }
    fail(`Unknown argument: ${current}`);
  }

  if (!parsed.base) {
    fail('Missing required argument: --base');
  }

  return parsed;
}

function ensureOpenApi3DocumentRaw(raw, label) {
  const trimmed = raw.trim();
  if (!trimmed) {
    fail(`Empty OpenAPI source: ${label}`);
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      fail(
        `Invalid JSON OpenAPI source: ${label}\n${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (typeof parsed?.openapi !== 'string' || !parsed.openapi.startsWith('3.')) {
      fail(`Unsupported OpenAPI JSON source: ${label}`);
    }

    return raw;
  }

  const match = raw.match(/^\s*openapi\s*:\s*['"]?([^'"\n]+)['"]?/m);
  if (!match || !match[1] || !match[1].startsWith('3.')) {
    fail(`Unsupported OpenAPI YAML source: ${label}`);
  }

  return raw;
}

async function refreshOpenApiSource(refreshUrl, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(refreshUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        accept: 'application/json, application/yaml, text/yaml, text/plain;q=0.8, */*;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const raw = await response.text();
    return ensureOpenApi3DocumentRaw(raw, refreshUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[sdkwork-im-admin-sdk] OpenAPI refresh skipped: ${message}`);
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const basePath = path.resolve(args.base);
  const derivedPath = args.derived ? path.resolve(args.derived) : '';

  let selectedPath = basePath;
  let baseSpecRaw = '';

  if (existsSync(basePath)) {
    baseSpecRaw = ensureOpenApi3DocumentRaw(readFileSync(basePath, 'utf8'), basePath);
  }

  if (args.refreshUrl) {
    const refreshed = await refreshOpenApiSource(args.refreshUrl, args.refreshTimeoutMs);
    if (refreshed) {
      baseSpecRaw = refreshed;
    }
  }

  if (!baseSpecRaw) {
    fail(`Base OpenAPI file not found and refresh failed: ${basePath}`);
  }

  mkdirSync(path.dirname(basePath), { recursive: true });
  writeFileSync(basePath, baseSpecRaw, 'utf8');

  if (derivedPath) {
    mkdirSync(path.dirname(derivedPath), { recursive: true });
    writeFileSync(derivedPath, baseSpecRaw, 'utf8');
    if (args.preferDerived) {
      selectedPath = derivedPath;
    }
  }

  process.stdout.write(selectedPath);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
