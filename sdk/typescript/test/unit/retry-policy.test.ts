/**
 * 重试策略单元测试
 * 测试重试策略的核心功能
 */

import {
  RetryPolicy,
  ExponentialBackoff,
  FixedIntervalBackoff,
  LinearBackoff,
  RetryPolicyEvent,
  createRetryPolicy,
  createNetworkRetryPolicy,
} from '../../src/core/retry-policy';

describe('RetryPolicy', () => {
  describe('指数退避策略', () => {
    test('应该正确计算延迟时间', () => {
      const backoff = new ExponentialBackoff({
        initialDelay: 1000,
        multiplier: 2,
        maxDelay: 10000,
        jitter: false,
      });

      expect(backoff.getDelay({ attempt: 1, maxRetries: 3, startTime: Date.now() })).toBe(1000);
      expect(backoff.getDelay({ attempt: 2, maxRetries: 3, startTime: Date.now() })).toBe(2000);
      expect(backoff.getDelay({ attempt: 3, maxRetries: 3, startTime: Date.now() })).toBe(4000);
    });

    test('应该不超过最大延迟', () => {
      const backoff = new ExponentialBackoff({
        initialDelay: 1000,
        multiplier: 2,
        maxDelay: 5000,
        jitter: false,
      });

      expect(backoff.getDelay({ attempt: 10, maxRetries: 10, startTime: Date.now() })).toBe(5000);
    });

    test('应该支持随机抖动', () => {
      const backoff = new ExponentialBackoff({
        initialDelay: 1000,
        multiplier: 2,
        jitter: true,
      });

      const delay = backoff.getDelay({ attempt: 1, maxRetries: 3, startTime: Date.now() });
      expect(delay).toBeGreaterThanOrEqual(750);
      expect(delay).toBeLessThanOrEqual(1250);
    });
  });

  describe('固定间隔退避策略', () => {
    test('应该返回固定延迟', () => {
      const backoff = new FixedIntervalBackoff(1000);

      expect(backoff.getDelay()).toBe(1000);
      expect(backoff.getDelay()).toBe(1000);
      expect(backoff.getDelay()).toBe(1000);
    });
  });

  describe('线性退避策略', () => {
    test('应该正确计算线性增长延迟', () => {
      const backoff = new LinearBackoff({
        initialDelay: 1000,
        increment: 500,
        maxDelay: 5000,
      });

      expect(backoff.getDelay({ attempt: 1, maxRetries: 3, startTime: Date.now() })).toBe(1000);
      expect(backoff.getDelay({ attempt: 2, maxRetries: 3, startTime: Date.now() })).toBe(1500);
      expect(backoff.getDelay({ attempt: 3, maxRetries: 3, startTime: Date.now() })).toBe(2000);
    });

    test('应该不超过最大延迟', () => {
      const backoff = new LinearBackoff({
        initialDelay: 1000,
        increment: 1000,
        maxDelay: 3000,
      });

      expect(backoff.getDelay({ attempt: 10, maxRetries: 10, startTime: Date.now() })).toBe(3000);
    });
  });

  describe('重试策略执行', () => {
    test('成功操作应该直接返回结果', async () => {
      const policy = createRetryPolicy({ maxRetries: 3 });
      const result = await policy.execute(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    test('失败操作应该重试指定次数', async () => {
      const policy = createRetryPolicy({
        maxRetries: 3,
        backoff: new FixedIntervalBackoff(10),
      });

      let attempts = 0;
      const operation = () => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Failed'));
        }
        return Promise.resolve('success');
      };

      const result = await policy.execute(operation);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    test('达到最大重试次数应该抛出错误', async () => {
      const policy = createRetryPolicy({
        maxRetries: 2,
        backoff: new FixedIntervalBackoff(10),
      });

      let attempts = 0;
      const operation = () => {
        attempts++;
        return Promise.reject(new Error('Always fails'));
      };

      await expect(policy.execute(operation)).rejects.toThrow('Always fails');
      expect(attempts).toBe(2);
    });

    test('shouldRetry函数应该控制是否重试', async () => {
      const policy = new RetryPolicy({
        maxRetries: 3,
        backoff: new FixedIntervalBackoff(10),
        shouldRetry: (error) => error.message === 'Retryable',
      });

      let attempts = 0;
      const operation = () => {
        attempts++;
        return Promise.reject(new Error('NonRetryable'));
      };

      await expect(policy.execute(operation)).rejects.toThrow('NonRetryable');
      expect(attempts).toBe(1);
    });

    test('禁用时应该不重试', async () => {
      const policy = createRetryPolicy({
        maxRetries: 3,
        enabled: false,
      });

      let attempts = 0;
      const operation = () => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Failed'));
        }
        return Promise.resolve('success');
      };

      await expect(policy.execute(operation)).rejects.toThrow('Failed');
      expect(attempts).toBe(1);
    });
  });

  describe('事件测试', () => {
    test('应该触发成功事件', async () => {
      const policy = createRetryPolicy();
      const successHandler = jest.fn();
      policy.on(RetryPolicyEvent.SUCCESS, successHandler);

      await policy.execute(() => Promise.resolve('success'));

      expect(successHandler).toHaveBeenCalled();
    });

    test('应该触发最大重试次数事件', async () => {
      const policy = createRetryPolicy({
        maxRetries: 1,
        backoff: new FixedIntervalBackoff(10),
      });
      const maxRetriesHandler = jest.fn();
      policy.on(RetryPolicyEvent.MAX_RETRIES_EXCEEDED, maxRetriesHandler);

      const operation = () => Promise.reject(new Error('Failed'));
      await expect(policy.execute(operation)).rejects.toThrow();

      expect(maxRetriesHandler).toHaveBeenCalled();
    });
  });

  describe('工厂函数测试', () => {
    test('createRetryPolicy应该创建默认策略', () => {
      const policy = createRetryPolicy();
      expect(policy).toBeInstanceOf(RetryPolicy);
    });

    test('createNetworkRetryPolicy应该创建网络重试策略', () => {
      const policy = createNetworkRetryPolicy(5);
      expect(policy).toBeInstanceOf(RetryPolicy);
    });
  });
});
