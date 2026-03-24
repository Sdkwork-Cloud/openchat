import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import * as path from 'node:path';

interface OpenApiDocumentLike {
  openapi?: string;
  servers?: Array<{ url?: string }>;
  paths?: Record<string, unknown>;
}

async function waitForJson(
  url: string,
  timeoutMs: number,
): Promise<OpenApiDocumentLike> {
  const start = Date.now();
  let lastError: unknown;

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return (await response.json()) as OpenApiDocumentLike;
      }
      lastError = new Error(`Unexpected status ${response.status} for ${url}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Timed out waiting for ${url}`);
}

describe('OpenAPI runtime schema server', () => {
  jest.setTimeout(90000);

  let child: ChildProcessWithoutNullStreams | null = null;

  afterEach(() => {
    if (!child) {
      return;
    }

    child.kill('SIGTERM');
    child = null;
  });

  it('serves app and admin OpenAPI documents without requiring the full runtime stack', async () => {
    const port = 3901;
    const host = '127.0.0.1';
    const scriptPath = path.join(process.cwd(), 'scripts', 'start-openapi-server.cjs');

    child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOST: host,
        PORT: String(port),
        JWT_SECRET: 'schema-only-test-secret',
      },
      stdio: 'pipe',
    });

    const appDocument = await waitForJson(
      `http://${host}:${port}/im/v3/openapi.json`,
      60000,
    );
    const adminDocument = await waitForJson(
      `http://${host}:${port}/admin/im/v3/openapi.json`,
      60000,
    );

    expect(appDocument.openapi).toBe('3.2.0');
    expect(appDocument.servers?.[0]?.url).toBe('/im/v3');
    expect(Object.keys(appDocument.paths || {})).toContain('/auth/login');
    expect(Object.keys(appDocument.paths || {})).not.toContain(
      '/wukongim/message/send',
    );

    expect(adminDocument.openapi).toBe('3.2.0');
    expect(adminDocument.servers?.[0]?.url).toBe('/admin/im/v3');
    expect(Object.keys(adminDocument.paths || {})).toContain(
      '/wukongim/message/send',
    );
    expect(Object.keys(adminDocument.paths || {})).not.toContain('/auth/login');
  });
});
