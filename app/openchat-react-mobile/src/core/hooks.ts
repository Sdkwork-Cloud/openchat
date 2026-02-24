
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Result } from './types';
import { ViewStatus } from '../components/StateView/StateView';

export interface UseLiveQueryOptions<T> {
    deps?: any[];
    isEmpty?: (data: T) => boolean;
    skip?: boolean;
}

/**
 * 工业级数据订阅 Hook
 * 解决了匿名函数作为参数时导致的无限循环问题
 */
export function useLiveQuery<T>(
    service: { subscribe: (cb: any) => () => void },
    queryFn: () => Promise<Result<T>>,
    options: UseLiveQueryOptions<T> = {}
) {
    const { deps = [], isEmpty, skip = false } = options;
    
    const [data, setData] = useState<T | undefined>(undefined);
    const [loading, setLoading] = useState(!skip);
    const [error, setError] = useState<string | undefined>(undefined);
    
    // 关键：锁定查询函数引用
    const queryFnRef = useRef(queryFn);
    queryFnRef.current = queryFn;

    const isMounted = useRef(true);
    const isFirstLoad = useRef(true);

    const fetchData = useCallback(async (isSilent = false) => {
        if (skip) return;
        
        // 只有非静默且是首次加载时，才将 loading 设为 true 触发骨架屏
        if (!isSilent || isFirstLoad.current) {
            setLoading(true);
        }

        try {
            const res = await queryFnRef.current();
            if (isMounted.current) {
                if (res.success) {
                    setData(res.data);
                    setError(undefined);
                    isFirstLoad.current = false;
                } else {
                    setError(res.message || 'Fetch failed');
                }
            }
        } catch (e: any) {
            if (isMounted.current) {
                setError(e.message || 'Unknown error');
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, [skip, ...deps]); 

    useEffect(() => {
        isMounted.current = true;
        fetchData();

        // 订阅服务层的数据变更
        const unsubscribe = service.subscribe(() => {
            // 数据变动时触发静默更新，不干扰当前 UI 的渲染状态，实现无缝同步
            fetchData(true);
        });

        return () => {
            isMounted.current = false;
            unsubscribe();
        };
    }, [fetchData, service]);

    const viewStatus: ViewStatus = useMemo(() => {
        // 如果已经有数据，即使在后台静默刷新，也保持 success 状态，防止闪烁
        if (data !== undefined && !isFirstLoad.current && !error) return 'success';
        if (loading) return 'loading';
        if (error) return 'error';
        
        const emptyCheck = isEmpty 
            ? isEmpty(data as T)
            : (Array.isArray(data) && data.length === 0) || (!data);

        if (emptyCheck) return 'empty';
        return 'success';
    }, [loading, error, data, isEmpty]);

    return { data, loading, error, refresh: () => fetchData(false), viewStatus };
}
