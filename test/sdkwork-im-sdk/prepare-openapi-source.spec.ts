import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

describe('prepare-openapi-source script', () => {
  test('chooses the requested local base snapshot path', () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'sdkwork-im-sdk-'));
    const baseFile = path.join(tempRoot, 'openapi.json');
    const derivedDir = path.join(tempRoot, 'derived');
    mkdirSync(derivedDir, { recursive: true });
    writeFileSync(baseFile, '{"openapi":"3.2.0","paths":{}}', 'utf8');

    const scriptPath = path.join(
      process.cwd(),
      'sdkwork-im-sdk',
      'bin',
      'prepare-openapi-source.mjs',
    );

    const result = spawnSync(
      'node',
      [
        scriptPath,
        '--base',
        baseFile,
        '--derived',
        path.join(derivedDir, 'openapi.sdkgen.json'),
      ],
      {
        encoding: 'utf8',
      },
    );

    try {
      expect(result.status).toBe(0);
      expect((result.stdout || '').trim()).toBe(baseFile);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('refreshes the derived snapshot from a remote OpenAPI source when available', async () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'sdkwork-im-sdk-'));
    const baseFile = path.join(tempRoot, 'openchat-im.openapi.yaml');
    const derivedFile = path.join(tempRoot, 'openchat-im.sdkgen.yaml');
    writeFileSync(baseFile, 'openapi: 3.2.0\ninfo:\n  title: Base\n  version: 0.1.0\npaths: {}\n', 'utf8');

    const remoteDocument = JSON.stringify({
      openapi: '3.2.0',
      info: {
        title: 'Refreshed',
        version: '9.9.9',
      },
      paths: {},
    });

    const server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(remoteDocument);
    });

    const scriptPath = path.join(
      process.cwd(),
      'sdkwork-im-sdk',
      'bin',
      'prepare-openapi-source.mjs',
    );

    try {
      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve());
      });

      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Expected an IPv4 server address');
      }

      const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
        const child = spawn(
          'node',
          [
            scriptPath,
            '--base',
            baseFile,
            '--derived',
            derivedFile,
            '--prefer-derived',
            '--refresh-url',
            `http://127.0.0.1:${address.port}/openapi.json`,
          ],
          {
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk) => {
          stdout += chunk.toString();
        });
        child.stderr.on('data', (chunk) => {
          stderr += chunk.toString();
        });
        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });
      });

      expect(result.code).toBe(0);
      expect(result.stdout.trim()).toBe(derivedFile);
      expect(readFileSync(baseFile, 'utf8')).toContain('"title":"Refreshed"');
      expect(readFileSync(derivedFile, 'utf8')).toContain('"title":"Refreshed"');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
