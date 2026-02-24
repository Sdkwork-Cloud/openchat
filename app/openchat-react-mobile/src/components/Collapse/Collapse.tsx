
import React, { useState } from 'react';
import { Cell } from '../Cell/Cell';

interface CollapseProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
}

export const Collapse: React.FC<CollapseProps> = ({ 
    title, 
    children, 
    defaultExpanded = false, 
    disabled = false,
    icon 
}) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    const toggle = () => {
        if (disabled) return;
        setExpanded(!expanded);
    };

    return (
        <div style={{ 
            background: 'var(--bg-card)', 
            overflow: 'hidden', 
            borderBottom: '0.5px solid var(--border-color)' 
        }}>
            <Cell 
                title={title} 
                icon={icon}
                onClick={toggle}
                rightIcon={
                    <div style={{ 
                        transition: 'transform 0.3s', 
                        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        color: 'var(--text-secondary)' 
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                }
                border={false}
                clickable={!disabled}
                style={{ opacity: disabled ? 0.6 : 1 }}
            />
            
            <div 
                style={{ 
                    display: 'grid', 
                    gridTemplateRows: expanded ? '1fr' : '0fr',
                    transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <div style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '0 16px 16px 16px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface CollapseGroupProps {
    children: React.ReactNode;
    inset?: boolean;
}

export const CollapseGroup: React.FC<CollapseGroupProps> = ({ children, inset }) => {
    return (
        <div style={{ 
            borderRadius: inset ? '12px' : '0', 
            overflow: 'hidden', 
            margin: inset ? '12px 16px' : '0',
            border: inset ? '1px solid var(--border-color)' : 'none'
        }}>
            {children}
        </div>
    );
};
