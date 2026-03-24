import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

describe('sdkwork-im-sdk package bin scripts', () => {
  const root = path.join(process.cwd(), 'sdkwork-im-sdk');
  const generatedOnlyLanguages = ['python', 'go', 'java', 'kotlin', 'swift', 'csharp'];

  test('typescript adapter and composed modules expose publish scripts', () => {
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'adapter-wukongim', 'bin', 'publish-core.mjs')),
    ).toBe(true);
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'adapter-wukongim', 'bin', 'publish.sh')),
    ).toBe(true);
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'adapter-wukongim', 'bin', 'publish.ps1')),
    ).toBe(true);
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'composed', 'bin', 'publish-core.mjs')),
    ).toBe(true);
  });

  test('flutter adapter and composed modules expose publish scripts', () => {
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-flutter', 'adapter-wukongim', 'bin', 'publish-core.mjs')),
    ).toBe(true);
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-flutter', 'adapter-wukongim', 'bin', 'publish.sh')),
    ).toBe(true);
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-flutter', 'adapter-wukongim', 'bin', 'publish.ps1')),
    ).toBe(true);
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-flutter', 'composed', 'bin', 'publish-core.mjs')),
    ).toBe(true);
  });

  test('typescript and flutter workspaces expose generation and assembly wrappers', () => {
    expect(existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'bin', 'sdk-gen.sh'))).toBe(true);
    expect(existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'bin', 'sdk-gen.ps1'))).toBe(true);
    expect(existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'bin', 'sdk-assemble.sh'))).toBe(true);
    expect(existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'bin', 'sdk-assemble.ps1'))).toBe(true);
    expect(existsSync(path.join(root, 'sdkwork-im-sdk-flutter', 'bin', 'sdk-gen.sh'))).toBe(true);
    expect(existsSync(path.join(root, 'sdkwork-im-sdk-flutter', 'bin', 'sdk-assemble.ps1'))).toBe(true);
  });

  test('all generated-only language workspaces expose generation and assembly wrappers', () => {
    for (const language of generatedOnlyLanguages) {
      const languageRoot = path.join(root, `sdkwork-im-sdk-${language}`);
      expect(existsSync(path.join(languageRoot, 'bin', 'sdk-gen.sh'))).toBe(true);
      expect(existsSync(path.join(languageRoot, 'bin', 'sdk-gen.ps1'))).toBe(true);
      expect(existsSync(path.join(languageRoot, 'bin', 'sdk-assemble.sh'))).toBe(true);
      expect(existsSync(path.join(languageRoot, 'bin', 'sdk-assemble.ps1'))).toBe(true);
    }
  });

  test('publishable package metadata is aligned with publish scripts', () => {
    const typescriptAdapterPackage = JSON.parse(
      readFileSync(
        path.join(root, 'sdkwork-im-sdk-typescript', 'adapter-wukongim', 'package.json'),
        'utf8',
      ),
    ) as { private?: boolean; main?: string; types?: string };
    const typescriptComposedPackage = JSON.parse(
      readFileSync(
        path.join(root, 'sdkwork-im-sdk-typescript', 'composed', 'package.json'),
        'utf8',
      ),
    ) as { private?: boolean; main?: string; types?: string };
    const flutterAdapterPubspec = readFileSync(
      path.join(root, 'sdkwork-im-sdk-flutter', 'adapter-wukongim', 'pubspec.yaml'),
      'utf8',
    );
    const flutterComposedPubspec = readFileSync(
      path.join(root, 'sdkwork-im-sdk-flutter', 'composed', 'pubspec.yaml'),
      'utf8',
    );

    expect(typescriptAdapterPackage.private).not.toBe(true);
    expect(typescriptComposedPackage.private).not.toBe(true);
    expect(typescriptAdapterPackage.main).toBe('dist/index.js');
    expect(typescriptAdapterPackage.types).toBe('dist/index.d.ts');
    expect(typescriptComposedPackage.main).toBe('dist/index.js');
    expect(typescriptComposedPackage.types).toBe('dist/index.d.ts');
    expect(flutterAdapterPubspec).not.toContain('publish_to: none');
    expect(flutterComposedPubspec).not.toContain('publish_to: none');
    expect(flutterComposedPubspec).not.toContain('sdkwork_common_flutter');
  });

  test('root workspace provides the shared typescript sdk-common runtime for generated package checks', () => {
    const rootPackage = JSON.parse(
      readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
    ) as {
      devDependencies?: Record<string, string>;
    };

    expect(rootPackage.devDependencies?.['@sdkwork/sdk-common']).toBe('^1.0.2');
    expect(rootPackage.devDependencies?.vite).toBe('^7.0.0');
    expect(rootPackage.devDependencies?.['vite-plugin-dts']).toBe('^4.0.0');
  });

  test('flutter handwritten packages include publish-required docs and license files', () => {
    for (const relativeDir of [
      path.join(root, 'sdkwork-im-sdk-flutter', 'adapter-wukongim'),
      path.join(root, 'sdkwork-im-sdk-flutter', 'composed'),
    ]) {
      expect(existsSync(path.join(relativeDir, 'README.md'))).toBe(true);
      expect(existsSync(path.join(relativeDir, 'CHANGELOG.md'))).toBe(true);
      expect(existsSync(path.join(relativeDir, 'LICENSE'))).toBe(true);
    }
  });

  test('flutter generated package includes publish-required metadata and files', () => {
    const generatedRoot = path.join(
      root,
      'sdkwork-im-sdk-flutter',
      'generated',
      'server-openapi',
    );
    const pubspec = readFileSync(path.join(generatedRoot, 'pubspec.yaml'), 'utf8');
    const readme = readFileSync(path.join(generatedRoot, 'README.md'), 'utf8');

    expect(pubspec).toContain('homepage: https://github.com/openchat-team/openchat-server/tree/main/sdkwork-im-sdk/sdkwork-im-sdk-flutter/generated/server-openapi');
    expect(pubspec).toContain('repository: https://github.com/openchat-team/openchat-server');
    expect(existsSync(path.join(generatedRoot, 'CHANGELOG.md'))).toBe(true);
    expect(existsSync(path.join(generatedRoot, 'LICENSE'))).toBe(true);
    expect(existsSync(path.join(generatedRoot, 'lib', 'backend_sdk.dart'))).toBe(true);
    expect(existsSync(path.join(generatedRoot, 'lib', 'backend_client.dart'))).toBe(false);
    expect(readme).toContain("import 'package:backend_sdk/backend_sdk.dart';");
    expect(readme).not.toContain('sdkwork_common_flutter');
  });

  test('typescript handwritten packages expose real build configs instead of placeholder scripts', () => {
    const adapterPackage = JSON.parse(
      readFileSync(
        path.join(root, 'sdkwork-im-sdk-typescript', 'adapter-wukongim', 'package.json'),
        'utf8',
      ),
    ) as { scripts?: Record<string, string> };
    const composedPackage = JSON.parse(
      readFileSync(
        path.join(root, 'sdkwork-im-sdk-typescript', 'composed', 'package.json'),
        'utf8',
      ),
    ) as { scripts?: Record<string, string> };

    expect(adapterPackage.scripts?.build).toContain('tsconfig.build.json');
    expect(adapterPackage.scripts?.build).not.toContain('placeholder');
    expect(composedPackage.scripts?.build).toContain('tsconfig.build.json');
    expect(composedPackage.scripts?.build).not.toContain('placeholder');

    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'adapter-wukongim', 'tsconfig.build.json')),
    ).toBe(true);
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'composed', 'tsconfig.build.json')),
    ).toBe(true);
  });

  test('root generation wrappers resolve one unified sdk version before multi-language generation', () => {
    const powershellScript = readFileSync(path.join(root, 'bin', 'generate-sdk.ps1'), 'utf8');
    const shellScript = readFileSync(path.join(root, 'bin', 'generate-sdk.sh'), 'utf8');

    expect(powershellScript).toContain('resolve-sdk-version.js');
    expect(powershellScript).toContain('--fixed-sdk-version');
    expect(shellScript).toContain('resolve-sdk-version.js');
    expect(shellScript).toContain('--fixed-sdk-version');
  });

  test('generation wrappers default to the app-only /im/v3 schema surface', () => {
    const powershellScript = readFileSync(path.join(root, 'bin', 'generate-sdk.ps1'), 'utf8');
    const shellScript = readFileSync(path.join(root, 'bin', 'generate-sdk.sh'), 'utf8');

    expect(powershellScript).toContain('[string]$ApiPrefix = "/im/v3"');
    expect(powershellScript).toContain('"$ResolvedBaseUrl/im/v3/openapi.json"');
    expect(powershellScript).not.toContain('[string]$ApiPrefix = "/api"');

    expect(shellScript).toContain('API_PREFIX="${API_PREFIX:-/im/v3}"');
    expect(shellScript).toContain('${RESOLVED_BASE_URL}/im/v3/openapi.json');
    expect(shellScript).not.toContain('API_PREFIX="${API_PREFIX:-/api}"');
  });

  test('generation wrappers expose configurable runtime schema refresh timeout', () => {
    const powershellScript = readFileSync(path.join(root, 'bin', 'generate-sdk.ps1'), 'utf8');
    const shellScript = readFileSync(path.join(root, 'bin', 'generate-sdk.sh'), 'utf8');

    expect(powershellScript).toContain('[string]$Domain = "127.0.0.1"');
    expect(powershellScript).toContain('[int]$RefreshTimeoutMs = 15000');
    expect(powershellScript).toContain('$env:OPENAPI_REFRESH_TIMEOUT_MS');
    expect(powershellScript).toContain('--refresh-timeout-ms');

    expect(shellScript).toContain('HOST="${HOST:-${DOMAIN:-127.0.0.1}}"');
    expect(shellScript).toContain('OPENAPI_REFRESH_TIMEOUT_MS="${OPENAPI_REFRESH_TIMEOUT_MS:-15000}"');
    expect(shellScript).toContain('--refresh-timeout-ms');
  });

  test('powershell generation wrapper fails fast on native command errors', () => {
    const powershellScript = readFileSync(path.join(root, 'bin', 'generate-sdk.ps1'), 'utf8');

    expect(powershellScript).toContain('function Assert-LastExitCode');
    expect(powershellScript).toContain('Assert-LastExitCode "ensure-openapi-runtime"');
    expect(powershellScript).toContain('Assert-LastExitCode "prepare-openapi-source"');
    expect(powershellScript).toContain('Assert-LastExitCode "resolve-sdk-version"');
    expect(powershellScript).toContain('Assert-LastExitCode "verify-sdk-boundary"');
    expect(powershellScript).toContain('Assert-LastExitCode "assemble-sdk"');
  });

  test('generation wrappers ensure runtime OpenAPI endpoints before refreshing the schema', () => {
    const powershellScript = readFileSync(path.join(root, 'bin', 'generate-sdk.ps1'), 'utf8');
    const shellScript = readFileSync(path.join(root, 'bin', 'generate-sdk.sh'), 'utf8');

    expect(powershellScript).toContain('ensure-openapi-runtime.mjs');
    expect(powershellScript).toContain('--host $Domain');
    expect(powershellScript).toContain('--port $Port');
    expect(powershellScript).toContain('Stop-Process -Id $RuntimePid');

    expect(shellScript).toContain('ensure-openapi-runtime.mjs');
    expect(shellScript).toContain('--host "${HOST}"');
    expect(shellScript).toContain('--port "${PORT}"');
    expect(shellScript).toContain('trap cleanup_runtime EXIT');
  });

  test('generation wrappers snapshot and verify manual-owned boundaries around generation', () => {
    const powershellScript = readFileSync(path.join(root, 'bin', 'generate-sdk.ps1'), 'utf8');
    const shellScript = readFileSync(path.join(root, 'bin', 'generate-sdk.sh'), 'utf8');

    expect(powershellScript).toContain('--snapshot-root');
    expect(powershellScript).toContain('--write-snapshot');
    expect(powershellScript).toContain('--compare-snapshot');

    expect(shellScript).toContain('--snapshot-root');
    expect(shellScript).toContain('--write-snapshot');
    expect(shellScript).toContain('--compare-snapshot');
  });

  test('shared typescript publish workflow builds locally without forcing npm install', () => {
    const sharedPublishCore = readFileSync(
      path.join(root, 'bin', 'package-publish-core.mjs'),
      'utf8',
    );

    expect(sharedPublishCore).toContain("run('npm', ['run', 'build'], projectDir);");
    expect(sharedPublishCore).not.toContain("run('npm', ['install'], projectDir);");
    expect(sharedPublishCore).toContain("run('npm', ['pack', '--dry-run'], projectDir);");
  });

  test('shared flutter publish workflow hides local pubspec overrides during publish validation', () => {
    const sharedPublishCore = readFileSync(
      path.join(root, 'bin', 'package-publish-core.mjs'),
      'utf8',
    );

    expect(sharedPublishCore).toContain('pubspec_overrides.yaml');
    expect(sharedPublishCore).toContain('.pubspec_overrides.publish-check.yaml');
    expect(sharedPublishCore).toContain("run('dart', ['pub', 'publish', '--dry-run'], projectDir);");
  });

  test('language-level powershell generation wrappers preserve named option forwarding', () => {
    const powershellWrappers = [
      path.join(root, 'sdkwork-im-sdk-typescript', 'bin', 'sdk-gen.ps1'),
      path.join(root, 'sdkwork-im-sdk-flutter', 'bin', 'sdk-gen.ps1'),
      path.join(root, 'sdkwork-im-sdk-python', 'bin', 'sdk-gen.ps1'),
      path.join(root, 'sdkwork-im-sdk-go', 'bin', 'sdk-gen.ps1'),
      path.join(root, 'sdkwork-im-sdk-java', 'bin', 'sdk-gen.ps1'),
      path.join(root, 'sdkwork-im-sdk-kotlin', 'bin', 'sdk-gen.ps1'),
      path.join(root, 'sdkwork-im-sdk-swift', 'bin', 'sdk-gen.ps1'),
      path.join(root, 'sdkwork-im-sdk-csharp', 'bin', 'sdk-gen.ps1'),
    ];

    for (const wrapperPath of powershellWrappers) {
      const wrapper = readFileSync(wrapperPath, 'utf8');
      expect(wrapper).toContain('[string]$Domain = "127.0.0.1"');
      expect(wrapper).toContain('[string]$ApiPrefix = "/im/v3"');
      expect(wrapper).not.toContain('[string]$ApiPrefix = "/api"');
      expect(wrapper).toContain('$forwardedArgs = @{');
      expect(wrapper).toContain('SkipFetch = $SkipFetch');
      expect(wrapper).toContain('& (Join-Path $workspaceDir "bin\\generate-sdk.ps1") @forwardedArgs');
    }
  });

  test('android and ios compatibility wrappers expose forwarding scripts', () => {
    for (const wrapper of ['android', 'ios']) {
      const wrapperRoot = path.join(root, `sdkwork-im-sdk-${wrapper}`, 'bin');
      expect(existsSync(path.join(wrapperRoot, 'sdk-gen.sh'))).toBe(true);
      expect(existsSync(path.join(wrapperRoot, 'sdk-gen.ps1'))).toBe(true);
      expect(existsSync(path.join(wrapperRoot, 'sdk-assemble.sh'))).toBe(true);
      expect(existsSync(path.join(wrapperRoot, 'sdk-assemble.ps1'))).toBe(true);

      const powershellWrapper = readFileSync(path.join(wrapperRoot, 'sdk-gen.ps1'), 'utf8');
      expect(powershellWrapper).toContain('[string]$ApiPrefix = "/im/v3"');
      expect(powershellWrapper).not.toContain('[string]$ApiPrefix = "/api"');
    }
  });
});
