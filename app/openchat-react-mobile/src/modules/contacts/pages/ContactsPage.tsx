
import React, { useRef, useState, useCallback } from 'react';
import { navigate, navigateBack, useQueryParams } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Cell } from '../../../components/Cell';
import { Checkbox } from '../../../components/Checkbox/Checkbox';
import { Toast } from '../../../components/Toast';
import { ContactService, Contact } from '../services/ContactService';
import { ChatService } from '../../chat/services/ChatService';
import { Avatar } from '../../../components/Avatar';
import { IndexBar } from '../../../components/IndexBar/IndexBar';
import { useLiveQuery } from '../../../core/hooks';
import { StateView } from '../../../components/StateView/StateView';

export const ContactsPage: React.FC = () => {
    const query = useQueryParams();
    const mode = query.get('mode') as 'select' | undefined;
    const action = query.get('action'); 
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);

    // Framework Hook
    const { data, viewStatus, refresh } = useLiveQuery(
        ContactService,
        () => ContactService.getGroupedContacts(),
        { deps: [] }
    );

    const groups: Record<string, Contact[]> = data?.groups || {};
    const sortedKeys = data?.sortedKeys || [];
    const totalCount = Object.values(groups).reduce((acc, curr) => acc + curr.length, 0);

    const handleScrollToIndex = useCallback((char: string) => {
        if (!char) return;
        const targetId = char === '↑' ? 'top-anchor' : `anchor-${char}`;
        const element = document.getElementById(targetId);
        if (element && scrollRef.current) {
            const topOffset = element.offsetTop - (char === '↑' ? 0 : 50); 
            scrollRef.current.scrollTo({ top: topOffset, behavior: 'auto' });
        }
    }, []);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleConfirmAction = async () => {
        if (selectedIds.size === 0) return;
        
        if (action === 'forward') {
            Toast.loading('正在转发...');
            await new Promise(r => setTimeout(r, 800));
            Toast.success(`已转发给 ${selectedIds.size} 位朋友`);
            navigateBack(); 
            return;
        }

        Toast.loading('正在创建...');
        const memberIds = Array.from(selectedIds) as string[];
        const res = await ChatService.createGroupSession('新群聊', memberIds);
        
        if (res.success && res.data) {
            Toast.success('创建成功');
            setTimeout(() => navigate('/chat', { id: res.data!.id }), 500);
        } else {
            Toast.info('创建失败');
        }
    };

    const handleItemClick = (contact: Contact) => {
        if (mode === 'select') {
            toggleSelection(contact.id);
        } else {
            navigate('/contact/profile', { name: contact.name });
        }
    };

    const isSelectMode = mode === 'select';
    const title = isSelectMode ? (action === 'forward' ? '选择转发对象' : '选择联系人') : '通讯录';
    const actionLabel = action === 'forward' ? '转发' : '完成';
    
    const RightElement = isSelectMode ? (
        <button 
            onClick={handleConfirmAction}
            disabled={selectedIds.size === 0}
            style={{
                padding: '6px 12px', background: selectedIds.size > 0 ? 'var(--primary-color)' : 'var(--bg-cell-active)',
                color: selectedIds.size > 0 ? 'white' : 'var(--text-secondary)',
                border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 600,
                opacity: selectedIds.size > 0 ? 1 : 0.6,
                transition: 'all 0.2s'
            }}
        >
            {actionLabel}{selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
        </button>
    ) : (
        <div onClick={() => navigate('/contacts/new-friends')} style={{ padding: '4px', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        </div>
    );

    const indexList = ['↑', '☆', ...sortedKeys, '#'];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-body)', position: 'relative' }}>
            <Navbar title={title} rightElement={RightElement} showBack={isSelectMode} />

            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', position: 'relative', scrollBehavior: 'smooth' }}>
                <div id="top-anchor" />
                
                {!isSelectMode && (
                    <div onClick={() => navigate('/search')} style={{ padding: '10px 16px', background: 'var(--bg-body)' }}>
                        <div style={{ background: 'var(--bg-card)', borderRadius: '6px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '15px', transition: 'background 0.2s' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            搜索
                        </div>
                    </div>
                )}

                {!isSelectMode && (
                    <div style={{ marginBottom: '12px' }}>
                        <Cell onClick={() => navigate('/contacts/new-friends')} title="新的朋友" icon={<div style={{ width: 36, height: 36, background: '#fa9d3b', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px' }}>👤</div>} />
                        <Cell onClick={() => navigate('/contacts?mode=select')} title="群聊" icon={<div style={{ width: 36, height: 36, background: '#07c160', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px' }}>👥</div>} />
                        <Cell onClick={() => navigate('/agents')} title="智能体" icon={<div style={{ width: 36, height: 36, background: '#2979FF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px' }}>🧠</div>} />
                    </div>
                )}

                <StateView 
                    status={viewStatus} 
                    onRetry={refresh}
                    emptyText="暂无联系人"
                    emptyIcon="📇"
                >
                    {sortedKeys.map(char => (
                        <div key={char} id={`anchor-${char}`}>
                            <div style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, background: 'var(--bg-body)', position: 'sticky', top: 0, zIndex: 1 }}>{char}</div>
                            <div>
                                {groups[char].map((contact, i) => (
                                    <Cell 
                                        key={contact.id} 
                                        onClick={() => handleItemClick(contact)}
                                        title={contact.name}
                                        icon={isSelectMode ? <Checkbox checked={selectedIds.has(contact.id)} style={{ marginRight: 12 }} /> : <Avatar src={contact.avatar} fallbackText={contact.name} size={40} />}
                                        center
                                        border={i !== groups[char].length - 1}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    <div style={{ padding: '24px 0 40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {totalCount} 位朋友
                    </div>
                </StateView>
            </div>

            {viewStatus === 'success' && <IndexBar indexes={indexList} onSelect={handleScrollToIndex} />}
        </div>
    );
};
