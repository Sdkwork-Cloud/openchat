import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(path.resolve(__dirname, '..', '..', relativePath), 'utf8');
}

describe('admin SDK integration boundary', () => {
  it('requires the infrastructure package to depend on the generated admin SDK facade through workspace linking', () => {
    const packageJson = JSON.parse(readWorkspaceFile('package.json')) as {
      dependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.['@openchat/sdkwork-im-admin-sdk']).toBe('workspace:*');
  });

  it('routes admin control-plane traffic through the admin SDK instead of raw fetch wrappers', () => {
    const source = readWorkspaceFile('src/services/adminApi.ts');

    expect(source).toContain('@openchat/sdkwork-im-admin-sdk');
    expect(source).not.toContain('/admin/im/v3');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('axios.');
  });
});
