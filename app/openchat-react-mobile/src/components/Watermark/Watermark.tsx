
import React, { useState, useEffect, useRef } from 'react';

interface WatermarkProps {
    text?: string | string[];
    image?: string;
    width?: number;
    height?: number;
    gapX?: number;
    gapY?: number;
    zIndex?: number;
    rotate?: number;
    opacity?: number;
    color?: string;
    fontSize?: number;
    children?: React.ReactNode;
    fullPage?: boolean; // If true, covers screen fixed
    className?: string;
    style?: React.CSSProperties;
}

export const Watermark: React.FC<WatermarkProps> = ({ 
    text, 
    image, 
    width = 120, 
    height = 64, 
    gapX = 24, 
    gapY = 24, 
    zIndex = 9,
    rotate = -22,
    opacity = 0.15,
    color = 'rgba(0,0,0,0.15)', // Default color handled in logic
    fontSize = 16,
    children,
    fullPage = true,
    className = '',
    style
}) => {
    const [base64Url, setBase64Url] = useState('');
    
    useEffect(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const ratio = window.devicePixelRatio || 1;
        
        const canvasWidth = (width + gapX) * ratio;
        const canvasHeight = (height + gapY) * ratio;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.width = `${width + gapX}px`;
        canvas.style.height = `${height + gapY}px`;
        
        if (ctx) {
            ctx.scale(ratio, ratio);
            ctx.translate(canvasWidth / (2 * ratio), canvasHeight / (2 * ratio));
            ctx.rotate((Math.PI / 180) * rotate);
            
            // Draw Text
            if (text) {
                ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                ctx.fillStyle = color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.globalAlpha = opacity;
                
                const content = Array.isArray(text) ? text : [text];
                content.forEach((line, index) => {
                    const y = (index - (content.length - 1) / 2) * (fontSize + 4);
                    ctx.fillText(line, 0, y);
                });
            }
            
            // Draw Image (Async not handled perfectly in this simple effect, assuming text mostly)
            // For production image watermark, use an async loader hook.
        }
        
        setBase64Url(canvas.toDataURL());
    }, [text, width, height, gapX, gapY, rotate, opacity, color, fontSize]);

    return (
        <div 
            className={className} 
            style={{ position: 'relative', overflow: 'hidden', ...style }}
        >
            {children}
            <div 
                style={{
                    position: fullPage ? 'fixed' : 'absolute',
                    zIndex: zIndex,
                    inset: 0,
                    pointerEvents: 'none',
                    backgroundImage: `url(${base64Url})`,
                    backgroundSize: `${width + gapX}px ${height + gapY}px`,
                    backgroundRepeat: 'repeat'
                }} 
            />
        </div>
    );
};
