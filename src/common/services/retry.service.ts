import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  onSuccess?: (attempt: number, result: any) => void;
  onFailure?: (error: Error, attempts: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastStateChange?: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 10000,
  resetTimeout: 60000,
};

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();

  constructor(private readonly configService: ConfigService) {}

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    options?: Partial<RetryOptions>,
  ): Promise<RetryResult<T>> {
    const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error | undefined;
    let totalDelay = 0;
    let attempt = 0;

    for (; attempt <= opts.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt, opts);
          totalDelay += delay;

          if (opts.onRetry && lastError) {
            opts.onRetry(attempt, lastError, delay);
          }

          this.logger.debug(
            `Retrying ${operationName} (attempt ${attempt}/${opts.maxRetries}) after ${delay}ms`,
          );

          await this.sleep(delay);
        }

        const result = await operation();

        if (opts.onSuccess) {
          opts.onSuccess(attempt, result);
        }

        return {
          success: true,
          result,
          attempts: attempt + 1,
          totalDelay,
        };
      } catch (error: any) {
        lastError = error;

        if (!this.isRetryable(error, opts)) {
          this.logger.warn(`Non-retryable error in ${operationName}: ${error.message}`);
          break;
        }

        this.logger.warn(
          `Attempt ${attempt + 1} failed for ${operationName}: ${error.message}`,
        );

        if (attempt === opts.maxRetries) {
          this.logger.error(`All attempts failed for ${operationName}:`, error);
        }
      }
    }

    if (opts.onFailure && lastError) {
      opts.onFailure(lastError, attempt);
    }

    return {
      success: false,
      error: lastError,
      attempts: attempt,
      totalDelay,
    };
  }

  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitName: string,
    retryOptions?: Partial<RetryOptions>,
    circuitOptions?: Partial<CircuitBreakerOptions>,
  ): Promise<RetryResult<T>> {
    const circuitState = this.getCircuitState(circuitName);
    const circuitOpts = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...circuitOptions };

    if (circuitState.status === 'open') {
      const timeSinceFailure = Date.now() - (circuitState.lastFailureTime || 0);

      if (timeSinceFailure < circuitOpts.resetTimeout) {
        this.logger.warn(`Circuit breaker ${circuitName} is open, rejecting request`);
        return {
          success: false,
          error: new Error(`Circuit breaker ${circuitName} is open`),
          attempts: 0,
          totalDelay: 0,
        };
      }

      this.updateCircuitState(circuitName, 'half-open');
      this.logger.log(`Circuit breaker ${circuitName} moved to half-open state`);
    }

    const result = await this.executeWithRetry(
      operation,
      circuitName,
      retryOptions,
    );

    if (result.success) {
      this.recordSuccess(circuitName, circuitOpts);
    } else {
      this.recordFailure(circuitName, circuitOpts);
    }

    return result;
  }

  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
    operationName: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation ${operationName} timed out after ${timeout}ms`));
      }, timeout);

      operation()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    operationName: string,
    retryOptions?: Partial<RetryOptions>,
  ): Promise<T> {
    const result = await this.executeWithRetry(operation, operationName, retryOptions);

    if (result.success) {
      return result.result!;
    }

    this.logger.warn(`Primary operation ${operationName} failed, using fallback`);
    return fallback();
  }

  private calculateDelay(attempt: number, options: RetryOptions): number {
    let delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);

    if (options.maxDelay) {
      delay = Math.min(delay, options.maxDelay);
    }

    if (options.jitter) {
      delay = delay + Math.random() * 1000;
    }

    return Math.round(delay);
  }

  private isRetryable(error: Error, options: RetryOptions): boolean {
    if (!options.retryableErrors || options.retryableErrors.length === 0) {
      return true;
    }

    return options.retryableErrors.some(
      (errorPattern) =>
        error.message.includes(errorPattern) ||
        error.constructor.name.includes(errorPattern),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getCircuitState(circuitName: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(circuitName)) {
      this.circuitBreakers.set(circuitName, {
        status: 'closed',
        failureCount: 0,
        successCount: 0,
      });
    }
    return this.circuitBreakers.get(circuitName)!;
  }

  private updateCircuitState(
    circuitName: string,
    status: CircuitBreakerState['status'],
  ): void {
    const state = this.getCircuitState(circuitName);
    state.status = status;
    state.lastStateChange = Date.now();

    if (status === 'closed') {
      state.failureCount = 0;
      state.successCount = 0;
    }
  }

  private recordSuccess(
    circuitName: string,
    options: CircuitBreakerOptions,
  ): void {
    const state = this.getCircuitState(circuitName);
    state.successCount++;

    if (state.status === 'half-open') {
      if (state.successCount >= options.successThreshold) {
        this.updateCircuitState(circuitName, 'closed');
        this.logger.log(`Circuit breaker ${circuitName} closed after ${state.successCount} successes`);
      }
    } else {
      state.failureCount = 0;
    }
  }

  private recordFailure(
    circuitName: string,
    options: CircuitBreakerOptions,
  ): void {
    const state = this.getCircuitState(circuitName);
    state.failureCount++;
    state.lastFailureTime = Date.now();

    if (state.status === 'half-open') {
      this.updateCircuitState(circuitName, 'open');
      this.logger.warn(`Circuit breaker ${circuitName} reopened after failure in half-open state`);
    } else if (state.failureCount >= options.failureThreshold) {
      this.updateCircuitState(circuitName, 'open');
      this.logger.warn(
        `Circuit breaker ${circuitName} opened after ${state.failureCount} failures`,
      );
    }
  }

  getCircuitBreakerStats(circuitName: string): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(circuitName);
  }

  resetCircuitBreaker(circuitName: string): void {
    this.circuitBreakers.delete(circuitName);
    this.logger.log(`Circuit breaker ${circuitName} has been reset`);
  }

  resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
    this.logger.log('All circuit breakers have been reset');
  }
}

export function WithRetry(options?: Partial<RetryOptions>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const logger = new Logger(target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      const retryService = new RetryService(this.configService);
      const operationName = `${target.constructor.name}.${propertyKey}`;

      const result = await retryService.executeWithRetry(
        () => originalMethod.apply(this, args),
        operationName,
        options,
      );

      if (!result.success) {
        throw result.error;
      }

      return result.result;
    };

    return descriptor;
  };
}
