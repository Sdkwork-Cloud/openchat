import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

describe('sdkwork-im-sdk realtime module skeletons', () => {
  const root = path.join(process.cwd(), 'sdkwork-im-sdk');

  test('typescript workspace exposes independent adapter and composed entrypoints', () => {
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'adapter-wukongim', 'src', 'index.ts')),
    ).toBe(true);
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'composed', 'src', 'index.ts')),
    ).toBe(true);
  });

  test('flutter workspace exposes independent adapter and composed entrypoints', () => {
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-flutter', 'adapter-wukongim', 'lib', 'openchat_wukongim_adapter.dart')),
    ).toBe(true);
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-flutter', 'composed', 'lib', 'openchat_sdk.dart')),
    ).toBe(true);
  });

  test('adapter manifests declare the official WuKongIM SDK dependencies', () => {
    const typescriptAdapterPackage = JSON.parse(
      readFileSync(
        path.join(root, 'sdkwork-im-sdk-typescript', 'adapter-wukongim', 'package.json'),
        'utf8',
      ),
    ) as {
      dependencies?: Record<string, string>;
    };
    const flutterAdapterPubspec = readFileSync(
      path.join(root, 'sdkwork-im-sdk-flutter', 'adapter-wukongim', 'pubspec.yaml'),
      'utf8',
    );

    expect(typescriptAdapterPackage.dependencies?.wukongimjssdk).toBeDefined();
    expect(flutterAdapterPubspec).toContain('wukongimfluttersdk:');
  });

  test('composed package manifests depend on generated http and realtime adapter layers', () => {
    const typescriptComposedPackage = JSON.parse(
      readFileSync(path.join(root, 'sdkwork-im-sdk-typescript', 'composed', 'package.json'), 'utf8'),
    ) as {
      dependencies?: Record<string, string>;
    };
    const flutterComposedPubspec = readFileSync(
      path.join(root, 'sdkwork-im-sdk-flutter', 'composed', 'pubspec.yaml'),
      'utf8',
    );

    expect(typescriptComposedPackage.dependencies?.['@sdkwork/im-backend-sdk']).toBeDefined();
    expect(typescriptComposedPackage.dependencies?.['@openchat/sdkwork-im-wukongim-adapter']).toBeDefined();
    expect(flutterComposedPubspec).toContain('backend_sdk:');
    expect(flutterComposedPubspec).toContain('openchat_wukongim_adapter:');
  });
});
