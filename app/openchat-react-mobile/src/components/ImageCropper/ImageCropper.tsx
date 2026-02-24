
import React, { useState, useRef, useEffect } from 'react';
import { Navbar } from '../Navbar/Navbar';

interface ImageCropperProps {
    imageUrl: string;
    onCancel: () => void;
    onConfirm: (croppedImageBase64: string) => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageUrl, onCancel, onConfirm }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Initial center
    useEffect(() => {
        // Reset position when image loads
        setPosition({ x: 0, y: 0 });
        setScale(1);
    }, [imageUrl]);

    const handlePointerDown = (e: React.PointerEvent | React.TouchEvent) => {
        setDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
        lastPos.current = { x: clientX, y: clientY };
    };

    const handlePointerMove = (e: React.PointerEvent | React.TouchEvent) => {
        if (!dragging) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
        
        const dx = clientX - lastPos.current.x;
        const dy = clientY - lastPos.current.y;
        
        setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastPos.current = { x: clientX, y: clientY };
    };

    const handlePointerUp = () => {
        setDragging(false);
    };

    const handleCrop = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = imageRef.current;
        if (!ctx || !img) return;

        // Output size (Avatar standard)
        const size = 400;
        canvas.width = size;
        canvas.height = size;

        // Calculate source rectangle
        // The crop area is the center of the viewport
        // Viewport center is (window.innerWidth / 2, window.innerHeight / 2)
        // Image center is currently at (window.innerWidth / 2 + position.x, window.innerHeight / 2 + position.y)
        
        // This is a simplified mapping logic for demo robustness:
        // We draw the image onto the canvas with transforms applied inversely
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, size, size);
        
        // 1. Center origin
        ctx.translate(size / 2, size / 2);
        // 2. Apply user transforms
        // Note: Logic needs to map screen pixels to canvas pixels. 
        // Assuming the crop box on screen is e.g. 300px wide.
        const screenCropSize = Math.min(window.innerWidth, window.innerHeight) * 0.8;
        const ratio = size / screenCropSize; // Scale factor from screen to canvas resolution

        ctx.scale(scale * ratio, scale * ratio);
        ctx.translate(position.x, position.y);
        
        // 3. Draw image centered
        // Use natural dimensions
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

        onConfirm(canvas.toDataURL('image/jpeg', 0.9));
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'black', display: 'flex', flexDirection: 'column' }}>
            {/* Top Bar */}
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', color: 'white', zIndex: 20 }}>
                <div onClick={onCancel} style={{ fontSize: '16px', cursor: 'pointer' }}>取消</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>移动和缩放</div>
                <div style={{ width: '32px' }}></div>
            </div>

            {/* Workspace */}
            <div 
                ref={containerRef}
                style={{ flex: 1, position: 'relative', overflow: 'hidden', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
            >
                {/* Image Layer */}
                <img 
                    ref={imageRef}
                    src={imageUrl}
                    style={{ 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                        pointerEvents: 'none', // Let events bubble to container
                        userSelect: 'none'
                    }}
                    alt="Source"
                />

                {/* Overlay Layer (The Mask) */}
                <div style={{ 
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'radial-gradient(transparent 0, transparent 140px, rgba(0,0,0,0.6) 141px)' // Circle cutout radius approx 140px (280px dia)
                }}>
                    {/* Visual Border */}
                    <div style={{ 
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        width: '280px', height: '280px', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '50%',
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' // Fallback dark overlay
                    }} />
                </div>
            </div>

            {/* Bottom Controls */}
            <div style={{ padding: '30px 20px 40px 20px', background: 'black', display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 20 }}>
                {/* Zoom Slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'white', fontSize: '12px' }}>➖</span>
                    <input 
                        type="range" 
                        min="0.5" 
                        max="3" 
                        step="0.05" 
                        value={scale} 
                        onChange={(e) => setScale(parseFloat(e.target.value))}
                        style={{ flex: 1, accentColor: 'white' }} 
                    />
                    <span style={{ color: 'white', fontSize: '12px' }}>➕</span>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <button 
                        onClick={onCancel}
                        style={{ flex: 1, padding: '12px', background: '#333', border: 'none', borderRadius: '8px', color: 'white', fontSize: '16px', fontWeight: 600 }}
                    >
                        重选
                    </button>
                    <button 
                        onClick={handleCrop}
                        style={{ flex: 1, padding: '12px', background: '#07c160', border: 'none', borderRadius: '8px', color: 'white', fontSize: '16px', fontWeight: 600 }}
                    >
                        选取
                    </button>
                </div>
            </div>
        </div>
    );
};
