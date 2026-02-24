
import React, { useState } from 'react';
import { navigate, navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { NotificationService, Notification } from '../services/NotificationService';
import { Tabs } from '../../../components/Tabs/Tabs';
import { SwipeableRow } from '../../../components/SwipeableRow/SwipeableRow';
import { Toast } from '../../../components/Toast';
import { DateUtils } from '../../../utils/date';
import { useLiveQuery } from '../../../core/hooks';
import { StateView } from '../../../components/StateView/StateView';

const TABS = [
    { id: 'all', label: '全部' },
    { id: 'system', label: '系统' },
    { id: 'social', label: '互动' },
    { id: 'order', label: '交易' },
];

const NotificationItem: React.FC<{ item: Notification, onClick: () => void, onDelete: () => void }> = ({ item, onClick, onDelete }) => {
    
    const getIconBg = (type: string) => {
        switch(type) {
            case 'system': return '#2979FF';
            case 'social': return '#FF9C6E';
            case 'order': return '#07c160';
            case 'promotion': return '#fa5151';
            default: return '#999';
        }
    };

    return (
        <SwipeableRow
            rightActions={[{ text: '删除', color: '#fa5151', onClick: onDelete }]}
            onBodyClick={onClick}
        >
            <div style={{ 
                padding: '16px', background: item.isRead ? 'var(--bg-body)' : 'var(--bg-card)', 
                display: 'flex', gap: '16px', borderBottom: '0.5px solid var(--border-color)',
                transition: 'background 0.2s'
            }}>
                <div style={{ position: 'relative' }}>
                    <div style={{ 
                        width: '48px', height: '48px', borderRadius: '50%', 
                        background: getIconBg(item.type), color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px', flexShrink: 0
                    }}>
                        {item.icon || '🔔'}
                    </div>
                    {!item.isRead && (
                        <div style={{ 
                            position: 'absolute', top: 0, right: 0, 
                            width: '10px', height: '10px', background: '#fa5151', 
                            borderRadius: '50%', border: '2px solid var(--bg-card)' 
                        }} />
                    )}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{DateUtils.formatTimeAgo(item.createTime)}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.content}
                    </div>
                </div>
            </div>
        </SwipeableRow>
    );
};

export const NotificationsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('all');
    
    // Live Query
    const { data: list = [], viewStatus, refresh } = useLiveQuery(
        NotificationService,
        () => NotificationService.getNotifications(activeTab as any),
        { deps: [activeTab] }
    );

    const handleRead = async (item: Notification) => {
        if (!item.isRead) {
            await NotificationService.markRead(item.id);
            // No need for local state update, service emits event
        }
        if (item.link) {
            navigate(item.link);
        }
    };

    const handleDelete = async (id: string) => {
        await NotificationService.deleteById(id);
        Toast.success('已删除');
    };

    const handleClearAll = async () => {
        if (list.length === 0) return;
        if (window.confirm('确定清空当前列表的所有通知吗？')) {
            for (const item of list) {
                await NotificationService.deleteById(item.id);
            }
            Toast.success('已清空');
        }
    };
    
    const handleMarkAllRead = async () => {
        await NotificationService.markAllRead();
        Toast.success('全部已读');
    };

    const RightActions = (
        <div style={{ display: 'flex', gap: '16px', padding: '0 12px' }}>
            <div onClick={handleMarkAllRead} style={{ fontSize: '16px', cursor: 'pointer' }}>✓</div>
            <div onClick={handleClearAll} style={{ fontSize: '16px', cursor: 'pointer' }}>🗑️</div>
        </div>
    );

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="消息通知" onBack={() => navigateBack('/')} rightElement={RightActions} />
            
            <Tabs 
                items={TABS}
                activeId={activeTab}
                onChange={setActiveTab}
            />

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <StateView 
                    status={viewStatus} 
                    onRetry={refresh}
                    emptyText="暂无通知"
                    emptyIcon="🔕"
                >
                    {list.map((item: Notification) => (
                        <NotificationItem 
                            key={item.id} 
                            item={item} 
                            onClick={() => handleRead(item)} 
                            onDelete={() => handleDelete(item.id)}
                        />
                    ))}
                </StateView>
            </div>
        </div>
    );
};
