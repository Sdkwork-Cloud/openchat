
import React, { useRef, useEffect, useState } from 'react';

interface SignaturePadProps {
    width?: number | string;
    height?: number;
    onClear?: () => void;
    onEnd?: (base64: string) => void;
    style?: React.CSSProperties;
    className?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ 
    width = '100%', 
    height = 200, 
    onClear, 
    onEnd,
    style,
    className = ''
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasContent, setHasContent] = useState(false);
    
    // Config
    const strokeColor = '#000';
    const strokeWidth = 3;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Handle high DPI
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
        }

        // Fill white background to support saving as JPG properly if needed
        // But for transparency PNG is better. We assume transparent is fine.
    }, []);

    const getCoords = (e: React.TouchEvent | React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault(); // Prevent scroll
        setIsDrawing(true);
        setHasContent(true);
        
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        
        const { x, y } = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDrawing) return;
        e.preventDefault(); 
        
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        
        const { x, y } = getCoords(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas && onEnd) {
            onEnd(canvas.toDataURL());
        }
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setHasContent(false);
        if (onClear) onClear();
    };

    // Style for Dark Mode support needs logic, but for now assuming signature is on light card
    return (
        <div className={className} style={{ width: width, display: 'flex', flexDirection: 'column', ...style }}>
            <div style={{ 
                position: 'relative', 
                borderRadius: '12px', 
                border: '1px dashed var(--border-color)', 
                background: '#f9f9f9',
                overflow: 'hidden',
                touchAction: 'none'
            }}>
                <canvas 
                    ref={canvasRef}
                    style={{ width: '100%', height: `${height}px`, display: 'block', cursor: 'crosshair' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                
                {!hasContent && (
                    <div style={{ 
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
                        pointerEvents: 'none', color: '#ccc', fontSize: '24px', fontWeight: 600, opacity: 0.5
                    }}>
                        请在此签名
                    </div>
                )}

                {hasContent && (
                    <div 
                        onClick={clear}
                        style={{ 
                            position: 'absolute', top: 8, right: 8, 
                            background: 'rgba(0,0,0,0.1)', color: '#666', borderRadius: '50%', 
                            width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '14px'
                        }}
                    >
                        ✕
                    </div>
                )}
            </div>
        </div>
    );
};
