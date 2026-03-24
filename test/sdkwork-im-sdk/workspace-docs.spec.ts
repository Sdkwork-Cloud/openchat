import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

describe('sdkwork-im-sdk workspace documentation', () => {
  const workspaceRoot = path.join(process.cwd(), 'sdkwork-im-sdk');
  const generatedOnlyLanguages = ['python', 'go', 'java', 'kotlin', 'swift', 'csharp'];
  const replacementCharacter = '\uFFFD';

  test('typescript and flutter workspace readmes describe the layered architecture', () => {
    const typescriptReadme = readFileSync(
      path.join(workspaceRoot, 'sdkwork-im-sdk-typescript', 'README.md'),
      'utf8',
    );
    const flutterReadme = readFileSync(
      path.join(workspaceRoot, 'sdkwork-im-sdk-flutter', 'README.md'),
      'utf8',
    );

    expect(typescriptReadme).toContain('generated/server-openapi');
    expect(typescriptReadme).toContain('adapter-wukongim');
    expect(typescriptReadme).toContain('composed');
    expect(flutterReadme).toContain('generated/server-openapi');
    expect(flutterReadme).toContain('adapter-wukongim');
    expect(flutterReadme).toContain('composed');
  });

  test('android and ios wrapper readmes point to kotlin and swift generator workspaces', () => {
    const androidReadme = readFileSync(
      path.join(workspaceRoot, 'sdkwork-im-sdk-android', 'README.md'),
      'utf8',
    );
    const iosReadme = readFileSync(
      path.join(workspaceRoot, 'sdkwork-im-sdk-ios', 'README.md'),
      'utf8',
    );

    expect(androidReadme).toContain('compatibility wrapper');
    expect(androidReadme).toContain('sdkwork-im-sdk-kotlin');
    expect(iosReadme).toContain('compatibility wrapper');
    expect(iosReadme).toContain('sdkwork-im-sdk-swift');
  });

  test('generated-only language workspaces publish root architecture and regeneration docs', () => {
    for (const language of generatedOnlyLanguages) {
      const languageRoot = path.join(workspaceRoot, `sdkwork-im-sdk-${language}`);
      expect(readFileSync(path.join(languageRoot, 'README.md'), 'utf8')).toContain('generated/server-openapi');
      expect(readFileSync(path.join(languageRoot, 'ARCHITECTURE.md'), 'utf8')).toContain('generated/server-openapi');
      expect(readFileSync(path.join(languageRoot, 'REGENERATION.md'), 'utf8')).toContain('generated/server-openapi');
      expect(readFileSync(path.join(languageRoot, 'COMPATIBILITY.md'), 'utf8')).toContain('generated/server-openapi');
    }
  });

  test('workspace and repo docs define sdkwork-im-sdk as app-only and runtime-schema driven', () => {
    const workspaceReadme = readFileSync(path.join(workspaceRoot, 'README.md'), 'utf8');
    const workspaceOverview = readFileSync(
      path.join(workspaceRoot, 'docs', 'overview.md'),
      'utf8',
    );
    const generatorStandard = readFileSync(
      path.join(workspaceRoot, 'docs', 'generator-standard.md'),
      'utf8',
    );
    const repoStandard = readFileSync(
      path.join(process.cwd(), 'docs', 'im-openapi-sdk-standard.md'),
      'utf8',
    );

    for (const document of [
      workspaceReadme,
      workspaceOverview,
      generatorStandard,
      repoStandard,
    ]) {
      expect(document).toContain('/im/v3/openapi.json');
      expect(document).toContain('sdkwork-im-sdk');
      expect(document).toContain('generated/server-openapi');
      expect(document).toContain('adapter-wukongim');
      expect(document).toContain('composed');
    }

    expect(workspaceReadme).toContain('does not include admin APIs');
    expect(workspaceOverview).toContain('does not include admin APIs');
    expect(generatorStandard).toContain('fetch the runtime schema from the running server');
    expect(generatorStandard).toContain('manual-owned snapshot');
    expect(repoStandard).toContain('/admin/im/v3/openapi.json');
    expect(repoStandard).toContain('does not include admin APIs');
    expect(repoStandard).toContain('bin/sdk-gen.sh');
    expect(repoStandard).toContain('bin/sdk-gen.ps1');
    expect(workspaceReadme).toContain('manual-owned boundary snapshot');
  });

  test('docs site exposes separate app and admin references plus complete sdk pages', () => {
    const requiredDocs = [
      'docs/en/api/index.md',
      'docs/zh/api/index.md',
      'docs/en/admin-api/index.md',
      'docs/zh/admin-api/index.md',
      'docs/en/admin-api/rtc.md',
      'docs/zh/admin-api/rtc.md',
      'docs/en/admin-api/wukongim.md',
      'docs/zh/admin-api/wukongim.md',
      'docs/en/sdk/index.md',
      'docs/zh/sdk/index.md',
      'docs/en/sdk/typescript.md',
      'docs/zh/sdk/typescript.md',
      'docs/en/sdk/flutter.md',
      'docs/zh/sdk/flutter.md',
      'docs/en/sdk/java.md',
      'docs/zh/sdk/java.md',
      'docs/en/sdk/kotlin.md',
      'docs/zh/sdk/kotlin.md',
      'docs/en/sdk/go.md',
      'docs/zh/sdk/go.md',
      'docs/en/sdk/python.md',
      'docs/zh/sdk/python.md',
      'docs/en/sdk/swift.md',
      'docs/zh/sdk/swift.md',
      'docs/en/sdk/csharp.md',
      'docs/zh/sdk/csharp.md',
      'docs/en/sdk/android.md',
      'docs/zh/sdk/android.md',
      'docs/en/sdk/ios.md',
      'docs/zh/sdk/ios.md',
    ];

    for (const relativePath of requiredDocs) {
      const absolutePath = path.join(process.cwd(), relativePath);
      expect(existsSync(absolutePath)).toBe(true);
      const document = readFileSync(absolutePath, 'utf8');
      expect(document.length).toBeGreaterThan(40);
    }

    const appApiIndex = readFileSync(path.join(process.cwd(), 'docs/en/api/index.md'), 'utf8');
    const adminApiIndex = readFileSync(path.join(process.cwd(), 'docs/en/admin-api/index.md'), 'utf8');
    const sdkIndex = readFileSync(path.join(process.cwd(), 'docs/en/sdk/index.md'), 'utf8');

    expect(appApiIndex).toContain('/im/v3/openapi.json');
    expect(appApiIndex).toContain('/admin/im/v3');
    expect(adminApiIndex).toContain('/admin/im/v3/openapi.json');
    expect(adminApiIndex).toContain('must not be bundled into `sdkwork-im-sdk`');
    expect(sdkIndex).toContain('/im/v3/openapi.json');
    expect(sdkIndex).toContain('generated/server-openapi');
  });

  test('workspace readmes explain schema source, regeneration scripts, and safe boundaries', () => {
    const languageReadmes = [
      'sdkwork-im-sdk-typescript/README.md',
      'sdkwork-im-sdk-flutter/README.md',
      'sdkwork-im-sdk-python/README.md',
      'sdkwork-im-sdk-go/README.md',
      'sdkwork-im-sdk-java/README.md',
      'sdkwork-im-sdk-kotlin/README.md',
      'sdkwork-im-sdk-swift/README.md',
      'sdkwork-im-sdk-csharp/README.md',
    ];

    for (const relativePath of languageReadmes) {
      const document = readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
      expect(document).toContain('/im/v3/openapi.json');
      expect(document).toContain('bin/sdk-gen.sh');
      expect(document).toContain('bin/sdk-gen.ps1');
    }

    const typescriptReadme = readFileSync(
      path.join(workspaceRoot, 'sdkwork-im-sdk-typescript', 'README.md'),
      'utf8',
    );
    const flutterReadme = readFileSync(
      path.join(workspaceRoot, 'sdkwork-im-sdk-flutter', 'README.md'),
      'utf8',
    );
    const androidReadme = readFileSync(
      path.join(workspaceRoot, 'sdkwork-im-sdk-android', 'README.md'),
      'utf8',
    );
    const iosReadme = readFileSync(
      path.join(workspaceRoot, 'sdkwork-im-sdk-ios', 'README.md'),
      'utf8',
    );

    expect(typescriptReadme).toContain('adapter-wukongim');
    expect(typescriptReadme).toContain('composed');
    expect(flutterReadme).toContain('adapter-wukongim');
    expect(flutterReadme).toContain('composed');
    expect(androidReadme).toContain('sdkwork-im-sdk-kotlin');
    expect(androidReadme).toContain('/im/v3/openapi.json');
    expect(iosReadme).toContain('sdkwork-im-sdk-swift');
    expect(iosReadme).toContain('/im/v3/openapi.json');
  });

  test('targeted docs and config contain readable chinese content and no replacement characters', () => {
    const expectations: Array<[string, string]> = [
      ['docs/.vitepress/config.ts', '\u7b80\u4f53\u4e2d\u6587'],
      ['docs/index.md', '\u9762\u5411\u73b0\u4ee3\u5e94\u7528\u7684 IM \u670d\u52a1\u4e0e SDK \u4f53\u7cfb'],
      ['docs/zh/api/index.md', '\u524d\u7aef API Reference'],
      ['docs/zh/admin-api/index.md', 'OpenChat \u5c06\u7ba1\u7406\u63a7\u5236\u9762\u7684 IM HTTP \u63a5\u53e3\u7edf\u4e00\u6302\u8f7d\u5728 `/admin/im/v3`\u3002'],
      ['docs/zh/sdk/index.md', 'OpenChat \u901a\u8fc7 `sdkwork-im-sdk` \u5de5\u4f5c\u533a\u4ea4\u4ed8\u9762\u5411\u524d\u7aef\u5e94\u7528\u7684 SDK \u4f53\u7cfb\u3002'],
      ['docs/zh/sdk/typescript.md', '\u5206\u5c42\u7ed3\u6784'],
      ['docs/zh/sdk/flutter.md', '\u5206\u5c42\u7ed3\u6784'],
    ];

    for (const [relativePath, expectedFragment] of expectations) {
      const document = readFileSync(path.join(process.cwd(), relativePath), 'utf8');
      expect(document).toContain(expectedFragment);
      expect(document).not.toContain(replacementCharacter);
    }
  });
});
