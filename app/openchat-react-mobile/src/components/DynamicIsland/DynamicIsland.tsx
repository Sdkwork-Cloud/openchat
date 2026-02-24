
import React, { useState, useEffect, useRef } from 'react';
import { AppEvents, EVENTS } from '../../core/events';

type IslandStatus = 'idle' | 'loading' | 'success' | 'error' | 'music';

interface IslandState {
    status: IslandStatus;
    message: string;
}

export const DynamicIsland: React.FC = () => {
    const [state, setState] = useState<IslandState>({ status: 'idle', message: '' });
    const timerRef = useRef<any>(null);

    useEffect(() => {
        const handler = (payload: any) => {
            const { status, message, duration } = payload;
            
            // Clear existing auto-hide timer if new state comes in
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            setState({ status, message: message || '' });

            // Auto revert to idle for success/error/music (after duration)
            if (status === 'success' || status === 'error' || (status === 'music' && duration)) {
                timerRef.current = setTimeout(() => {
                    setState({ status: 'idle', message: '' });
                }, duration || 2000);
            }
        };

        const unsub = AppEvents.on(EVENTS.STATUS_CHANGE, handler);
        return () => {
            unsub();
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    // Calculate dimensions based on state
    let width = 120; // Default collapsed width (invisible but occupies space logic)
    let height = 36;
    let opacity = 0;
    let translateY = -100;

    if (state.status !== 'idle') {
        opacity = 1;
        translateY = 12; // Top margin
        if (state.status === 'loading') {
            width = 180;
            height = 44;
        } else if (state.status === 'success' || state.status === 'error') {
            width = 220;
            height = 44;
        } else if (state.status === 'music') {
            width = 200;
            height = 44;
        }
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: '50%',
            transform: `translateX(-50%) translateY(${translateY}px)`,
            width: `${width}px`,
            height: `${height}px`,
            background: 'black',
            borderRadius: '22px',
            zIndex: 99999,
            transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            pointerEvents: 'none', // Allow clicks to pass through usually, unless interactive
            opacity: opacity
        }}>
            <div style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', 
                padding: '0 16px', width: '100%', justifyContent: 'center',
                opacity: state.status === 'idle' ? 0 : 1,
                transition: 'opacity 0.2s 0.1s' // Delay text show until expanded
            }}>
                {state.status === 'loading' && (
                    <>
                        <div className="island-spinner" />
                        <span style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>{state.message || 'Processing...'}</span>
                    </>
                )}
                
                {state.status === 'success' && (
                    <>
                        <div style={{ color: '#07c160', fontSize: '16px' }}>✓</div>
                        <span style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>{state.message}</span>
                    </>
                )}

                {state.status === 'error' && (
                    <>
                        <div style={{ color: '#fa5151', fontSize: '16px' }}>✕</div>
                        <span style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>{state.message}</span>
                    </>
                )}

                {state.status === 'music' && (
                    <>
                        <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '16px' }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="island-wave" style={{ animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>{state.message}</span>
                    </>
                )}
            </div>

            <style>{`
                .island-spinner {
                    width: 18px; height: 18px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    borderRadius: 50%;
                    animation: spin 1s linear infinite;
                }
                .island-wave {
                    width: 3px; background: #07c160; borderRadius: 2px;
                    animation: island-wave-anim 0.8s ease-in-out infinite;
                }
                @keyframes island-wave-anim {
                    0%, 100% { height: 6px; }
                    50% { height: 16px; }
                }
            `}</style>
        </div>
    );
};
