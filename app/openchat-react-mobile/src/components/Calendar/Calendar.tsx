
import React, { useState, useEffect, useMemo } from 'react';
import { Platform } from '../../platform';
import { useTranslation } from '../../core/i18n/I18nContext';

interface CalendarProps {
    value?: Date;
    onChange?: (date: Date) => void;
    events?: string[]; // Array of date strings (YYYY-MM-DD) that have events
    style?: React.CSSProperties;
    className?: string;
}

export const Calendar: React.FC<CalendarProps> = ({ 
    value, 
    onChange, 
    events = [], 
    style, 
    className = '' 
}) => {
    const { locale } = useTranslation();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(value || new Date());

    useEffect(() => {
        if (value) setSelectedDate(value);
    }, [value]);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        setSelectedDate(newDate);
        onChange?.(newDate);
        Platform.device.vibrate(5);
    };

    const renderDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        
        const days = [];
        
        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ height: '44px' }} />);
        }

        const todayStr = new Date().toDateString();

        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            const dateStr = dateObj.toDateString();
            const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            const isSelected = selectedDate.toDateString() === dateStr;
            const isToday = todayStr === dateStr;
            const hasEvent = events.includes(isoDate);

            days.push(
                <div 
                    key={day} 
                    onClick={() => handleDateClick(day)}
                    style={{ 
                        height: '44px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', position: 'relative',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isSelected ? 'var(--primary-color)' : 'transparent',
                        color: isSelected ? 'white' : (isToday ? 'var(--primary-color)' : 'var(--text-primary)'),
                        fontWeight: isSelected || isToday ? 600 : 400,
                        fontSize: '15px',
                        transition: 'all 0.2s'
                    }}>
                        {day}
                    </div>
                    {hasEvent && !isSelected && (
                        <div style={{ 
                            position: 'absolute', bottom: '4px', width: '4px', height: '4px', 
                            borderRadius: '50%', background: 'var(--text-secondary)' 
                        }} />
                    )}
                </div>
            );
        }
        return days;
    }, [currentMonth, selectedDate, events]);

    // Dynamic Weekdays based on Locale
    const weekDays = useMemo(() => {
        const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
        // Start from Sunday (Date 2024-01-07 was a Sunday)
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(2024, 0, 7 + i);
            return formatter.format(d);
        });
    }, [locale]);

    const titleStr = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(currentMonth);

    return (
        <div className={className} style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', paddingBottom: '12px', ...style }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                <div onClick={handlePrevMonth} style={{ padding: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {titleStr}
                </div>
                <div onClick={handleNextMonth} style={{ padding: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>

            {/* Weekdays */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px' }}>
                {weekDays.map(d => (
                    <div key={d} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{d}</div>
                ))}
            </div>

            {/* Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {renderDays}
            </div>
        </div>
    );
};
