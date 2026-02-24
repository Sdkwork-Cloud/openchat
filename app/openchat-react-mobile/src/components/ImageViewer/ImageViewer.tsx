
import React, { useState, useEffect, useRef } from 'react';

// Enhanced Event Bus
const viewerState = {
    open: (urls: string[], index = 0) => {},
};

// Math Helpers
const getDistance = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
};

const getCenter = (t1: React.Touch, t2: React.Touch) => {
    return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
    };
};

const ImageViewerContainer: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    
    // Transform State
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [opacity, setOpacity] = useState(1);

    // Refs for Gesture Logic
    const startRef = useRef({ 
        scale: 1, 
        distance: 0, 
        x: 0, y: 0, // Touch start coords
        offsetX: 0, offsetY: 0 // Image offset at start
    });
    
    // To distinguish pan vs zoom vs drag-to-close
    const interactionMode = useRef<'none' | 'pan' | 'zoom' | 'dragClose'>('none');

    useEffect(() => {
        viewerState.open = (urls, index) => {
            setImages(urls);
            setCurrentIndex(index);
            setVisible(true);
            resetTransform();
        };
    }, []);

    const resetTransform = () => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
        setOpacity(1);
        setIsDragging(false);
        interactionMode.current = 'none';
    };

    const handleClose = () => {
        setVisible(false);
        setImages([]);
        resetTransform();
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        const touches = e.touches;

        if (touches.length === 2) {
            // Start Zoom
            interactionMode.current = 'zoom';
            startRef.current.distance = getDistance(touches[0], touches[1]);
            startRef.current.scale = scale;
        } else if (touches.length === 1) {
            // Start Pan or Drag-to-close
            startRef.current.x = touches[0].clientX;
            startRef.current.y = touches[0].clientY;
            startRef.current.offsetX = offset.x;
            startRef.current.offsetY = offset.y;
            
            // If zoomed in, we assume panning. If scale is 1, maybe drag-to-close or swipe (nav)
            interactionMode.current = scale > 1 ? 'pan' : 'dragClose';
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const touches = e.touches;

        // 1. Pinch to Zoom
        if (touches.length === 2 && interactionMode.current === 'zoom') {
            const dist = getDistance(touches[0], touches[1]);
            const scaleFactor = dist / startRef.current.distance;
            const newScale = Math.max(0.5, Math.min(startRef.current.scale * scaleFactor, 5)); // Cap 0.5x to 5x
            setScale(newScale);
            e.preventDefault(); // Prevent browser zoom
            return;
        }

        // 2. Single Finger Move
        if (touches.length === 1) {
            const dx = touches[0].clientX - startRef.current.x;
            const dy = touches[0].clientY - startRef.current.y;

            if (interactionMode.current === 'pan') {
                // Panning zoomed image
                setOffset({
                    x: startRef.current.offsetX + dx,
                    y: startRef.current.offsetY + dy
                });
            } else if (interactionMode.current === 'dragClose') {
                // Dragging to close (only vertical dominant)
                if (scale === 1) {
                    // Physics: Follow finger directly
                    setOffset({ x: dx, y: dy }); // Allow loose movement
                    
                    // Fade out opacity based on vertical movement
                    const newOpacity = Math.max(0, 1 - Math.abs(dy) / 400);
                    setOpacity(newOpacity);
                    
                    // Minor scale down effect
                    const newScale = Math.max(0.5, 1 - Math.abs(dy) / 1000);
                    setScale(newScale);
                }
            }
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);

        if (interactionMode.current === 'zoom') {
            if (scale < 1) {
                // Spring back to 1 if too small
                setScale(1);
            }
            interactionMode.current = 'none';
            return;
        }

        if (interactionMode.current === 'dragClose') {
            // Check if we should close
            if (Math.abs(offset.y) > 100) {
                setVisible(false); // Close immediately for snap feel
                setTimeout(handleClose, 300);
            } else {
                // Reset
                setOffset({ x: 0, y: 0 });
                setScale(1);
                setOpacity(1);
            }
        }
        
        interactionMode.current = 'none';
    };

    const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
        if (scale !== 1) {
            resetTransform();
        } else {
            // Zoom in to 2.5x
            setScale(2.5);
            // Ideally center on tap position, simplified to center for now
        }
    };

    // Nav
    const next = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex < images.length - 1) {
            setCurrentIndex(c => c + 1);
            resetTransform();
        }
    };
    
    const prev = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(c => c - 1);
            resetTransform();
        }
    };

    if (!visible) return null;

    return (
        <div 
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: `rgba(0, 0, 0, ${opacity})`,
                display: 'flex', flexDirection: 'column',
                transition: isDragging ? 'none' : 'background 0.3s ease-out',
                animation: !isDragging && opacity === 1 ? 'fadeIn 0.25s ease-out' : 'none',
                touchAction: 'none'
            }}
        >
            {/* Controls Layer */}
            <div style={{ opacity: opacity, transition: 'opacity 0.2s' }}>
                {images.length > 1 && (
                    <div style={{ position: 'absolute', top: '40px', left: 0, right: 0, textAlign: 'center', color: 'white', fontSize: '16px', fontWeight: 600, zIndex: 10 }}>
                        {currentIndex + 1} / {images.length}
                    </div>
                )}
                
                <div 
                    style={{ position: 'absolute', top: 20, right: 20, padding: 20, zIndex: 20, cursor: 'pointer' }}
                    onClick={handleClose}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
            </div>

            {/* Image Layer */}
            <div 
                style={{ 
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    overflow: 'hidden', width: '100%', height: '100%'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <img 
                    src={images[currentIndex]} 
                    onDoubleClick={handleDoubleTap}
                    style={{ 
                        maxWidth: '100%', maxHeight: '100%', 
                        objectFit: 'contain',
                        transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        cursor: 'grab',
                        willChange: 'transform'
                    }} 
                    draggable={false}
                    alt="Fullscreen"
                />
            </div>

            {/* Navigation (Desktop/Tap) */}
            {images.length > 1 && opacity > 0.8 && (
                <>
                    {currentIndex > 0 && (
                        <div onClick={prev} style={{ position: 'absolute', left: '10px', top: '50%', padding: '16px', cursor: 'pointer', color: 'white', background: 'rgba(0,0,0,0.2)', borderRadius: '50%', backdropFilter: 'blur(2px)' }}>‹</div>
                    )}
                    {currentIndex < images.length - 1 && (
                        <div onClick={next} style={{ position: 'absolute', right: '10px', top: '50%', padding: '16px', cursor: 'pointer', color: 'white', background: 'rgba(0,0,0,0.2)', borderRadius: '50%', backdropFilter: 'blur(2px)' }}>›</div>
                    )}
                </>
            )}
        </div>
    );
};

// Initialize Helper
export const InitImageViewer = () => <ImageViewerContainer />;

// Export API
export const ImageViewer = {
    show: (urls: string | string[], index = 0) => {
        const list = Array.isArray(urls) ? urls : [urls];
        viewerState.open(list, index);
    }
};
