
import React, { useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface ChatContextMenuProps {
  visible: boolean;
  anchorRect: DOMRect | null; 
  onClose: () => void;
  onAction: (action: string) => void;
  isUser: boolean; 
  canRecall: boolean; // New Prop
}

const ACTION_ICON_STYLE = { width: '20px', height: '20px', strokeWidth: '1.8' };

export const ChatContextMenu: React.FC<ChatContextMenuProps> = ({ visible, anchorRect, onClose, onAction, isUser, canRecall }) => {
  const [position, setPosition] = useState<{ top: number, left: number, transformOrigin: string, arrowLeft: number, isBelow: boolean } | null>(null);

  const ACTIONS = [
      { id: 'copy', label: '复制', icon: <svg {...ACTION_ICON_STYLE} viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> },
      { id: 'forward', label: '转发', icon: <svg {...ACTION_ICON_STYLE} viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg> },
      { id: 'reply', label: '引用', icon: <svg {...ACTION_ICON_STYLE} viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg> },
      { id: 'fav', label: '收藏', icon: <svg {...ACTION_ICON_STYLE} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> },
      // Conditional Recall
      ...(canRecall ? [{ id: 'recall', label: '撤回', icon: <svg {...ACTION_ICON_STYLE} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/></svg> }] : []),
      { id: 'delete', label: '删除', icon: <svg {...ACTION_ICON_STYLE} viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>, color: '#ff4d4f' },
  ];

  useLayoutEffect(() => {
    if (visible && anchorRect) {
        calculatePosition();
    }
  }, [visible, anchorRect, canRecall]); // Recalculate if items change

  const calculatePosition = () => {
    if (!anchorRect) return;

    const ITEM_WIDTH = 56;
    const ITEM_COUNT = ACTIONS.length;
    const MENU_WIDTH = (ITEM_WIDTH * ITEM_COUNT) + 16;
    const MENU_HEIGHT = 64; 
    const GAP = 10;
    const SCREEN_W = window.innerWidth;
    const SAFE_MARGIN = 12;

    let left = anchorRect.left + (anchorRect.width / 2) - (MENU_WIDTH / 2);
    if (left < SAFE_MARGIN) left = SAFE_MARGIN;
    if (left + MENU_WIDTH > SCREEN_W - SAFE_MARGIN) left = SCREEN_W - MENU_WIDTH - SAFE_MARGIN;

    let top = anchorRect.top - MENU_HEIGHT - GAP;
    let isBelow = false;
    let transformOrigin = 'bottom center';

    if (top < 60) {
       top = anchorRect.bottom + GAP;
       isBelow = true;
       transformOrigin = 'top center';
    }

    const bubbleCenter = anchorRect.left + (anchorRect.width / 2);
    let arrowLeft = bubbleCenter - left;
    
    if (arrowLeft < 20) arrowLeft = 20;
    if (arrowLeft > MENU_WIDTH - 20) arrowLeft = MENU_WIDTH - 20;

    setPosition({ top, left, transformOrigin, arrowLeft, isBelow });
  };

  if (!visible || !position) return null;

  return createPortal(
    <>
        {/* Backdrop with Blur */}
        <div 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{ 
                position: 'fixed', inset: 0, zIndex: 9998, 
                background: 'rgba(0,0,0,0.15)', 
                backdropFilter: 'blur(3px)',
                WebkitBackdropFilter: 'blur(3px)',
                animation: 'fadeIn 0.2s forwards'
            }} 
        />
        
        <div 
            className="menu-spring-enter"
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 9999,
                background: 'rgba(35, 35, 35, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '16px',
                padding: '0 4px',
                boxShadow: '0 12px 48px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                color: 'white',
                height: '60px',
                transformOrigin: position.transformOrigin,
            }}
        >
            {ACTIONS.map((action, idx) => (
                <div key={action.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <div 
                        onClick={(e) => { e.stopPropagation(); onAction(action.id); }}
                        onTouchStart={(e) => e.currentTarget.style.opacity = '0.5'}
                        onTouchEnd={(e) => e.currentTarget.style.opacity = '1'}
                        style={{ 
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '0 2px', 
                            width: '56px', 
                            height: '60px',
                            cursor: 'pointer',
                            color: action.color || 'white',
                            transition: 'opacity 0.1s'
                        }}
                    >
                        <div style={{ marginBottom: '3px', opacity: 0.95 }}>{action.icon}</div>
                        <div style={{ fontSize: '10px', fontWeight: 500, opacity: 0.9, transform: 'scale(0.9)' }}>{action.label}</div>
                    </div>
                    {idx !== ACTIONS.length - 1 && (
                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />
                    )}
                </div>
            ))}

            <div style={{
                position: 'absolute',
                left: position.arrowLeft,
                [position.isBelow ? 'top' : 'bottom']: -6,
                transform: `translateX(-50%) ${position.isBelow ? 'rotate(180deg)' : ''}`,
                width: 0, height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid rgba(35, 35, 35, 0.85)',
                filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))'
            }} />
        </div>
        <style>{`
            .menu-spring-enter { animation: springIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.15) forwards; }
            @keyframes springIn { 
                0% { opacity: 0; transform: scale(0.5); } 
                100% { opacity: 1; transform: scale(1); } 
            }
        `}</style>
    </>,
    document.body
  );
};
