export enum BotStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum BotScope {
  MESSAGE_READ = 'message:read',
  MESSAGE_WRITE = 'message:write',
  CONVERSATION_READ = 'conversation:read',
  USER_READ = 'user:read',
  GROUP_READ = 'group:read',
  GROUP_WRITE = 'group:write',
}

export interface WebhookRetryPolicy {
  maxRetries: number;
  backoffType: 'fixed' | 'exponential';
  initialDelay: number;
  maxDelay: number;
}

export interface WebhookFilters {
  conversations?: string[];
  users?: string[];
  groups?: string[];
}

export interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  filters?: WebhookFilters;
  retryPolicy: WebhookRetryPolicy;
  timeout: number;
}

export interface BotResponse {
  id: string;
  name: string;
  username: string;
  description?: string;
  avatar?: string;
  homepage?: string;
  developerName?: string;
  developerEmail?: string;
  intents?: number[];
  scopes?: BotScope[];
  status: BotStatus;
  createdBy: string;
  webhook?: WebhookConfig;
  createdAt: number;
  updatedAt: number;
}

export interface CreateBotParams {
  name: string;
  username: string;
  description?: string;
  avatar?: string;
  homepage?: string;
  developerName?: string;
  developerEmail?: string;
  intents?: number[];
  scopes?: BotScope[];
  createdBy: string;
}

export interface UpdateBotParams {
  name?: string;
  description?: string;
  avatar?: string;
  homepage?: string;
  developerName?: string;
  developerEmail?: string;
  intents?: number[];
  scopes?: BotScope[];
  status?: BotStatus;
}

export interface SetWebhookParams {
  url: string;
  events: string[];
  filters?: WebhookFilters;
  retryPolicy?: Partial<WebhookRetryPolicy>;
  timeout?: number;
}

export interface BotListQuery {
  createdBy?: string;
  status?: BotStatus;
  page?: number;
  limit?: number;
}

export interface BotListResponse {
  bots: BotResponse[];
  total: number;
}
