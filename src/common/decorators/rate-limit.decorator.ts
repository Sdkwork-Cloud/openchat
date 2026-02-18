import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitConfig {
  points: number;
  duration: number;
  keyPrefix?: string;
  errorMessage?: string;
  skipIf?: (request: any) => boolean;
}

export function RateLimit(config: RateLimitConfig): MethodDecorator {
  return SetMetadata(RATE_LIMIT_KEY, config);
}

export function RateLimitDefault(): MethodDecorator {
  return RateLimit({
    points: 100,
    duration: 60,
  });
}

export function RateLimitStrict(): MethodDecorator {
  return RateLimit({
    points: 10,
    duration: 60,
  });
}

export function RateLimitRelaxed(): MethodDecorator {
  return RateLimit({
    points: 300,
    duration: 60,
  });
}

export function RateLimitAuth(): MethodDecorator {
  return RateLimit({
    points: 5,
    duration: 60,
    keyPrefix: 'auth',
    errorMessage: 'Too many authentication attempts, please try again later',
  });
}

export function RateLimitMessage(): MethodDecorator {
  return RateLimit({
    points: 30,
    duration: 60,
    keyPrefix: 'message',
    errorMessage: 'Message rate limit exceeded',
  });
}

export function RateLimitApi(): MethodDecorator {
  return RateLimit({
    points: 60,
    duration: 60,
    keyPrefix: 'api',
  });
}

export const RateLimitPresets = {
  DEFAULT: { points: 100, duration: 60 },
  STRICT: { points: 10, duration: 60 },
  RELAXED: { points: 300, duration: 60 },
  AUTH: { points: 5, duration: 60 },
  MESSAGE: { points: 30, duration: 60 },
  API: { points: 60, duration: 60 },
  UPLOAD: { points: 10, duration: 300 },
  SEARCH: { points: 20, duration: 60 },
};
