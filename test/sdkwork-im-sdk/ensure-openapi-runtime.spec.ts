import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

interface EnsureOpenApiRuntimeResult {
  baseUrl: string;
  schemaUrl: string;
  adminSchemaUrl: string;
  startedRuntime: boolean;
  pid?: number;
}

describe('ensure-openapi-runtime script', () => {
  jest.setTimeout(90000);

  it('starts the schema runtime when the target OpenAPI URLs are not already available', async () => {
    const host = '127.0.0.1';
    const port = 3902;
    const scriptPath = path.join(
      process.cwd(),
      'sdkwork-im-sdk',
      'bin',
      'ensure-openapi-runtime.mjs',
    );

    const output = execFileSync(
      process.execPath,
      [scriptPath, '--host', host, '--port', String(port), '--timeout-ms', '60000'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    const runtime = JSON.parse(output) as EnsureOpenApiRuntimeResult;

    try {
      expect(runtime.startedRuntime).toBe(true);
      expect(runtime.pid).toBeGreaterThan(0);
      expect(runtime.baseUrl).toBe(`http://${host}:${port}`);
      expect(runtime.schemaUrl).toBe(`http://${host}:${port}/im/v3/openapi.json`);
      expect(runtime.adminSchemaUrl).toBe(
        `http://${host}:${port}/admin/im/v3/openapi.json`,
      );

      const appResponse = await fetch(runtime.schemaUrl);
      const adminResponse = await fetch(runtime.adminSchemaUrl);

      expect(appResponse.status).toBe(200);
      expect(adminResponse.status).toBe(200);
    } finally {
      if (runtime.pid) {
        process.kill(runtime.pid);
      }
    }
  });
});
