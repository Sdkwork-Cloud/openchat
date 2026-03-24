import {
  finalizeImOpenApiDocument,
  IM_OPENAPI_API_VERSION,
  IM_OPENAPI_JSON_SCHEMA_DIALECT,
  IM_OPENAPI_SPEC_VERSION,
} from './im-openapi-document.util';

describe('finalizeImOpenApiDocument', () => {
  it('should stamp the runtime document with the IM OpenAPI metadata', () => {
    const document = finalizeImOpenApiDocument(
      {
        openapi: '3.0.0',
        info: {
          title: 'OpenChat IM App API',
          version: '3.0.0',
        },
        paths: {
          '/im/v3/auth/login': {
            post: {
              operationId: 'login',
            },
          },
        },
      },
      'im/v3',
    );

    expect(document.openapi).toBe(IM_OPENAPI_SPEC_VERSION);
    expect(document.jsonSchemaDialect).toBe(IM_OPENAPI_JSON_SCHEMA_DIALECT);
    expect(document.info).toEqual({
      title: 'OpenChat IM App API',
      version: IM_OPENAPI_API_VERSION,
    });
    expect(document.servers).toEqual([
      {
        url: '/im/v3',
        description: 'Runtime API base path',
      },
    ]);
    expect(document.paths).toEqual({
      '/auth/login': {
        post: {
          operationId: 'login',
        },
      },
    });
  });

  it('should keep the server path normalized with a leading slash', () => {
    const document = finalizeImOpenApiDocument(
      {
        info: {
          title: 'OpenChat IM Admin API',
          version: 'legacy',
        },
      } as { info: { title: string; version: string } },
      '/admin/im/v3',
    );

    expect(document.servers).toEqual([
      {
        url: '/admin/im/v3',
        description: 'Runtime API base path',
      },
    ]);
  });
});
