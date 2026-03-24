import { existsSync } from 'node:fs';
import * as path from 'node:path';

describe('sdkwork-im-sdk workspace structure', () => {
  const workspaceRoot = path.join(process.cwd(), 'sdkwork-im-sdk');

  test('contains required design-time root directories', () => {
    expect(existsSync(path.join(workspaceRoot, 'openapi'))).toBe(true);
    expect(existsSync(path.join(workspaceRoot, 'schemas'))).toBe(true);
    expect(existsSync(path.join(workspaceRoot, 'bin'))).toBe(true);
    expect(existsSync(path.join(workspaceRoot, 'docs'))).toBe(true);
  });

  test('contains key root documents', () => {
    expect(existsSync(path.join(workspaceRoot, 'docs', 'overview.md'))).toBe(true);
    expect(existsSync(path.join(workspaceRoot, 'docs', 'architecture.md'))).toBe(true);
    expect(existsSync(path.join(workspaceRoot, 'openapi', 'openchat-im.openapi.yaml'))).toBe(true);
    expect(existsSync(path.join(workspaceRoot, 'openapi', 'openchat-im.sdkgen.yaml'))).toBe(true);
  });
});
