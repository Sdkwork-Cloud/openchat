
import React, { useState, useEffect } from 'react';
import { navigate, navigateBack } from '../../../router';
import { CreationService, CreationItem } from '../services/CreationService';
import { CreationCard } from '../components/CreationCard';
import { SearchInput } from '../../../components/SearchInput/SearchInput';
import { useDebounce } from '../../../hooks/useDebounce';
import { Empty } from '../../../components/Empty/Empty';

export const CreationSearchPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 300);
    const [results, setResults] = useState<CreationItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const search = async () => {
            if (!debouncedQuery.trim()) {
                setResults([]);
                return;
            }
            setIsSearching(true);
            const res = await CreationService.search(debouncedQuery);
            if (res.success && res.data) {
                setResults(res.data);
            }
            setIsSearching(false);
        };
        search();
    }, [debouncedQuery]);

    const handleCardClick = (item: CreationItem) => {
        navigate('/creation/detail', { id: item.id });
    };

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <SearchInput 
                value={query}
                onChange={setQuery}
                onCancel={() => navigateBack()}
                placeholder="搜索作品、风格、作者"
            />

            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {isSearching && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        搜索中...
                    </div>
                )}

                {!isSearching && results.length > 0 && (
                    <div style={{ columnCount: 2, columnGap: '4px' }}>
                        {results.map(item => (
                            <CreationCard key={item.id} item={item} onClick={() => handleCardClick(item)} />
                        ))}
                    </div>
                )}

                {!isSearching && debouncedQuery && results.length === 0 && (
                    <Empty icon="🔍" text="未找到相关作品" />
                )}
                
                {!debouncedQuery && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        输入关键词搜索灵感
                    </div>
                )}
            </div>
        </div>
    );
};
