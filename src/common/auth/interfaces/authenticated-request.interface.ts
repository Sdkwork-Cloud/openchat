import { Request } from 'express';

export interface AuthContext {
  userId: string;
  deviceId?: string;
  botId?: string;
  authStrategy?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}

export interface AuthenticatedRequest extends Request {
  auth: AuthContext;
}
