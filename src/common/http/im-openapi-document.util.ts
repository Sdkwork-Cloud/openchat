export const IM_OPENAPI_SPEC_VERSION = '3.2.0';
export const IM_OPENAPI_JSON_SCHEMA_DIALECT =
  'https://spec.openapis.org/oas/3.2/dialect/base';
export const IM_OPENAPI_API_VERSION = '0.1.0';

interface OpenApiInfoLike {
  version?: string;
}

interface OpenApiServerLike {
  url: string;
  description?: string;
}

export interface ImOpenApiDocumentLike {
  openapi?: string;
  jsonSchemaDialect?: string;
  info?: OpenApiInfoLike;
  servers?: OpenApiServerLike[];
  paths?: Record<string, unknown>;
}

function normalizeServerPath(serverPath: string): string {
  const trimmed = serverPath.trim();
  if (!trimmed) {
    return '/';
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function normalizeDocumentPaths(
  paths: Record<string, unknown> | undefined,
  serverPath: string,
): Record<string, unknown> | undefined {
  if (!paths) {
    return paths;
  }

  const normalizedServerPath = normalizeServerPath(serverPath);
  if (normalizedServerPath === '/') {
    return paths;
  }

  const normalizedEntries = Object.entries(paths).map(([path, value]) => {
    if (
      path === normalizedServerPath ||
      path.startsWith(`${normalizedServerPath}/`)
    ) {
      const stripped = path.slice(normalizedServerPath.length);
      return [stripped || '/', value] as const;
    }
    return [path, value] as const;
  });

  return Object.fromEntries(normalizedEntries);
}

export function finalizeImOpenApiDocument<T extends ImOpenApiDocumentLike>(
  document: T,
  serverPath: string,
): T & {
  openapi: string;
  jsonSchemaDialect: string;
  info: NonNullable<T['info']> & OpenApiInfoLike;
  servers: OpenApiServerLike[];
} {
  return {
    ...document,
    openapi: IM_OPENAPI_SPEC_VERSION,
    jsonSchemaDialect: IM_OPENAPI_JSON_SCHEMA_DIALECT,
    paths: normalizeDocumentPaths(document.paths, serverPath),
    info: {
      ...(document.info || {}),
      version: IM_OPENAPI_API_VERSION,
    },
    servers: [
      {
        url: normalizeServerPath(serverPath),
        description: 'Runtime API base path',
      },
    ],
  } as T & {
    openapi: string;
    jsonSchemaDialect: string;
    info: NonNullable<T['info']> & OpenApiInfoLike;
    servers: OpenApiServerLike[];
  };
}
