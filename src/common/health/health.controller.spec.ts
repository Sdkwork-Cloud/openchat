import { ALLOW_ANONYMOUS_KEY } from '../auth/guards/multi-auth.guard';
import { HealthController } from './health.controller';

describe('HealthController metadata', () => {
  const prototype = HealthController.prototype;

  it.each([
    'checkHealth',
    'checkDetailedHealth',
    'checkReady',
    'checkLive',
  ])('marks %s as anonymously accessible', (methodName) => {
    const handler = prototype[methodName as keyof HealthController] as unknown as object;
    expect(Reflect.getMetadata(ALLOW_ANONYMOUS_KEY, handler)).toBe(true);
  });
});
