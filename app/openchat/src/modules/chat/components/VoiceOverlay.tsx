
import React from 'react';

interface VoiceOverlayProps {
    isRecording: boolean;
    cancelVoice: boolean;
}

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ isRecording, cancelVoice }) => {
    if (!isRecording) return null;
    return (
        <div style={{
            position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
            zIndex: 9999, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)',
            transition: 'background 0.2s'
        }}>
            <div style={{
                width: '180px', height: '180px', 
                background: cancelVoice ? '#fa5151' : 'rgba(30, 30, 30, 0.95)', 
                borderRadius: '24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: cancelVoice ? 'scale(1.05)' : 'scale(1)'
            }}>
                 <div style={{ 
                     fontSize: '50px', marginBottom: '16px', 
                     color: 'white', 
                     transition: 'all 0.2s',
                     transform: cancelVoice ? 'rotate(-15deg)' : 'rotate(0)'
                 }}>
                     {cancelVoice ? '↩️' : '🎙️'}
                 </div>
                 
                 {/* Status Text */}
                 <div style={{ 
                     fontSize: '14px', fontWeight: 500, color: 'white',
                     background: cancelVoice ? 'rgba(0,0,0,0.1)' : 'transparent',
                     padding: '4px 8px', borderRadius: '4px'
                 }}>
                     {cancelVoice ? '松开取消' : '手指上滑取消'}
                 </div>

                 {/* Waveform Animation */}
                 {!cancelVoice && (
                     <div style={{ 
                         position: 'absolute', bottom: '24px', 
                         display: 'flex', gap: '4px', height: '24px', alignItems: 'center' 
                     }}>
                         {[1,2,3,4,5,6,7].map(i => (
                             <div key={i} style={{ 
                                 width: '3px', 
                                 background: '#07c160', 
                                 borderRadius: '2px', 
                                 animation: `wave 0.6s ease-in-out infinite ${i*0.08}s` 
                             }} />
                         ))}
                     </div>
                 )}
            </div>
             <style>{`
                @keyframes wave { 
                    0%, 100% { height: 4px; opacity: 0.5; } 
                    50% { height: 20px; opacity: 1; } 
                }
             `}</style>
        </div>
    );
};
