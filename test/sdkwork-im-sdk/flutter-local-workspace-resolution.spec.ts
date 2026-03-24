import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

describe('flutter composed workspace local resolution', () => {
  const workspaceRoot = path.join(
    process.cwd(),
    'sdkwork-im-sdk',
    'sdkwork-im-sdk-flutter',
  );

  test('uses pubspec_overrides to resolve generated and handwritten local packages safely', () => {
    const pubspecOverrides = readFileSync(
      path.join(workspaceRoot, 'composed', 'pubspec_overrides.yaml'),
      'utf8',
    );

    expect(pubspecOverrides).toContain('dependency_overrides:');
    expect(pubspecOverrides).toContain('backend_sdk:');
    expect(pubspecOverrides).toContain('path: ../generated/server-openapi');
    expect(pubspecOverrides).toContain('openchat_wukongim_adapter:');
    expect(pubspecOverrides).toContain('path: ../adapter-wukongim');
  });

  test('keeps manual ownership markers outside generator-owned output', () => {
    expect(existsSync(path.join(workspaceRoot, 'adapter-wukongim', '.manual-owned'))).toBe(true);
    expect(existsSync(path.join(workspaceRoot, 'composed', '.manual-owned'))).toBe(true);
    expect(existsSync(path.join(workspaceRoot, 'generated', 'server-openapi', '.sdkwork-generated'))).toBe(true);
  });
});
