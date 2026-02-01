/**
 * TanStack Query Provider
 * 
 * 职责：提供全局数据获取和缓存能力
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 全局查询配置
      staleTime: 5 * 60 * 1000, // 5分钟内数据视为新鲜
      gcTime: 10 * 60 * 1000, // 10分钟后清理缓存
      retry: 3, // 失败重试3次
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // 窗口聚焦时不自动刷新
      refetchOnReconnect: true, // 网络恢复时刷新
    },
    mutations: {
      // 全局 mutation 配置
      retry: 1,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query 调试工具 - 默认关闭 */}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}

// 导出 queryClient 供外部使用
export { queryClient };
