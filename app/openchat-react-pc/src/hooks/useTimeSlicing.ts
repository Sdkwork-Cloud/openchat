/**
 * 时间切片渲染 Hook
 * 
 * 职责：将大任务拆分为小任务，避免阻塞主线程
 * 应用：大数据渲染、复杂计算、批量更新
 * 
 * 技术：
 * - requestIdleCallback / scheduler
 * - React Concurrent Mode
 * - 任务优先级调度
 */

import { useCallback, useRef, useEffect, useState } from 'react';

// 任务优先级
export enum TaskPriority {
  IMMEDIATE = 1,    // 立即执行
  USER_BLOCKING = 2, // 用户阻塞
  NORMAL = 3,       // 正常
  LOW = 4,          // 低优先级
  IDLE = 5,         // 空闲时
}

// 任务配置
interface TaskConfig {
  priority: TaskPriority;
  deadline: number;  // 任务截止时间（ms）
  chunkSize: number; // 每帧处理数量
}

// 默认配置
const DEFAULT_CONFIG: TaskConfig = {
  priority: TaskPriority.NORMAL,
  deadline: 1000,
  chunkSize: 10,
};

/**
 * 调度器兼容性封装
 */
const scheduler = {
  schedule: (callback: IdleRequestCallback, options?: IdleRequestOptions): number => {
    if ('requestIdleCallback' in window) {
      return requestIdleCallback(callback, options);
    }
    // 降级到 setTimeout
    return window.setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      } as IdleDeadline);
    }, 1) as unknown as number;
  },

  cancel: (id: number): void => {
    if ('cancelIdleCallback' in window) {
      cancelIdleCallback(id);
    } else {
      clearTimeout(id);
    }
  },
};

/**
 * 使用时间切片
 */
export function useTimeSlicing<T>(config: Partial<TaskConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const scheduledTasks = useRef<Set<number>>(new Set());
  const isRunning = useRef(false);
  const [progress, setProgress] = useState(0);

  // 清理
  useEffect(() => {
    return () => {
      scheduledTasks.current.forEach((id) => scheduler.cancel(id));
      scheduledTasks.current.clear();
    };
  }, []);

  /**
   * 执行时间切片任务
   */
  const runTimeSliced = useCallback(
    async (
      items: T[],
      processor: (item: T, index: number) => void | Promise<void>,
      onProgress?: (completed: number, total: number) => void,
      onComplete?: () => void
    ): Promise<void> => {
      if (isRunning.current) {
        console.warn('[TimeSlicing] Task already running');
        return;
      }

      isRunning.current = true;
      setProgress(0);

      const total = items.length;
      let completed = 0;

      return new Promise((resolve) => {
        const processChunk = (deadline: IdleDeadline) => {
          const startTime = performance.now();
          const timeLimit = deadline.timeRemaining();

          // 处理一批数据
          while (
            completed < total &&
            (deadline.timeRemaining() > 0 || deadline.didTimeout)
          ) {
            const endIndex = Math.min(completed + finalConfig.chunkSize, total);

            for (let i = completed; i < endIndex; i++) {
              processor(items[i], i);
              completed++;
            }

            // 检查是否超时
            if (performance.now() - startTime > timeLimit && !deadline.didTimeout) {
              break;
            }
          }

          // 更新进度
          const currentProgress = Math.floor((completed / total) * 100);
          setProgress(currentProgress);
          onProgress?.(completed, total);

          if (completed < total) {
            // 继续下一帧
            const taskId = scheduler.schedule(processChunk, {
              timeout: finalConfig.deadline,
            });
            scheduledTasks.current.add(taskId);
          } else {
            // 完成
            isRunning.current = false;
            onComplete?.();
            resolve();
          }
        };

        const taskId = scheduler.schedule(processChunk);
        scheduledTasks.current.add(taskId);
      });
    },
    [finalConfig.chunkSize, finalConfig.deadline]
  );

  /**
   * 批量更新（React 状态）
   */
  const batchUpdate = useCallback(
    async <U extends unknown>(
      items: U[],
      updateFn: (batch: U[]) => void,
      onComplete?: () => void
    ): Promise<void> => {
      const batches: U[][] = [];
      
      // 分批
      for (let i = 0; i < items.length; i += finalConfig.chunkSize) {
        batches.push(items.slice(i, i + finalConfig.chunkSize));
      }

      let batchIndex = 0;

      return new Promise((resolve) => {
        const processBatch = (deadline: IdleDeadline) => {
          while (
            batchIndex < batches.length &&
            (deadline.timeRemaining() > 0 || deadline.didTimeout)
          ) {
            updateFn(batches[batchIndex]);
            batchIndex++;
            setProgress(Math.floor((batchIndex / batches.length) * 100));
          }

          if (batchIndex < batches.length) {
            const taskId = scheduler.schedule(processBatch, {
              timeout: finalConfig.deadline,
            });
            scheduledTasks.current.add(taskId);
          } else {
            onComplete?.();
            resolve();
          }
        };

        const taskId = scheduler.schedule(processBatch);
        scheduledTasks.current.add(taskId);
      });
    },
    [finalConfig.chunkSize, finalConfig.deadline]
  );

  /**
   * 取消所有任务
   */
  const cancel = useCallback(() => {
    scheduledTasks.current.forEach((id) => scheduler.cancel(id));
    scheduledTasks.current.clear();
    isRunning.current = false;
    setProgress(0);
  }, []);

  return {
    runTimeSliced,
    batchUpdate,
    cancel,
    progress,
    isRunning: () => isRunning.current,
  };
}

/**
 * 使用虚拟列表时间切片
 */
export function useVirtualListTimeSlicing<T>(
  items: T[],
  renderFn: (item: T, index: number) => React.ReactNode,
  config: Partial<TaskConfig> = {}
) {
  const [visibleItems, setVisibleItems] = useState<Array<{ item: T; index: number; node: React.ReactNode }>>([]);
  const { runTimeSliced, progress, cancel } = useTimeSlicing<T>(config);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // 首次渲染快速展示
    if (isFirstRender.current) {
      const initialItems = items.slice(0, 50).map((item, index) => ({
        item,
        index,
        node: renderFn(item, index),
      }));
      setVisibleItems(initialItems);
      isFirstRender.current = false;

      // 剩余项目时间切片渲染
      if (items.length > 50) {
        const remainingItems = items.slice(50);
        runTimeSliced(
          remainingItems,
          (item, index) => {
            setVisibleItems((prev) => [
              ...prev,
              {
                item,
                index: index + 50,
                node: renderFn(item, index + 50),
              },
            ]);
          },
          undefined,
          () => {
            console.log('[VirtualListTimeSlicing] Render complete');
          }
        );
      }
    }

    return () => cancel();
  }, [items, renderFn, runTimeSliced, cancel]);

  return { visibleItems, progress };
}

/**
 * 使用渐进式图片加载
 */
export function useProgressiveImageLoading(imageUrls: string[]) {
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const { runTimeSliced } = useTimeSlicing<string>({ chunkSize: 3 });

  useEffect(() => {
    runTimeSliced(
      imageUrls,
      async (url) => {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            setLoadedImages((prev) => [...prev, url]);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
        });
      },
      (completed, total) => {
        setProgress(Math.floor((completed / total) * 100));
      }
    );
  }, [imageUrls, runTimeSliced]);

  return { loadedImages, progress };
}

/**
 * 使用优先级调度
 */
export function usePriorityScheduler() {
  const taskQueue = useRef<Array<{ fn: () => void; priority: TaskPriority }>>([]);
  const isProcessing = useRef(false);

  const schedule = useCallback((fn: () => void, priority: TaskPriority = TaskPriority.NORMAL) => {
    taskQueue.current.push({ fn, priority });
    taskQueue.current.sort((a, b) => a.priority - b.priority);

    if (!isProcessing.current) {
      processQueue();
    }
  }, []);

  const processQueue = useCallback(() => {
    if (taskQueue.current.length === 0) {
      isProcessing.current = false;
      return;
    }

    isProcessing.current = true;
    const task = taskQueue.current.shift();

    if (task) {
      // 使用 MessageChannel 进行微任务调度
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        task.fn();
        processQueue();
      };
      channel.port2.postMessage(null);
    }
  }, []);

  return { schedule };
}

/**
 * 使用 React 18 Concurrent Features
 */
export function useConcurrentTransition() {
  const [isPending, startTransition] = useState(false);
  const [value, setValue] = useState<any>(null);

  const updateValue = useCallback((newValue: any) => {
    if ('startTransition' in React) {
      // @ts-ignore
      React.startTransition(() => {
        setValue(newValue);
      });
    } else {
      setValue(newValue);
    }
  }, []);

  return { value, updateValue, isPending };
}

import React from 'react';

export default useTimeSlicing;
