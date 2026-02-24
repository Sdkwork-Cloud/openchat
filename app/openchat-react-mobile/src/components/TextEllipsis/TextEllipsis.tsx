
import React, { useState } from 'react';

interface TextEllipsisProps {
    content: string;
    rows?: number;
    expandText?: string;
    collapseText?: string;
    style?: React.CSSProperties;
    className?: string;
}

export const TextEllipsis: React.FC<TextEllipsisProps> = ({ 
    content, 
    rows = 3, 
    expandText = '展开', 
    collapseText = '收起',
    style,
    className = ''
}) => {
    const [expanded, setExpanded] = useState(false);

    // Simple heuristic: assuming avg 20 chars per line (approx for mobile). 
    // Real implementation requires measurement or CSS line-clamp detection.
    // Here we use CSS line-clamp for the collapsed state.
    
    // We assume if text is long enough, we show the toggle.
    // A better way is using a ref and checking scrollHeight > clientHeight, 
    // but for this lightweight implementation, length heuristic is often sufficient for initial render.
    const shouldClamp = content.length > rows * 25; 

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    return (
        <div className={className} style={{ ...style }}>
            <div 
                style={{ 
                    fontSize: '15px', 
                    lineHeight: '1.6', 
                    color: 'var(--text-primary)',
                    display: expanded ? 'block' : '-webkit-box',
                    WebkitLineClamp: expanded ? 'none' : rows,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'pre-wrap'
                }}
            >
                {content}
            </div>
            {shouldClamp && (
                <div 
                    onClick={toggle}
                    style={{ 
                        color: 'var(--primary-color)', 
                        fontSize: '14px', 
                        marginTop: '4px', 
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    {expanded ? collapseText : expandText}
                </div>
            )}
        </div>
    );
};
