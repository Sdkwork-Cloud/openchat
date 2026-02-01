/**
 * 认证策略接口
 * 支持多种认证方式的可插拔设计
 */

import { Request } from 'express';

/**
 * 认证结果
 */
export interface AuthResult {
  success: boolean;
  userId?: string;
  botId?: string;
  scopes?: string[];
  metadata?: Record<string, any>;
  error?: string;
}

/**
 * 认证策略接口
 * 所有认证方式必须实现此接口
 */
export interface AuthStrategy {
  /**
   * 策略名称
   */
  readonly name: string;

  /**
   * 策略优先级（数字越小优先级越高）
   */
  readonly priority: number;

  /**
   * 是否支持该请求
   */
  canHandle(request: Request): boolean;

  /**
   * 执行认证
   */
  authenticate(request: Request): Promise<AuthResult>;
}

/**
 * Token 提取器接口
 */
export interface TokenExtractor {
  /**
   * 从请求中提取 Token
   */
  extract(request: Request): string | undefined;
}

/**
 * JWT 载荷
 */
export interface JWTPayload {
  sub: string;                   // 用户/ Bot ID
  type: 'user' | 'bot' | 'app';
  scopes?: string[];
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

/**
 * API Key 载荷
 */
export interface APIKeyPayload {
  keyId: string;
  appId?: string;
  scopes: string[];
  permissions: string[];
}

/**
 * OAuth Token 载荷
 */
export interface OAuthTokenPayload {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope: string;
  userId?: string;
  botId?: string;
}
