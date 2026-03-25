#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hardenTypeScriptGeneratedSdk } from './harden-typescript-generated-sdk.mjs';

function fail(message) {
  console.error(`[sdkwork-im-admin-sdk] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {
    languages: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--language') {
      const value = (argv[index + 1] || '').trim();
      if (!value) {
        fail('Missing value for --language');
      }
      parsed.languages.push(value);
      index += 1;
      continue;
    }
    fail(`Unknown argument: ${current}`);
  }

  return parsed;
}

function readText(filePath) {
  if (!existsSync(filePath)) {
    fail(`Missing required file: ${filePath}`);
  }
  return readFileSync(filePath, 'utf8');
}

function ensureFile(filePath, contents) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function readAuthorityContract(filePath) {
  const raw = readText(filePath);
  const trimmed = raw.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    return {
      openapiVersion: typeof parsed?.openapi === 'string' ? parsed.openapi : '',
      apiVersion: typeof parsed?.info?.version === 'string' ? parsed.info.version : '',
    };
  }

  const openapiVersionMatch = raw.match(/^\s*openapi:\s*['"]?([^'"\n]+)['"]?/m);
  const apiVersionMatch = raw.match(/^\s{2}version:\s*['"]?([^'"\n]+)['"]?/m);

  return {
    openapiVersion: openapiVersionMatch ? openapiVersionMatch[1] : '',
    apiVersion: apiVersionMatch ? apiVersionMatch[1] : '',
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = path.resolve(scriptDir, '..');
  const docsDir = path.join(workspaceRoot, 'docs');
  const authorityPath = path.join(workspaceRoot, 'openapi', 'openchat-im-admin.openapi.yaml');
  const sdkgenPath = path.join(workspaceRoot, 'openapi', 'openchat-im-admin.sdkgen.yaml');
  const assemblyPath = path.join(workspaceRoot, '.sdkwork-assembly.json');
  const compatibilityMatrixPath = path.join(docsDir, 'compatibility-matrix.md');

  hardenTypeScriptGeneratedSdk(workspaceRoot);

  const authority = readAuthorityContract(authorityPath);
  const generatedPackage = readJson(
    path.join(workspaceRoot, 'sdkwork-im-admin-sdk-typescript', 'generated', 'server-openapi', 'package.json'),
  );
  const composedPackage = readJson(
    path.join(workspaceRoot, 'sdkwork-im-admin-sdk-typescript', 'composed', 'package.json'),
  );
  const workspaceVersion = generatedPackage.version || composedPackage.version || authority.apiVersion || '0.1.0';

  const languages = [
    {
      language: 'typescript',
      workspaceDir: 'sdkwork-im-admin-sdk-typescript',
      layers: {
        generated: {
          path: 'generated/server-openapi',
          present: true,
          packageName: generatedPackage.name,
          version: generatedPackage.version || workspaceVersion,
        },
        composed: {
          path: 'composed',
          present: true,
          packageName: composedPackage.name,
          version: composedPackage.version || workspaceVersion,
          dependencies: Object.entries(composedPackage.dependencies || {}).map(
            ([name, version]) => `${name}@${version}`,
          ),
        },
      },
    },
  ].filter((entry) => args.languages.length === 0 || args.languages.includes(entry.language));

  const manifest = {
    assembledAt: new Date().toISOString(),
    workspace: 'sdkwork-im-admin-sdk',
    workspaceVersion,
    openapi: {
      authorityPath: 'openapi/openchat-im-admin.openapi.yaml',
      sdkgenPath: 'openapi/openchat-im-admin.sdkgen.yaml',
      openapiVersion: authority.openapiVersion,
      apiVersion: authority.apiVersion,
      sdkgenExists: existsSync(sdkgenPath),
    },
    languages,
  };

  for (const language of manifest.languages) {
    ensureFile(
      path.join(workspaceRoot, language.workspaceDir, language.layers.generated.path, '.sdkwork-generated'),
      'generator-owned\n',
    );
  }

  ensureFile(
    path.join(workspaceRoot, 'sdkwork-im-admin-sdk-typescript', 'composed', '.manual-owned'),
    'manual-owned\n',
  );

  const compatibilityLines = [
    '# Compatibility Matrix',
    '',
    `Authority OpenAPI version: \`${manifest.openapi.openapiVersion}\``,
    `Authority API version: \`${manifest.openapi.apiVersion}\``,
    `Workspace SDK release: \`${manifest.workspaceVersion}\``,
    '',
    '| Language | Generated Layer | Generated Package | Composed Package | Composed Dependencies |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const language of languages) {
    compatibilityLines.push(
      `| ${language.language} | \`${language.layers.generated.path}\` | \`${language.layers.generated.packageName}@${language.layers.generated.version}\` | \`${language.layers.composed.packageName}@${language.layers.composed.version}\` | ${language.layers.composed.dependencies.map((entry) => `\`${entry}\``).join(', ')} |`,
    );
  }

  mkdirSync(docsDir, { recursive: true });
  writeFileSync(assemblyPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  writeFileSync(compatibilityMatrixPath, `${compatibilityLines.join('\n')}\n`, 'utf8');
  process.stdout.write(
    `[sdkwork-im-admin-sdk] assembled ${manifest.languages.length} language workspaces using release ${manifest.workspaceVersion}\n`,
  );
}

main();
