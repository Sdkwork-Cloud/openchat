
import React, { useState, useEffect, useRef, memo } from 'react';
import { Skeleton } from '../Skeleton/Skeleton';
import { ImageViewer } from '../ImageViewer/ImageViewer';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    aspectRatio?: string | number; // e.g. "16/9" or 1.77
    radius?: string | number;
    preview?: boolean; // Enable tap to preview
    skeletonVariant?: 'rect' | 'circle';
    fallbackSrc?: string;
    containerStyle?: React.CSSProperties;
    showErrorIcon?: boolean;
    lazy?: boolean; // Toggle intersection observer
}

export const SmartImage: React.FC<SmartImageProps> = memo(({ 
    src, 
    alt, 
    aspectRatio, 
    radius = 0, 
    preview = false, 
    skeletonVariant = 'rect',
    fallbackSrc = 'https://placehold.co/400?text=No+Image',
    className = '',
    style,
    containerStyle,
    onClick,
    showErrorIcon = true,
    lazy = true,
    ...props 
}) => {
    const [status, setStatus] = useState<'pending' | 'loading' | 'loaded' | 'error'>(lazy ? 'pending' : 'loading');
    const [currentSrc, setCurrentSrc] = useState<string | undefined>(undefined);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Intersection Observer for Lazy Loading
    useEffect(() => {
        if (!lazy) {
            setCurrentSrc(src);
            setStatus('loading');
            return;
        }

        let observer: IntersectionObserver;
        const currentRef = containerRef.current;

        if (currentRef && window.IntersectionObserver) {
            observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Start loading
                        setCurrentSrc(src);
                        setStatus('loading');
                        observer.unobserve(currentRef);
                    }
                });
            }, {
                rootMargin: '200px' // Preload 200px before appearing
            });
            observer.observe(currentRef);
        } else {
            // Fallback for no observer support
            setCurrentSrc(src);
            setStatus('loading');
        }

        return () => {
            if (observer && currentRef) observer.unobserve(currentRef);
        };
    }, [src, lazy]);

    const handleLoad = () => {
        setStatus('loaded');
    };

    const handleError = () => {
        if (currentSrc !== fallbackSrc) {
            setStatus('error');
        }
    };

    const handleRetry = (e: React.MouseEvent) => {
        e.stopPropagation();
        setStatus('loading');
        const separator = src.includes('?') ? '&' : '?';
        setCurrentSrc(`${src}${separator}retry=${Date.now()}`);
    };

    const handleClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (status === 'error') return;
        if (onClick) {
            onClick(e);
        } else if (preview && status === 'loaded' && currentSrc) {
            e.stopPropagation();
            ImageViewer.show(currentSrc);
        }
    };

    const computedRadius = typeof radius === 'number' ? `${radius}px` : radius;
    const isCircle = skeletonVariant === 'circle';
    const finalRadius = isCircle ? '50%' : computedRadius;

    // Use padding-bottom trick for aspect ratio if provided, to prevent layout shift
    const ratioStyle: React.CSSProperties = aspectRatio ? {
        aspectRatio: String(aspectRatio)
    } : {};

    return (
        <div 
            ref={containerRef}
            className={`smart-image-container ${className}`}
            style={{ 
                position: 'relative', 
                overflow: 'hidden',
                borderRadius: finalRadius,
                backgroundColor: 'var(--bg-cell-active)', // Placeholder color
                transform: 'translateZ(0)', // GPU Layer
                userSelect: 'none',
                WebkitUserSelect: 'none',
                ...ratioStyle,
                ...containerStyle
            }}
        >
            {/* 1. Skeleton Layer (Visible when pending or loading) */}
            <div style={{ 
                position: 'absolute', inset: 0, zIndex: 1,
                opacity: status === 'loaded' ? 0 : 1,
                transition: 'opacity 0.4s ease-out',
                pointerEvents: 'none'
            }}>
                <Skeleton 
                    width="100%" 
                    height="100%" 
                    variant={skeletonVariant} 
                    style={{ borderRadius: finalRadius }} 
                />
            </div>

            {/* 2. Error Layer */}
            {status === 'error' && showErrorIcon && (
                <div 
                    onClick={handleRetry}
                    style={{ 
                        position: 'absolute', inset: 0, zIndex: 2,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                        color: 'var(--text-secondary)', background: 'var(--bg-cell-active)',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{ fontSize: '20px', marginBottom: '4px', opacity: 0.5 }}>⚠️</div>
                    <div style={{ fontSize: '10px' }}>点击重试</div>
                </div>
            )}

            {/* 3. Image Layer */}
            {currentSrc && (
                <img
                    src={currentSrc}
                    alt={alt}
                    onLoad={handleLoad}
                    onError={handleError}
                    onClick={handleClick}
                    draggable={false}
                    style={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: status === 'loaded' ? 1 : 0,
                        transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth fade-in
                        cursor: (preview || onClick) ? 'pointer' : 'default',
                        willChange: 'opacity',
                        userSelect: 'none',
                        WebkitUserDrag: 'none',
                        ...style
                    }}
                    {...props}
                />
            )}
        </div>
    );
});

SmartImage.displayName = 'SmartImage';
