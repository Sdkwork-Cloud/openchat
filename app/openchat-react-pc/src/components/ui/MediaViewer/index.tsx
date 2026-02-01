/**
 * 媒体查看器组件
 * 
 * 职责：
 * 1. 图片预览（点击放大、缩放、切换）
 * 2. 视频播放（ controls、全屏）
 * 3. 文件预览（下载、打开）
 * 
 * 标准：通用组件，可在任何模块使用
 */

import { memo, useState, useCallback, useEffect } from 'react';

export type MediaType = 'image' | 'video' | 'file';

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  name?: string;
  size?: number;
  thumbnail?: string;
  duration?: number; // 视频时长（秒）
}

interface MediaViewerProps {
  items: MediaItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (item: MediaItem) => void;
}

/**
 * 媒体查看器
 */
export const MediaViewer = memo(({
  items,
  initialIndex = 0,
  isOpen,
  onClose,
  onDownload,
}: MediaViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  const currentItem = items[currentIndex];

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
    }
  }, [isOpen, initialIndex]);

  // 键盘事件
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'ArrowRight':
          handleNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, items.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    setScale(1);
  }, [items.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    setScale(1);
  }, [items.length]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !currentItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center space-x-4">
          <span className="text-white text-sm">
            {currentIndex + 1} / {items.length}
          </span>
          {currentItem.name && (
            <span className="text-white/70 text-sm truncate max-w-[300px]">
              {currentItem.name}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* 缩放控制（仅图片） */}
          {currentItem.type === 'image' && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="缩小"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-white text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="放大"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </>
          )}
          {/* 下载按钮 */}
          <button
            onClick={() => onDownload?.(currentItem)}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="下载"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="关闭 (Esc)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 媒体内容 */}
      <div className="flex items-center justify-center w-full h-full p-16">
        {currentItem.type === 'image' && (
          <img
            src={currentItem.url}
            alt={currentItem.name || '图片'}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${scale})` }}
            draggable={false}
          />
        )}

        {currentItem.type === 'video' && (
          <video
            src={currentItem.url}
            controls
            autoPlay
            className="max-w-full max-h-full"
            poster={currentItem.thumbnail}
          >
            您的浏览器不支持视频播放
          </video>
        )}

        {currentItem.type === 'file' && (
          <div className="flex flex-col items-center justify-center p-12 bg-[#1E293B] rounded-2xl border border-[rgba(255,255,255,0.1)]">
            <div className="w-24 h-24 mb-6 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center">
              <svg className="w-12 h-12 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-medium mb-2">{currentItem.name || '未知文件'}</h3>
            <p className="text-[#94A3B8] text-sm mb-6">{formatFileSize(currentItem.size)}</p>
            <button
              onClick={() => onDownload?.(currentItem)}
              className="px-6 py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>下载文件</span>
            </button>
          </div>
        )}
      </div>

      {/* 切换按钮（多文件时显示） */}
      {items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
            title="上一个 (←)"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
            title="下一个 (→)"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* 底部信息栏 */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/50 to-transparent">
        <div className="flex items-center justify-center space-x-4 text-white/70 text-sm">
          {currentItem.size && <span>大小: {formatFileSize(currentItem.size)}</span>}
          {currentItem.duration && <span>时长: {formatDuration(currentItem.duration)}</span>}
        </div>
      </div>
    </div>
  );
});

MediaViewer.displayName = 'MediaViewer';

export default MediaViewer;
