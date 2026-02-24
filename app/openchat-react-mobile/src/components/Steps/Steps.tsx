
import React from 'react';

export interface StepItem {
    title: string;
    description?: string;
}

interface StepsProps {
    items: StepItem[];
    current: number;
    direction?: 'horizontal' | 'vertical';
    style?: React.CSSProperties;
}

export const Steps: React.FC<StepsProps> = ({ 
    items, 
    current, 
    direction = 'horizontal',
    style 
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: direction === 'horizontal' ? 'row' : 'column', ...style }}>
            {items.map((item, index) => {
                const isFinished = index < current;
                const isProcess = index === current;
                const isWait = index > current;

                let statusColor = 'var(--border-color)';
                if (isFinished || isProcess) statusColor = 'var(--primary-color)';

                return (
                    <div key={index} style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: direction === 'horizontal' ? 'column' : 'row',
                        alignItems: direction === 'horizontal' ? 'center' : 'flex-start',
                        position: 'relative',
                        paddingBottom: direction === 'vertical' ? '24px' : '0'
                    }}>
                        {/* Line Connector */}
                        {index < items.length - 1 && (
                            <div style={{
                                position: 'absolute',
                                top: direction === 'horizontal' ? '10px' : '24px',
                                left: direction === 'horizontal' ? '50%' : '10px',
                                width: direction === 'horizontal' ? '100%' : '2px',
                                height: direction === 'horizontal' ? '2px' : '100%',
                                background: isFinished ? 'var(--primary-color)' : 'var(--bg-cell-active)',
                                transition: 'all 0.3s'
                            }} />
                        )}

                        {/* Icon/Dot */}
                        <div style={{ 
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: isFinished || isProcess ? 'var(--primary-color)' : 'var(--bg-cell-active)',
                            border: isProcess ? '4px solid rgba(41, 121, 255, 0.2)' : 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 1, marginBottom: direction === 'horizontal' ? '8px' : '0',
                            marginRight: direction === 'horizontal' ? '0' : '12px',
                            boxSizing: 'content-box', // Ensure border doesn't shrink content
                            transform: isProcess ? 'translate(-4px, -4px)' : 'none', // Adjust for border
                            transition: 'all 0.3s'
                        }}>
                            {isFinished ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                            ) : isProcess ? (
                                <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }} />
                            ) : null}
                        </div>

                        {/* Content */}
                        <div style={{ 
                            textAlign: direction === 'horizontal' ? 'center' : 'left',
                            flex: 1 // Take remaining space in vertical mode
                        }}>
                            <div style={{ 
                                fontSize: '13px', fontWeight: isProcess ? 600 : 400, 
                                color: isWait ? 'var(--text-secondary)' : 'var(--text-primary)',
                                transition: 'color 0.3s'
                            }}>
                                {item.title}
                            </div>
                            {item.description && (
                                <div style={{ fontSize: '11px', color: 'var(--text-placeholder)', marginTop: '2px' }}>
                                    {item.description}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
