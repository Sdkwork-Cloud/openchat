export enum ToolCategory {
  UTILITY = "utility",
  DEVELOPER = "developer",
  DATA = "data",
  AI = "ai",
  CUSTOM = "custom",
}

export type AuthType = "none" | "api_key" | "bearer" | "basic" | "oauth2";

export interface AuthConfig {
  type: AuthType;
  apiKey?: string;
  token?: string;
  username?: string;
  password?: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ToolCategory;
  version: string;
  provider: string;
  isPublic: boolean;
  isBuiltin: boolean;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  auth: AuthConfig;
  headers?: Record<string, string>;
  timeout?: number;
  usageCount: number;
  successRate: number;
  avgResponseTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserTool {
  id: string;
  toolId: string;
  userId: string;
  credentials?: AuthConfig;
  config: Record<string, unknown>;
  enabled: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolMarketItem extends Tool {
  isEnabled?: boolean;
}

export interface ToolTestResult {
  success: boolean;
  responseTime: number;
  response?: unknown;
  error?: string;
}

export interface ToolCategoryInfo {
  id: string;
  name: string;
  icon: string;
}
