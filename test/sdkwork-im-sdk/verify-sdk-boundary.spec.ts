import * as path from 'node:path';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

describe('verify-sdk-boundary script', () => {
  const scriptPath = path.join(
    process.cwd(),
    'sdkwork-im-sdk',
    'bin',
    'verify-sdk-boundary.mjs',
  );

  test('fails when generation touches adapter-wukongim', () => {
    const result = spawnSync(
      'node',
      [
        scriptPath,
        '--changed-path',
        'sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/src/index.ts',
      ],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).not.toBe(0);
  });

  test.each([
    'sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/src/sdk.ts',
    'sdkwork-im-sdk/sdkwork-im-sdk-flutter/adapter-wukongim/lib/openchat_wukongim_adapter.dart',
    'sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed/lib/openchat_sdk.dart',
  ])('fails when generation touches protected handwritten path %s', (changedPath) => {
    const result = spawnSync('node', [scriptPath, '--changed-path', changedPath], {
      encoding: 'utf8',
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('protected paths');
  });

  test('passes when all changed paths stay under generated/server-openapi', () => {
    const result = spawnSync(
      'node',
      [
        scriptPath,
        '--changed-path',
        'sdkwork-im-sdk/sdkwork-im-sdk-typescript/generated/server-openapi/src/index.ts',
        '--changed-path',
        'sdkwork-im-sdk/sdkwork-im-sdk-flutter/generated/server-openapi/lib/sdk.dart',
      ],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(0);
  });

  test('passes when changed paths are outside sdkwork-im-sdk', () => {
    const result = spawnSync(
      'node',
      [
        scriptPath,
        '--changed-path',
        'docs/en/sdk/typescript.md',
      ],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(0);
  });

  test('writes and validates manual-owned snapshots when protected files remain unchanged', () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'sdkwork-im-sdk-boundary-'));
    const protectedRoot = path.join(tempRoot, 'sdkwork-im-sdk-typescript', 'composed');
    const snapshotPath = path.join(tempRoot, 'boundary-snapshot.json');

    mkdirSync(path.join(protectedRoot, 'src'), { recursive: true });
    writeFileSync(path.join(protectedRoot, '.manual-owned'), 'manual-owned\n', 'utf8');
    writeFileSync(path.join(protectedRoot, 'src', 'sdk.ts'), 'export const value = 1;\n', 'utf8');

    try {
      const capture = spawnSync(
        'node',
        [
          scriptPath,
          '--snapshot-root',
          tempRoot,
          '--write-snapshot',
          snapshotPath,
        ],
        {
          encoding: 'utf8',
        },
      );

      expect(capture.status).toBe(0);
      expect(existsSync(snapshotPath)).toBe(true);

      const verify = spawnSync(
        'node',
        [
          scriptPath,
          '--snapshot-root',
          tempRoot,
          '--compare-snapshot',
          snapshotPath,
        ],
        {
          encoding: 'utf8',
        },
      );

      expect(verify.status).toBe(0);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('fails when manual-owned files change after a snapshot was captured', () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'sdkwork-im-sdk-boundary-'));
    const protectedRoot = path.join(tempRoot, 'sdkwork-im-sdk-flutter', 'adapter-wukongim');
    const snapshotPath = path.join(tempRoot, 'boundary-snapshot.json');
    const protectedFile = path.join(
      protectedRoot,
      'lib',
      'openchat_wukongim_adapter.dart',
    );

    mkdirSync(path.join(protectedRoot, 'lib'), { recursive: true });
    writeFileSync(path.join(protectedRoot, '.manual-owned'), 'manual-owned\n', 'utf8');
    writeFileSync(protectedFile, 'const value = 1;\n', 'utf8');

    try {
      const capture = spawnSync(
        'node',
        [
          scriptPath,
          '--snapshot-root',
          tempRoot,
          '--write-snapshot',
          snapshotPath,
        ],
        {
          encoding: 'utf8',
        },
      );

      expect(capture.status).toBe(0);

      writeFileSync(protectedFile, 'const value = 2;\n', 'utf8');

      const verify = spawnSync(
        'node',
        [
          scriptPath,
          '--snapshot-root',
          tempRoot,
          '--compare-snapshot',
          snapshotPath,
        ],
        {
          encoding: 'utf8',
        },
      );

      expect(verify.status).not.toBe(0);
      expect(verify.stderr).toContain('manual-owned');
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
