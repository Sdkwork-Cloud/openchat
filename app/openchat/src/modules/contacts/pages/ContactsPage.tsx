
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { navigate } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Cell } from '../../../components/Cell';
import { Toast } from '../../../components/Toast';
import { ContactService, Contact } from '../services/ContactService';
import { Platform } from '../../../platform';

// --- Sub-Component: Alpha Index Bar ---
const AlphaIndexBar: React.FC<{ 
    keys: string[]; 
    onSelect: (char: string) => void; 
}> = ({ keys, onSelect }) => {
    const [activeIndex, setActiveIndex] = useState<string | null>(null);
    const touchTimeout = useRef<any>(null);

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault(); 
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        
        // Find the element under finger
        const element = document.elementFromPoint(clientX, clientY);
        const char = element?.getAttribute('data-index');
        
        if (char && char !== activeIndex) {
            setActiveIndex(char);
            onSelect(char);
            
            if (touchTimeout.current) clearTimeout(touchTimeout.current);
            touchTimeout.current = setTimeout(() => setActiveIndex(null), 600);
        }
    };

    return (
        <>
            <div 
                style={{ 
                    position: 'absolute', right: '0', top: '50%', transform: 'translateY(-45%)', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', 
                    padding: '10px 4px', zIndex: 10, userSelect: 'none', touchAction: 'none'
                }}
                onTouchStart={handleTouchMove}
                onTouchMove={handleTouchMove}
                onMouseDown={handleTouchMove}
                onMouseMove={(e) => e.buttons === 1 && handleTouchMove(e)}
            >
                {['↑', '☆', ...keys, '#'].map(char => (
                    <div 
                        key={char} 
                        data-index={char === '↑' ? keys[0] : char}
                        style={{ 
                            fontSize: '10px', fontWeight: 600, 
                            width: '18px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%',
                            background: activeIndex === char ? 'var(--primary-color)' : 'transparent',
                            color: activeIndex === char ? 'white' : 'var(--text-secondary)',
                            marginBottom: '2px'
                        }}
                    >
                        {char === '↑' ? '▲' : char}
                    </div>
                ))}
            </div>

            {/* Floating Bubble Indicator */}
            {activeIndex && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '70px', height: '70px', background: 'rgba(0,0,0,0.5)', borderRadius: '12px',
                    color: 'white', fontSize: '36px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 20, backdropFilter: 'blur(4px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    animation: 'popIn 0.1s ease-out'
                }}>
                    {activeIndex}
                </div>
            )}
            <style>{`@keyframes popIn { from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }`}</style>
        </>
    );
};

export const ContactsPage: React.FC = () => {
    const [groups, setGroups] = useState<Record<string, Contact[]>>({});
    const [sortedKeys, setSortedKeys] = useState<string[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- Data Fetching via Service ---
    useEffect(() => {
        const loadContacts = async () => {
            const result = await ContactService.getGroupedContacts();
            if (result.success && result.data) {
                setGroups(result.data.groups);
                setSortedKeys(result.data.sortedKeys);
                
                // Calculate total efficiently
                let count = 0;
                Object.values(result.data.groups).forEach(g => count += g.length);
                setTotalCount(count);
            }
        };
        loadContacts();
    }, []);

    // --- Interaction Logic ---
    const handleScrollToIndex = useCallback((char: string) => {
        if (!char) return;
        
        Platform.device.vibrate(5); // Use HAL
        
        const element = document.getElementById(`anchor-${char}`);
        if (element && scrollRef.current) {
            const topOffset = element.offsetTop - 50; 
            scrollRef.current.scrollTo({ top: topOffset, behavior: 'auto' });
        }
    }, []);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-body)', position: 'relative' }}>
            <Navbar title="通讯录" rightElement={
                <div onClick={() => navigate('/contact/profile?name=New')} style={{ padding: '4px', cursor: 'pointer' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                </div>
            } />

            <div 
                ref={scrollRef}
                style={{ flex: 1, overflowY: 'auto', position: 'relative', scrollBehavior: 'smooth' }}
            >
                {/* Search Bar */}
                <div onClick={() => navigate('/search')} style={{ padding: '10px 16px', background: 'var(--bg-body)' }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: '6px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '15px', transition: 'background 0.2s' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        搜索
                    </div>
                </div>

                {/* Function Entries */}
                <div style={{ background: 'var(--bg-card)', marginBottom: '12px' }}>
                    <Cell onClick={() => Toast.info('暂无新朋友申请')} title="新的朋友" icon={<div style={{ width: 36, height: 36, background: '#fa9d3b', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px' }}>👤</div>} />
                    <Cell onClick={() => Toast.info('暂无群聊')} title="群聊" icon={<div style={{ width: 36, height: 36, background: '#07c160', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px' }}>👥</div>} />
                    <Cell onClick={() => navigate('/agents')} title="智能体" icon={<div style={{ width: 36, height: 36, background: '#2979FF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px' }}>🧠</div>} />
                </div>

                {/* Contact List */}
                {sortedKeys.map(char => (
                    <div key={char} id={`anchor-${char}`}>
                        <div style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, background: 'var(--bg-body)', position: 'sticky', top: 0, zIndex: 1 }}>
                            {char}
                        </div>
                        <div style={{ background: 'var(--bg-card)' }}>
                            {groups[char].map((contact, i) => (
                                <div 
                                    key={contact.id} 
                                    onClick={() => navigate('/contact/profile', { name: contact.name })}
                                    style={{ 
                                        display: 'flex', alignItems: 'center', padding: '10px 16px', 
                                        borderBottom: i !== groups[char].length - 1 ? '0.5px solid var(--border-color)' : 'none', 
                                        cursor: 'pointer' 
                                    }}
                                >
                                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundImage: `url(${contact.avatar})`, backgroundSize: 'cover', marginRight: '12px', border: '0.5px solid var(--border-color)' }}></div>
                                    <div style={{ flex: 1, color: 'var(--text-primary)', fontSize: '16px', fontWeight: 500 }}>{contact.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                
                {/* Footer Count */}
                <div style={{ padding: '24px 0 40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {totalCount} 位朋友
                </div>
            </div>

            <AlphaIndexBar keys={sortedKeys} onSelect={handleScrollToIndex} />
        </div>
    );
};
