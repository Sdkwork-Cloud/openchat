
import React, { useState, useEffect, useMemo } from 'react';
import { navigate, navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { AppointmentService, Appointment } from '../services/AppointmentService';
import { SearchInput } from '../../../components/SearchInput/SearchInput';
import { Tabs } from '../../../components/Tabs/Tabs';
import { Empty } from '../../../components/Empty/Empty';
import { Tag } from '../../../components/Tag/Tag';
import { Card } from '../../../components/Card/Card';
import { Calendar } from '../../../components/Calendar/Calendar'; 
import { useTranslation } from '../../../core/i18n/I18nContext';

const getTypeIcon = (type: string) => {
    const map: Record<string, string> = {
        hotel: '🏨', transport: '✈️', medical: '🏥', dining: '🍽️',
        sports: '🏸', course: '📚', beauty: '💇‍♀️'
    };
    return map[type] || '📅';
};

const formatAppointmentTime = (start?: number, end?: number) => {
    if (!start || typeof start !== 'number') return { main: '--:--', sub: '', isRange: false };
    try {
        const startDate = new Date(start);
        const dateStr = `${startDate.getMonth() + 1}月${startDate.getDate()}日`;
        const timeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
        // Note: Hardcoded days here could be localized via DateUtils or Intl in future, 
        // for now kept simple to match existing style or removed if strict I18n needed
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekStr = days[startDate.getDay()] || '';

        if (!end || typeof end !== 'number') {
            return { main: timeStr, sub: `${dateStr} ${weekStr}`, isRange: false };
        }
        const endDate = new Date(end);
        if (startDate.toDateString() === endDate.toDateString()) {
            const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
            return { main: `${timeStr}-${endTimeStr}`, sub: `${dateStr} ${weekStr}`, isRange: false };
        } else {
            const endDateStr = `${endDate.getMonth() + 1}月${endDate.getDate()}日`;
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            return { main: dateStr, sub: `至 ${endDateStr} (${diffDays}晚)`, isRange: true };
        }
    } catch (e) {
        return { main: '时间错误', sub: '', isRange: false };
    }
};

const StatusBadge = ({ status }: { status: string }) => {
    const { t } = useTranslation();
    let color = 'default';
    let textKey = 'pending';
    
    switch (status) {
        case 'pending': color = 'warning'; textKey = 'pending'; break;
        case 'confirmed': color = 'success'; textKey = 'confirmed'; break;
        case 'completed': color = 'default'; textKey = 'completed'; break;
        case 'cancelled': color = 'danger'; textKey = 'cancelled'; break;
    }
    return <Tag color={color as any} variant="light">{t(`appointment.tabs.${textKey}`)}</Tag>;
};

const AppointmentCard: React.FC<{ item: Appointment }> = ({ item }) => {
    if (!item) return null;
    const timeDisplay = formatAppointmentTime(item.startTime, item.endTime);
    const typeIcon = getTypeIcon(item.type);

    return (
        <Card 
            onClick={() => navigate('/appointments/detail', { id: item.id })}
            style={{ display: 'flex', gap: '16px', borderLeft: `4px solid ${item.status === 'confirmed' ? 'var(--primary-color)' : 'transparent'}` }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', minWidth: '85px', borderRight: '1px solid var(--border-color)', paddingRight: '12px' }}>
                {timeDisplay.isRange ? (
                    <><div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{timeDisplay.main}</div><div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{timeDisplay.sub}</div></>
                ) : (
                    <><div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{timeDisplay.main}</div><div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{timeDisplay.sub}</div></>
                )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px' }}>{typeIcon}</span>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.3 }}>{item.serviceName || '未知服务'}</div>
                    </div>
                    <StatusBadge status={item.status} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundImage: `url(${item.providerAvatar})`, backgroundSize: 'cover', backgroundColor: '#eee' }}></div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.providerName || '未知商户'}</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-placeholder)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {item.location || '未知地点'}</div>
            </div>
        </Card>
    );
};

export const AppointmentListPage: React.FC = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<any>('all');
    const [activeCategory, setActiveCategory] = useState<any>('all');
    const [list, setList] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Calendar State
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    
    // Search Mode State
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const tabs = useMemo(() => [
        { id: 'all', label: t('appointment.tabs.all') },
        { id: 'pending', label: t('appointment.tabs.pending') },
        { id: 'confirmed', label: t('appointment.tabs.confirmed') },
        { id: 'completed', label: t('appointment.tabs.completed') },
        { id: 'cancelled', label: t('appointment.tabs.cancelled') },
    ], [t]);

    const categories = useMemo(() => [
        { id: 'all', label: t('appointment.categories.all') },
        { id: 'hotel', label: t('appointment.categories.hotel') },
        { id: 'transport', label: t('appointment.categories.transport') },
        { id: 'dining', label: t('appointment.categories.dining') },
        { id: 'medical', label: t('appointment.categories.medical') },
        { id: 'sports', label: t('appointment.categories.sports') },
        { id: 'beauty', label: t('appointment.categories.beauty') },
    ], [t]);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setIsLoading(true);
                const statusToFetch = isSearching ? 'all' : activeTab;
                const res = await AppointmentService.getAppointments(statusToFetch);
                if (mounted && res.success && res.data) setList(res.data);
            } catch (e) {
                console.error("Failed to load", e);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [activeTab, isSearching]);

    // Derived: Event dates for calendar dots
    const eventDates = useMemo(() => {
        const dates = new Set<string>();
        list.forEach(item => {
            if (item.startTime) {
                const date = new Date(item.startTime);
                const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                dates.add(iso);
            }
        });
        return Array.from(dates);
    }, [list]);

    const filteredList = useMemo(() => {
        let res = list;
        
        if (isSearching) {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                res = res.filter(item => 
                    item.serviceName.toLowerCase().includes(q) || 
                    item.providerName.toLowerCase().includes(q) ||
                    item.type.toLowerCase().includes(q)
                );
            }
            return res;
        }

        // Calendar Filter
        if (selectedDate) {
            res = res.filter(item => {
                if (!item.startTime) return false;
                const itemDate = new Date(item.startTime);
                return itemDate.toDateString() === selectedDate.toDateString();
            });
        }

        if (activeCategory !== 'all') {
            res = res.filter(item => item.type === activeCategory);
        }
        return res;
    }, [list, activeCategory, searchQuery, isSearching, selectedDate]);

    const currentTabLabel = tabs.find(t => t.id === activeTab)?.label || '相关';

    if (isSearching) {
        return (
            <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
                <SearchInput 
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onCancel={() => { setIsSearching(false); setSearchQuery(''); }}
                    placeholder="搜索服务、商户或类型..."
                    autoFocus
                />
                <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
                    {filteredList.length > 0 ? (
                        filteredList.map(item => <AppointmentCard key={item.id} item={item} />)
                    ) : (
                        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.3 }}>🔍</div>
                            <div style={{ fontSize: '14px' }}>未找到相关预约</div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar 
                title={t('appointment.title')}
                onBack={() => navigateBack('/me')}
                rightElement={
                    <div style={{ display: 'flex', gap: '16px', padding: '0 12px' }}>
                         <div 
                            onClick={() => { setShowCalendar(!showCalendar); setSelectedDate(null); }} 
                            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: showCalendar ? 'var(--primary-color)' : 'var(--text-primary)' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </div>
                        <div 
                            onClick={() => setIsSearching(true)} 
                            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </div>
                    </div>
                } 
            />
            
            <div style={{ position: 'sticky', top: '44px', zIndex: 10, background: 'var(--bg-body)' }}>
                {showCalendar && (
                    <div style={{ padding: '0 12px 12px 12px', animation: 'slideDown 0.2s ease-out' }}>
                        <Calendar 
                            value={selectedDate || new Date()} 
                            onChange={setSelectedDate}
                            events={eventDates}
                        />
                        <div 
                            onClick={() => { setShowCalendar(false); setSelectedDate(null); }}
                            style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}
                        >
                            收起日历 {selectedDate && '(已筛选)'}
                        </div>
                    </div>
                )}
                
                <Tabs 
                    items={tabs} 
                    activeId={activeTab} 
                    onChange={(id) => setActiveTab(id)} 
                />
                <Tabs
                    items={categories}
                    activeId={activeCategory}
                    onChange={(id) => setActiveCategory(id)}
                    variant="pill"
                    style={{ background: 'var(--bg-card)', paddingBottom: '8px' }}
                />
            </div>

            <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
                {selectedDate && (
                    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{selectedDate.getMonth()+1}月{selectedDate.getDate()}日 的安排</span>
                        <span onClick={() => setSelectedDate(null)} style={{ fontSize: '12px', color: 'var(--primary-color)' }}>清除筛选</span>
                    </div>
                )}

                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('common.loading')}</div>
                ) : filteredList.length > 0 ? (
                    filteredList.map(item => <AppointmentCard key={item.id} item={item} />)
                ) : (
                    <Empty icon="📅" text={`暂无${selectedDate ? '当天' : currentTabLabel}预约`} />
                )}
            </div>
            <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
};
