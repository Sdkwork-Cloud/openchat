/**
 * 濯掍綋鏌ョ湅鍣ㄧ粍浠? * 
 * 鑱岃矗锛? * 1. 鍥剧墖棰勮锛堢偣鍑绘斁澶с€佺缉鏀俱€佸垏鎹級
 * 2. 瑙嗛鎾斁锛?controls銆佸叏灞忥級
 * 3. 鏂囦欢棰勮锛堜笅杞姐€佹墦寮€锛? * 
 * 鏍囧噯锛氶€氱敤缁勪欢锛屽彲鍦ㄤ换浣曟ā鍧椾娇鐢? */

import { memo, useState, useCallback, useEffect } from 'react';

export type MediaType = 'image' | 'video' | 'file';

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  name?: string;
  size?: number;
  thumbnail?: string;
  duration?: number; // 瑙嗛鏃堕暱锛堢锛?}

interface MediaViewerProps {
  items: MediaItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (item: MediaItem) => void;
}

/**
 * 濯掍綋鏌ョ湅鍣? */
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

  // 閲嶇疆鐘舵€?  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
    }
  }, [isOpen, initialIndex]);

  // 閿洏浜嬩欢
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      {/* 椤堕儴宸ュ叿鏍?*/}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent z-10">
        <div className="flex items-center space-x-4">
          <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-sm">
            <span className="text-white text-xs font-bold tracking-wider">
              {currentIndex + 1} / {items.length}
            </span>
          </div>
          {currentItem.name && (
            <span className="text-white font-medium text-sm truncate max-w-[400px] drop-shadow-md">
              {currentItem.name}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {/* 缂╂斁鎺у埗锛堜粎鍥剧墖锛?*/}
          {currentItem.type === 'image' && (
            <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl border border-white/10 p-1">
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-90"
                title="缂╁皬"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-white text-xs font-bold min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-90"
                title="鏀惧ぇ"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}
          {/* 涓嬭浇鎸夐挳 */}
          <button
            onClick={() => onDownload?.(currentItem)}
            className="p-2.5 bg-white/10 backdrop-blur-md text-white/80 hover:text-white hover:bg-primary rounded-xl border border-white/10 transition-all shadow-sm active:scale-95"
            title="涓嬭浇"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          {/* 鍏抽棴鎸夐挳 */}
          <button
            onClick={onClose}
            className="p-2.5 bg-white/10 backdrop-blur-md text-white/80 hover:text-white hover:bg-error rounded-xl border border-white/10 transition-all shadow-sm active:scale-95"
            title="鍏抽棴 (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 濯掍綋鍐呭 */}
      <div className="flex items-center justify-center w-full h-full p-8 md:p-16 overflow-hidden">
        {currentItem.type === 'image' && (
          <img
            src={currentItem.url}
            alt={currentItem.name || '鍥剧墖'}
            className="max-w-full max-h-full object-contain transition-all duration-300 shadow-2xl animate-in zoom-in-95"
            style={{ transform: `scale(${scale})` }}
            draggable={false}
          />
        )}

        {currentItem.type === 'video' && (
          <div className="relative max-w-full max-h-full rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 border border-white/10">
            <video
              src={currentItem.url}
              controls
              autoPlay
              className="max-w-full max-h-[80vh]"
              poster={currentItem.thumbnail}
            >
              鎮ㄧ殑娴忚鍣ㄤ笉鏀寔瑙嗛鎾斁
            </video>
          </div>
        )}

        {currentItem.type === 'file' && (
          <div className="flex flex-col items-center justify-center p-16 bg-bg-elevated/80 backdrop-blur-xl rounded-[32px] border border-border shadow-2xl animate-in zoom-in-95 max-w-lg w-full">
            <div className="w-24 h-24 mb-8 rounded-[24px] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow-primary">
              <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-text-primary text-2xl font-bold mb-3 text-center">{currentItem.name || '鏈煡鏂囦欢'}</h3>
            <p className="text-text-tertiary text-sm mb-8 font-medium">{formatFileSize(currentItem.size)}</p>
            <button
              onClick={() => onDownload?.(currentItem)}
              className="px-8 py-3.5 bg-primary hover:bg-primary-hover text-white text-base font-bold rounded-2xl transition-all shadow-glow-primary flex items-center space-x-3 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>绔嬪嵆涓嬭浇</span>
            </button>
          </div>
        )}
      </div>

      {/* 鍒囨崲鎸夐挳锛堝鏂囦欢鏃舵樉绀猴級 */}
      {items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-4 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full transition-all border border-white/5 hover:border-white/20 active:scale-90"
            title="涓婁竴涓?(鈫?"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-4 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full transition-all border border-white/5 hover:border-white/20 active:scale-90"
            title="涓嬩竴涓?(鈫?"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* 搴曢儴淇℃伅鏍?*/}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-5 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-center space-x-6 text-white/60 text-xs font-bold tracking-widest uppercase">
          {currentItem.size && <span>Size: {formatFileSize(currentItem.size)}</span>}
          {currentItem.duration && <span>Duration: {formatDuration(currentItem.duration)}</span>}
        </div>
      </div>
    </div>
  );
});

MediaViewer.displayName = 'MediaViewer';

export default MediaViewer;

