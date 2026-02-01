/**
 * 懒加载图片组件
 *
 * 职责：实现图片懒加载 + Blurhash 占位 + 平滑过渡
 */

import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { decode } from 'blurhash';

interface LazyImageProps {
  src: string;
  alt: string;
  blurhash?: string;
  width?: number;
  height?: number;
  className?: string;
  placeholderColor?: string;
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Blurhash Canvas 组件
 */
const BlurhashCanvas = memo(
  ({ hash, width, height }: { hash: string; width: number; height: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      if (!canvasRef.current || !hash) return;

      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 解码 Blurhash
        const pixels = decode(hash, width, height);

        // 创建 ImageData
        const imageData = ctx.createImageData(width, height);
        imageData.data.set(pixels);

        // 绘制到 canvas
        ctx.putImageData(imageData, 0, 0);
      } catch (error) {
        console.error('Blurhash decode error:', error);
      }
    }, [hash, width, height]);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: 'blur(20px)',
          transform: 'scale(1.1)',
        }}
      />
    );
  }
);

BlurhashCanvas.displayName = 'BlurhashCanvas';

/**
 * 懒加载图片组件
 */
export const LazyImage = memo(
  ({
    src,
    alt,
    blurhash,
    width = 32,
    height = 32,
    className = '',
    placeholderColor = '#1E293B',
    rootMargin = '50px',
    threshold = 0.1,
    onLoad,
    onError,
  }: LazyImageProps) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [hasError, setHasError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // 使用 Intersection Observer 检测是否在视口内
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        {
          rootMargin,
          threshold,
        }
      );

      observer.observe(container);

      return () => observer.disconnect();
    }, [rootMargin, threshold]);

    // 处理图片加载完成
    const handleLoad = useCallback(() => {
      setIsLoaded(true);
      onLoad?.();
    }, [onLoad]);

    // 处理图片加载错误
    const handleError = useCallback(() => {
      setHasError(true);
      onError?.();
    }, [onError]);

    // 预加载图片
    useEffect(() => {
      if (!isInView || !src) return;

      const img = new Image();
      img.src = src;
      img.onload = handleLoad;
      img.onerror = handleError;

      return () => {
        img.onload = null;
        img.onerror = null;
      };
    }, [isInView, src, handleLoad, handleError]);

    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        style={{ backgroundColor: placeholderColor }}
      >
        {/* Blurhash 占位 */}
        {!isLoaded && blurhash && (
          <BlurhashCanvas hash={blurhash} width={width} height={height} />
        )}

        {/* 纯色占位 */}
        {!isLoaded && !blurhash && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{ backgroundColor: placeholderColor }}
          />
        )}

        {/* 实际图片 */}
        {isInView && !hasError && (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            decoding="async"
          />
        )}

        {/* 错误占位 */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1E293B]">
            <svg
              className="w-8 h-8 text-[#64748B]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
    );
  }
);

LazyImage.displayName = 'LazyImage';

export default LazyImage;
