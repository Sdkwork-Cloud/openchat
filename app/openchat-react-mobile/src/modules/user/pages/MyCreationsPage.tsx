
import React, { useState } from 'react';
import { Navbar } from '../../../components/Navbar/Navbar';
import { navigate, navigateBack } from '../../../router';
import { CreationService, CreationItem } from '../../creation/services/CreationService';
import { Tabs } from '../../../components/Tabs/Tabs';
import { CreationCard } from '../../creation/components/CreationCard';
import { Toast } from '../../../components/Toast';
import { ChatSelectionBar } from '../../chat/components/ChatSelectionBar';
import { useLiveQuery } from '../../../core/hooks';
import { StateView } from '../../../components/StateView/StateView';

const TABS = [
    { id: '全部', label: '全部' },
    { id: '图片', label: '图片' },
    { id: '视频', label: '视频' },
    { id: '音乐', label: '音乐' },
    { id: '文本', label: '文本' }
];

export const MyCreationsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('全部');
    
    // Live Query
    const { data: creations = [], viewStatus, refresh } = useLiveQuery(
        CreationService,
        () => CreationService.getMyCreations(activeTab),
        { deps: [activeTab] }
    );
    
    // Management State
    const [isManageMode, setIsManageMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleManageToggle = () => {
        if (isManageMode) {
            setIsManageMode(false);
            setSelectedIds(new Set());
        } else {
            setIsManageMode(true);
        }
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`确定删除选中的 ${selectedIds.size} 个作品吗？`)) {
            Toast.loading('正在删除...');
            // Loop delete
            for (const id of selectedIds) {
                await CreationService.deleteById(id);
            }
            // No need to manually call loadData(), useLiveQuery handles it via event bus
            setIsManageMode(false);
            setSelectedIds(new Set());
            Toast.success('删除成功');
        }
    };

    const handleForward = () => {
        Toast.info('转发功能开发中');
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Navbar 
                title={isManageMode ? `已选择 ${selectedIds.size} 项` : "我的作品"}
                onBack={isManageMode ? handleManageToggle : () => navigateBack('/me')}
                rightElement={
                    <div 
                        onClick={handleManageToggle} 
                        style={{ padding: '0 12px', fontSize: '15px', color: 'var(--text-primary)', cursor: 'pointer' }}
                    >
                        {isManageMode ? '完成' : '管理'}
                    </div>
                }
            />
            
            <Tabs 
                items={TABS} 
                activeId={activeTab} 
                onChange={setActiveTab} 
            />

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <StateView 
                    status={viewStatus} 
                    onRetry={refresh}
                    emptyText="暂无相关作品"
                    emptyIcon="🎨"
                    style={{ paddingBottom: isManageMode ? '70px' : '20px' }}
                >
                    <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        {creations.map((item: CreationItem) => (
                            <CreationCard 
                                key={item.id} 
                                item={item} 
                                onClick={() => navigate('/creation/detail', { id: item.id })}
                                selectable={isManageMode}
                                selected={selectedIds.has(item.id)}
                                onToggle={() => toggleSelection(item.id)}
                            />
                        ))}
                    </div>
                </StateView>
            </div>

            {isManageMode && (
                <ChatSelectionBar 
                    selectedCount={selectedIds.size}
                    onDelete={handleDelete}
                    onForward={handleForward}
                />
            )}
        </div>
    );
};
