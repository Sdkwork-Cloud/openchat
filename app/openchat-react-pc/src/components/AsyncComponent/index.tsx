/**
 * 异步组件加载器
 *
 * 职责：处理动态导入的加载状态和错误
 */

import { Suspense, lazy, ComponentType, ReactNode } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

interface AsyncComponentOptions {
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  retryDelay?: number;
  maxRetries?: number;
}

/**
 * 加载中占位组件
 */
function DefaultLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
        <span className="text-[#94A3B8] text-sm">加载中...</span>
      </div>
    </div>
  );
}

/**
 * 错误降级组件
 */
function DefaultErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
      <div className="text-[#EF4444] mb-3">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <p className="text-[#94A3B8] mb-4">加载失败</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg transition-colors"
      >
        重试
      </button>
    </div>
  );
}

/**
 * 创建异步组件
 */
export function createAsyncComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: AsyncComponentOptions = {}
) {
  const { fallback, errorFallback, retryDelay = 1000, maxRetries = 3 } = options;

  const LazyComponent = lazy(() => {
    return new Promise((resolve, reject) => {
      let retries = 0;

      const load = () => {
        importFn()
          .then(resolve)
          .catch((error) => {
            retries++;
            if (retries <= maxRetries) {
              console.log(`[AsyncComponent] Retry ${retries}/${maxRetries}`);
              setTimeout(load, retryDelay * retries);
            } else {
              reject(error);
            }
          });
      };

      load();
    });
  });

  return function AsyncComponent(props: React.ComponentProps<T>) {
    return (
      <ErrorBoundary fallback={errorFallback}>
        <Suspense fallback={fallback || <DefaultLoadingFallback />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

/**
 * 预加载异步组件
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): Promise<{ default: T }> {
  return importFn();
}

/**
 * 路由级别的异步组件
 */
export function createRouteComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: AsyncComponentOptions = {}
) {
  const { fallback, errorFallback } = options;

  const LazyComponent = lazy(importFn);

  return function RouteComponent(props: React.ComponentProps<T>) {
    return (
      <ErrorBoundary
        fallback={
          errorFallback || (
            <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
              <DefaultErrorFallback onRetry={() => window.location.reload()} />
            </div>
          )
        }
      >
        <Suspense
          fallback={
            fallback || (
              <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
                <DefaultLoadingFallback />
              </div>
            )
          }
        >
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

export default createAsyncComponent;
