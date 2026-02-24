
import React, { useRef, useEffect, useState } from 'react';
import { Haptic } from '../../utils/haptic';

export interface TabItem {
    id: string;
    label: string;
    badge?: number | string;
}

interface TabsProps {
    items: TabItem[];
    activeId: string;
    onChange: (id: string) => void;
    variant?: 'line' | 'pill' | 'segment';
    scrollable?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export const Tabs: React.FC<TabsProps> = ({ 
    items, 
    activeId, 
    onChange, 
    variant = 'line',
    scrollable = true,
    className = '',
    style 
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [lineStyle, setLineStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (variant === 'line' && activeId && itemRefs.current[activeId]) {
            const el = itemRefs.current[activeId];
            if (el) {
                const left = el.offsetLeft;
                const width = el.offsetWidth;
                
                setLineStyle({
                    transform: `translateX(${left + width / 4}px)`,
                    width: `${width / 2}px`,
                    opacity: 1
                });

                if (scrollable && containerRef.current) {
                    const container = containerRef.current;
                    const scrollLeft = left - (container.offsetWidth / 2) + (width / 2);
                    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                }
            }
        }
    }, [activeId, variant, items, scrollable]);

    const handleTabClick = (id: string) => {
        if (id !== activeId) {
            Haptic.selection(); // Sensory feedback
            onChange(id);
        }
    };

    return (
        <div 
            className={className}
            style={{ 
                position: 'relative', 
                background: 'var(--bg-card)', 
                borderBottom: variant === 'line' ? '0.5px solid var(--border-color)' : 'none',
                ...style 
            }}
        >
            <div 
                ref={containerRef}
                style={{ 
                    display: 'flex', 
                    overflowX: scrollable ? 'auto' : 'hidden', 
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                    position: 'relative',
                    padding: variant === 'segment' ? '8px' : (variant === 'pill' ? '12px 16px' : '0 8px'),
                    gap: variant === 'pill' ? '8px' : '0'
                }}
            >
                {variant === 'segment' && (
                    <div style={{
                        position: 'absolute', top: 8, bottom: 8, left: 8, right: 8,
                        background: 'var(--bg-body)', borderRadius: '8px', zIndex: 0
                    }} />
                )}

                {items.map((item) => {
                    const isActive = activeId === item.id;
                    
                    // Style overrides based on variant
                    let itemStyle: React.CSSProperties = {
                        flex: scrollable ? 'none' : 1,
                        padding: variant === 'line' ? '14px 16px' : '8px 16px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        zIndex: 1,
                        fontSize: '15px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                    };

                    if (variant === 'line') {
                        itemStyle.color = isActive ? 'var(--primary-color)' : 'var(--text-secondary)';
                        itemStyle.fontWeight = isActive ? 600 : 400;
                    } else if (variant === 'segment') {
                        itemStyle.margin = '0 2px';
                        if (isActive) {
                            itemStyle.color = 'var(--text-primary)';
                            itemStyle.background = 'var(--bg-card)';
                            itemStyle.borderRadius = '6px';
                            itemStyle.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                            itemStyle.fontWeight = 600;
                        } else {
                            itemStyle.color = 'var(--text-secondary)';
                        }
                    } else if (variant === 'pill') {
                        itemStyle.padding = '6px 16px';
                        itemStyle.borderRadius = '16px';
                        itemStyle.fontSize = '13px';
                        if (isActive) {
                            itemStyle.background = 'var(--primary-color)';
                            itemStyle.color = 'white';
                            itemStyle.fontWeight = 500;
                        } else {
                            itemStyle.background = 'var(--bg-body)';
                            itemStyle.color = 'var(--text-secondary)';
                        }
                    }

                    return (
                        <div
                            key={item.id}
                            ref={el => { itemRefs.current[item.id] = el; }}
                            onClick={() => handleTabClick(item.id)}
                            style={itemStyle}
                        >
                            {item.label}
                            {item.badge && (
                                <span style={{ 
                                    marginLeft: '4px', fontSize: '10px', 
                                    background: '#fa5151', color: 'white', 
                                    padding: '0 4px', borderRadius: '4px',
                                    verticalAlign: 'middle'
                                }}>
                                    {item.badge}
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* Animated Line Indicator */}
                {variant === 'line' && (
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        height: '3px',
                        background: 'var(--primary-color)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        zIndex: 2,
                        ...lineStyle
                    }} />
                )}
            </div>
        </div>
    );
};
