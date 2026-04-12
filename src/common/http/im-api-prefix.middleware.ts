import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import {
  IM_ADMIN_API_DOCS_ROUTE,
  IM_ADMIN_API_OPENAPI_JSON_ROUTE,
  IM_ADMIN_API_PREFIX,
  IM_APP_API_DOCS_ROUTE,
  IM_APP_API_OPENAPI_JSON_ROUTE,
  IM_APP_API_PREFIX,
} from './im-api-surface.constants';

const APP_PREFIX_PATH = `/${IM_APP_API_PREFIX}`;
const ADMIN_PREFIX_PATH = `/${IM_ADMIN_API_PREFIX}`;
const DOCS_PREFIXES = [
  `/${IM_APP_API_DOCS_ROUTE}`,
  `/${IM_ADMIN_API_DOCS_ROUTE}`,
];
const OPENAPI_PATHS = new Set([
  `/${IM_APP_API_OPENAPI_JSON_ROUTE}`,
  `/${IM_ADMIN_API_OPENAPI_JSON_ROUTE}`,
]);

function isDocsPath(pathname: string): boolean {
  return DOCS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function stripPrefix(pathname: string, prefix: string): string {
  if (pathname === prefix) {
    return '/';
  }

  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length);
  }

  return pathname;
}

export function normalizeImApiPath(input: string): string {
  const [pathname, query = ''] = input.split('?');

  if (!pathname || isDocsPath(pathname) || OPENAPI_PATHS.has(pathname)) {
    return input;
  }

  const normalizedPath = stripPrefix(
    stripPrefix(pathname, ADMIN_PREFIX_PATH),
    APP_PREFIX_PATH,
  );

  return query ? `${normalizedPath}?${query}` : normalizedPath;
}

@Injectable()
export class ImApiPrefixMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    req.url = normalizeImApiPath(req.url);
    next();
  }
}
