#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function readText(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
  return readFileSync(filePath, 'utf8');
}

function writeText(filePath, contents) {
  writeFileSync(filePath, `${contents.replace(/\r?\n/g, '\n').trimEnd()}\n`, 'utf8');
}

function patchHttpClientSource(raw) {
  if (raw.includes('const apiKeyHeader: string = HttpClient.API_KEY_HEADER;')) {
    return raw;
  }

  let next = raw;

  next = next.replace(
    `  setApiKey(apiKey: string): void {
    const authConfig = this.getInternalAuthConfig();
    const headers = this.getInternalHeaders();
    authConfig.apiKey = apiKey;
    authConfig.tokenManager?.clearTokens?.();

    if (HttpClient.API_KEY_HEADER === 'Authorization' && HttpClient.API_KEY_USE_BEARER) {
      authConfig.authMode = 'apikey';
      delete headers['Access-Token'];
      return;
    }

    authConfig.authMode = 'dual-token';
    headers[HttpClient.API_KEY_HEADER] = HttpClient.API_KEY_USE_BEARER
      ? \`Bearer \${apiKey}\`
      : apiKey;

    if (HttpClient.API_KEY_HEADER.toLowerCase() !== 'authorization') {
      delete headers['Authorization'];
    }
    if (HttpClient.API_KEY_HEADER.toLowerCase() !== 'access-token') {
      delete headers['Access-Token'];
    }
  }`,
    `  setApiKey(apiKey: string): void {
    const authConfig = this.getInternalAuthConfig();
    const headers = this.getInternalHeaders();
    const apiKeyHeader: string = HttpClient.API_KEY_HEADER;
    const apiKeyUseBearer: boolean = HttpClient.API_KEY_USE_BEARER;

    authConfig.apiKey = apiKey;
    authConfig.tokenManager?.clearTokens?.();

    if (apiKeyHeader === 'Authorization' && apiKeyUseBearer) {
      authConfig.authMode = 'apikey';
      delete headers['Access-Token'];
      return;
    }

    authConfig.authMode = 'dual-token';
    headers[apiKeyHeader] = apiKeyUseBearer
      ? \`Bearer \${apiKey}\`
      : apiKey;

    if (apiKeyHeader.toLowerCase() !== 'authorization') {
      delete headers['Authorization'];
    }
    if (apiKeyHeader.toLowerCase() !== 'access-token') {
      delete headers['Access-Token'];
    }
  }`,
  );

  next = next.replace(
    `  setAuthToken(token: string): void {
    const headers = this.getInternalHeaders();
    if (HttpClient.API_KEY_HEADER.toLowerCase() !== 'authorization') {
      delete headers[HttpClient.API_KEY_HEADER];
    }
    super.setAuthToken(token);
  }`,
    `  setAuthToken(token: string): void {
    const headers = this.getInternalHeaders();
    const apiKeyHeader: string = HttpClient.API_KEY_HEADER;

    if (apiKeyHeader.toLowerCase() !== 'authorization') {
      delete headers[apiKeyHeader];
    }
    super.setAuthToken(token);
  }`,
  );

  next = next.replace(
    `  setAccessToken(token: string): void {
    const headers = this.getInternalHeaders();
    if (HttpClient.API_KEY_HEADER.toLowerCase() !== 'access-token') {
      delete headers[HttpClient.API_KEY_HEADER];
    }
    super.setAccessToken(token);
  }`,
    `  setAccessToken(token: string): void {
    const headers = this.getInternalHeaders();
    const apiKeyHeader: string = HttpClient.API_KEY_HEADER;

    if (apiKeyHeader.toLowerCase() !== 'access-token') {
      delete headers[apiKeyHeader];
    }
    super.setAccessToken(token);
  }`,
  );

  return next;
}

function patchApiSource(raw) {
  return raw
    .replace(/Promise<void>/g, 'Promise<unknown>')
    .replace(/this\.client\.(get|post|put|delete|patch)<void>/g, 'this.client.$1<unknown>');
}

function patchPackageJson(raw) {
  return raw.replace('"name": "@sdkwork/backend-sdk"', '"name": "@sdkwork/im-admin-backend-sdk"');
}

function patchReadme(raw) {
  return raw.replace(/@sdkwork\/backend-sdk/g, '@sdkwork/im-admin-backend-sdk');
}

export function hardenTypeScriptGeneratedSdk(workspaceRoot) {
  const clientPath = path.join(
    workspaceRoot,
    'sdkwork-im-admin-sdk-typescript',
    'generated',
    'server-openapi',
    'src',
    'http',
    'client.ts',
  );

  if (!existsSync(clientPath)) {
    return;
  }

  writeText(clientPath, patchHttpClientSource(readText(clientPath)));

  const apiRoot = path.join(
    workspaceRoot,
    'sdkwork-im-admin-sdk-typescript',
    'generated',
    'server-openapi',
    'src',
    'api',
  );

  if (!existsSync(apiRoot)) {
    return;
  }

  for (const entry of readdirSync(apiRoot)) {
    if (!entry.endsWith('.ts') || entry === 'index.ts' || entry === 'base.ts' || entry === 'paths.ts') {
      continue;
    }

    const filePath = path.join(apiRoot, entry);
    writeText(filePath, patchApiSource(readText(filePath)));
  }

  const packageJsonPath = path.join(
    workspaceRoot,
    'sdkwork-im-admin-sdk-typescript',
    'generated',
    'server-openapi',
    'package.json',
  );
  if (existsSync(packageJsonPath)) {
    writeText(packageJsonPath, patchPackageJson(readText(packageJsonPath)));
  }

  const readmePath = path.join(
    workspaceRoot,
    'sdkwork-im-admin-sdk-typescript',
    'generated',
    'server-openapi',
    'README.md',
  );
  if (existsSync(readmePath)) {
    writeText(readmePath, patchReadme(readText(readmePath)));
  }
}

function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  hardenTypeScriptGeneratedSdk(path.resolve(scriptDir, '..'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
