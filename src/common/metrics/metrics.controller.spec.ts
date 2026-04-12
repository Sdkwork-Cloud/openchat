import 'reflect-metadata';
import { MetricsController } from './metrics.controller';
import { ALLOW_ANONYMOUS_KEY } from '../auth/guards/multi-auth.guard';

describe('MetricsController', () => {
  it('marks the prometheus endpoint as anonymously accessible', () => {
    const metadata = Reflect.getMetadata(
      ALLOW_ANONYMOUS_KEY,
      MetricsController.prototype.getMetrics,
    );

    expect(metadata).toBe(true);
  });
});
