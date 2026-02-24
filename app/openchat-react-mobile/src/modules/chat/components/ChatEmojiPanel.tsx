
import React from 'react';

interface ChatEmojiPanelProps {
    visible: boolean;
    onSelect: (emoji: string) => void;
    onDelete?: () => void;
}

const EMOJIS = [
    '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','😗',
    '😙','😚','🙂','🤗','🤔','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯',
    '😪','😫','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲',
    '☹️','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰',
    '😱','😳','🤪','😵','😡','😠','🤬','😷','🤒','🤕','🤢','🤮','🤧','😇','🤠',
    '🤡','🤥','🤫','🤭','🧐','🤓','😈','👿','👹','👺','💀','👻','👽','🤖','💩',
    '😺','😸','😹','😻','😼','😽','🙀','😿','😾','👋','🤚','🖐','✋','🖖','👌',
    '✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊',
    '🤛','🤜','👏','🙌','👐','🤲','🤝','🙏'
];

export const ChatEmojiPanel: React.FC<ChatEmojiPanelProps> = React.memo(({ visible, onSelect, onDelete }) => {
    return (
        <div style={{
            height: visible ? '260px' : '0px',
            overflowY: 'auto',
            transition: 'height 0.25s cubic-bezier(0.19, 1, 0.22, 1)',
            background: 'var(--bg-body)',
            borderTop: visible ? '0.5px solid var(--border-color)' : 'none',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ 
                padding: '12px', 
                display: 'grid', 
                gridTemplateColumns: 'repeat(8, 1fr)', 
                gap: '12px 0',
                justifyItems: 'center'
            }}>
                {EMOJIS.map((emoji, idx) => (
                    <div 
                        key={idx}
                        onClick={() => onSelect(emoji)}
                        style={{ 
                            fontSize: '24px', 
                            cursor: 'pointer',
                            userSelect: 'none',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            transition: 'background 0.1s'
                        }}
                        onTouchStart={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                        onTouchEnd={(e) => e.currentTarget.style.background = 'transparent'}
                        onMouseDown={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                        onMouseUp={(e) => e.currentTarget.style.background = 'transparent'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        {emoji}
                    </div>
                ))}
            </div>
            
            {/* Delete Button (Optional simulation) */}
            {onDelete && (
                <div 
                    onClick={onDelete}
                    style={{
                        position: 'fixed', bottom: '20px', right: '20px',
                        width: '44px', height: '34px', background: 'var(--bg-card)',
                        borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)', border: '0.5px solid var(--border-color)',
                        zIndex: 10, cursor: 'pointer'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                </div>
            )}
        </div>
    );
});
