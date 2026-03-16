import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

interface CurrentApiKeyOptions {
  optional?: boolean;
}

export interface ApiKeyRequestContext {
  user?: Record<string, unknown>;
  auth?: {
    metadata?: Record<string, unknown>;
  };
}

export function resolveCurrentApiKey(
  request: ApiKeyRequestContext,
  options?: CurrentApiKeyOptions,
): string | undefined {
  const userApiKey = request.user?.apiKey;
  if (typeof userApiKey === 'string' && userApiKey.length > 0) {
    return userApiKey;
  }

  const metadataApiKey = request.auth?.metadata?.apiKey;
  if (typeof metadataApiKey === 'string' && metadataApiKey.length > 0) {
    return metadataApiKey;
  }

  if (options?.optional) {
    return undefined;
  }

  throw new UnauthorizedException('API key is required');
}

/**
 * 读取当前认证上下文中的 API Key。
 * 默认要求必须存在；可通过 { optional: true } 允许缺省（匿名可选鉴权场景）。
 */
export const CurrentApiKey = createParamDecorator(
  (data: CurrentApiKeyOptions | undefined, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<ApiKeyRequestContext>();
    return resolveCurrentApiKey(request, data);
  },
);
