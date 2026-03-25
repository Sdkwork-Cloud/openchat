import { ChildProcess, spawn } from 'node:child_process';
import * as path from 'node:path';

interface OpenApiParameterLike {
  name?: string;
  in?: string;
}

interface OpenApiSchemaLike {
  properties?: Record<string, unknown>;
  items?: OpenApiSchemaLike;
}

interface OpenApiOperationLike {
  parameters?: OpenApiParameterLike[];
  requestBody?: {
    content?: Record<string, { schema?: OpenApiSchemaLike }>;
  };
}

interface OpenApiDocumentLike {
  components?: {
    schemas?: Record<string, OpenApiSchemaLike>;
  };
  paths?: Record<string, Record<string, OpenApiOperationLike>>;
}

function resolveRequestSchema(
  document: OpenApiDocumentLike,
  operation: OpenApiOperationLike | undefined,
): OpenApiSchemaLike | undefined {
  const schema = operation?.requestBody?.content?.['application/json']?.schema;
  if (!schema) {
    return undefined;
  }

  const ref = (schema as OpenApiSchemaLike & { $ref?: string }).$ref;
  if (!ref) {
    return schema;
  }

  const name = ref.split('/').pop();
  if (!name) {
    return undefined;
  }

  return document.components?.schemas?.[name];
}

async function waitForJson(url: string, timeoutMs: number): Promise<OpenApiDocumentLike> {
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

  throw lastError instanceof Error ? lastError : new Error(`Timed out waiting for ${url}`);
}

describe('admin OpenAPI contract completeness', () => {
  jest.setTimeout(90000);

  let child: ChildProcess | null = null;

  afterEach(async () => {
    if (!child) {
      return;
    }

    const runningChild = child;
    child = null;

    if (runningChild.killed || runningChild.exitCode !== null) {
      return;
    }

    const exitPromise = new Promise<void>((resolve) => {
      runningChild.once('exit', () => resolve());
      runningChild.once('close', () => resolve());
    });

    runningChild.kill('SIGTERM');
    await exitPromise;
  });

  it('exports admin query params and request bodies needed by sdkwork-im-admin-sdk', async () => {
    const port = 3902;
    const host = '127.0.0.1';
    const scriptPath = path.join(process.cwd(), 'scripts', 'start-openapi-server.cjs');

    child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOST: host,
        PORT: String(port),
        JWT_SECRET: 'admin-openapi-contract-test-secret',
      },
      stdio: 'ignore',
    });
    child.unref();

    const adminDocument = await waitForJson(
      `http://${host}:${port}/admin/im/v3/openapi.json`,
      60000,
    );

    const listUsers = adminDocument.paths?.['/users']?.get;
    const listMessages = adminDocument.paths?.['/messages']?.get;
    const listConfigs = adminDocument.paths?.['/system/configs']?.get;
    const sendMessage = adminDocument.paths?.['/wukongim/message/send']?.post;
    const createChannel = adminDocument.paths?.['/wukongim/channel/create']?.post;

    expect(listUsers?.parameters?.map((parameter) => parameter.name)).toEqual(
      expect.arrayContaining(['page', 'limit', 'keyword', 'status', 'role']),
    );
    expect(listMessages?.parameters?.map((parameter) => parameter.name)).toEqual(
      expect.arrayContaining(['page', 'limit', 'keyword', 'fromUserId', 'toUserId', 'groupId', 'status', 'type']),
    );
    expect(listConfigs?.parameters?.map((parameter) => parameter.name)).toEqual(
      expect.arrayContaining(['pattern', 'includeSensitive']),
    );

    const sendMessageSchema = resolveRequestSchema(adminDocument, sendMessage)?.properties;
    expect(sendMessageSchema).toHaveProperty('channelId');
    expect(sendMessageSchema).toHaveProperty('channelType');
    expect(sendMessageSchema).toHaveProperty('payload');

    const createChannelSchema = resolveRequestSchema(adminDocument, createChannel)?.properties;
    expect(createChannelSchema).toHaveProperty('channelId');
    expect(createChannelSchema).toHaveProperty('channelType');
  });
});
