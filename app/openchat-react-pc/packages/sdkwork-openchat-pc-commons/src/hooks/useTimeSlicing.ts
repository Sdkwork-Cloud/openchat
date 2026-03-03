/**
 * 鏃堕棿鍒囩墖娓叉煋 Hook
 * 
 * 鑱岃矗锛氬皢澶т换鍔℃媶鍒嗕负灏忎换鍔★紝閬垮厤闃诲涓荤嚎绋? * 搴旂敤锛氬ぇ鏁版嵁娓叉煋銆佸鏉傝绠椼€佹壒閲忔洿鏂? * 
 * 鎶€鏈細
 * - requestIdleCallback / scheduler
 * - React Concurrent Mode
 * - 浠诲姟浼樺厛绾ц皟搴? */

import { useCallback, useRef, useEffect, useState } from 'react';

// 浠诲姟浼樺厛绾?export enum TaskPriority {
  IMMEDIATE = 1,    // 绔嬪嵆鎵ц
  USER_BLOCKING = 2, // 鐢ㄦ埛闃诲
  NORMAL = 3,       // 姝ｅ父
  LOW = 4,          // 浣庝紭鍏堢骇
  IDLE = 5,         // 绌洪棽鏃?}

// 浠诲姟閰嶇疆
interface TaskConfig {
  priority: TaskPriority;
  deadline: number;  // 浠诲姟鎴鏃堕棿锛坢s锛?  chunkSize: number; // 姣忓抚澶勭悊鏁伴噺
}

// 榛樿閰嶇疆
const DEFAULT_CONFIG: TaskConfig = {
  priority: TaskPriority.NORMAL,
  deadline: 1000,
  chunkSize: 10,
};

/**
 * 璋冨害鍣ㄥ吋瀹规€у皝瑁? */
const scheduler = {
  schedule: (callback: IdleRequestCallback, options?: IdleRequestOptions): number => {
    if ('requestIdleCallback' in window) {
      return requestIdleCallback(callback, options);
    }
    // 闄嶇骇鍒?setTimeout
    return (window as any).setTimeout(() => {
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
 * 浣跨敤鏃堕棿鍒囩墖
 */
export function useTimeSlicing<T>(config: Partial<TaskConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const scheduledTasks = useRef<Set<number>>(new Set());
  const isRunning = useRef(false);
  const [progress, setProgress] = useState(0);

  // 娓呯悊
  useEffect(() => {
    return () => {
      scheduledTasks.current.forEach((id) => scheduler.cancel(id));
      scheduledTasks.current.clear();
    };
  }, []);

  /**
   * 鎵ц鏃堕棿鍒囩墖浠诲姟
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

          // 澶勭悊涓€鎵规暟鎹?          while (
            completed < total &&
            (deadline.timeRemaining() > 0 || deadline.didTimeout)
          ) {
            const endIndex = Math.min(completed + finalConfig.chunkSize, total);

            for (let i = completed; i < endIndex; i++) {
              processor(items[i], i);
              completed++;
            }

            // 妫€鏌ユ槸鍚﹁秴鏃?            if (performance.now() - startTime > timeLimit && !deadline.didTimeout) {
              break;
            }
          }

          // 鏇存柊杩涘害
          const currentProgress = Math.floor((completed / total) * 100);
          setProgress(currentProgress);
          onProgress?.(completed, total);

          if (completed < total) {
            // 缁х画涓嬩竴甯?            const taskId = scheduler.schedule(processChunk, {
              timeout: finalConfig.deadline,
            });
            scheduledTasks.current.add(taskId);
          } else {
            // 瀹屾垚
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
   * 鎵归噺鏇存柊锛圧eact 鐘舵€侊級
   */
  const batchUpdate = useCallback(
    async <U extends unknown>(
      items: U[],
      updateFn: (batch: U[]) => void,
      onComplete?: () => void
    ): Promise<void> => {
      const batches: U[][] = [];
      
      // 鍒嗘壒
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
   * 鍙栨秷鎵€鏈変换鍔?   */
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
 * 浣跨敤铏氭嫙鍒楄〃鏃堕棿鍒囩墖
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
    // 棣栨娓叉煋蹇€熷睍绀?    if (isFirstRender.current) {
      const initialItems = items.slice(0, 50).map((item, index) => ({
        item,
        index,
        node: renderFn(item, index),
      }));
      setVisibleItems(initialItems);
      isFirstRender.current = false;

      // 鍓╀綑椤圭洰鏃堕棿鍒囩墖娓叉煋
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
 * 浣跨敤娓愯繘寮忓浘鐗囧姞杞? */
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
 * 浣跨敤浼樺厛绾ц皟搴? */
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
      // 浣跨敤 MessageChannel 杩涜寰换鍔¤皟搴?      const channel = new MessageChannel();
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
 * 浣跨敤 React 18 Concurrent Features
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

