
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '../../../components/Navbar/Navbar';
import { navigateBack } from '../../../router';
import { Toast } from '../../../components/Toast';
import { Platform } from '../../../platform';

export const ShakePage: React.FC = () => {
    const [isShaking, setIsShaking] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    // Simulate accelerometer for demo
    useEffect(() => {
        // In a real app, window.addEventListener('devicemotion', handleMotion);
        return () => {};
    }, []);

    const triggerShake = () => {
        if (isShaking) return;
        
        setIsShaking(true);
        setResult(null);
        Platform.device.vibrate(200);
        
        // Mock Sound
        // const audio = new Audio('/shake_sound.mp3'); audio.play();

        setTimeout(() => {
            Platform.device.vibrate(100);
            setIsShaking(false);
            
            // Random Result
            const people = ['Nearby: Alice', 'Nearby: Bob', 'Nearby: Mystery User'];
            setResult(people[Math.floor(Math.random() * people.length)]);
        }, 2000);
    };

    return (
        <div style={{ height: '100%', background: '#2e3132', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <Navbar title="摇一摇" variant="transparent" onBack={() => navigateBack()} />
            
            <div 
                onClick={triggerShake}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
                {/* Top Half */}
                <div style={{ 
                    position: 'absolute', top: '50%', left: '50%', 
                    width: '150px', height: '150px', 
                    transform: isShaking ? 'translate(-50%, -160%)' : 'translate(-50%, -100%)', // Shift up
                    transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/1200px-WhatsApp.svg.png" style={{ width: '100%', filter: 'grayscale(100%) brightness(2)' }} alt="" />
                    {/* Hide bottom half of image via clip-path or simple overflow trick */}
                    <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '50%', background: '#2e3132' }}></div>
                </div>

                {/* Bottom Half */}
                <div style={{ 
                    position: 'absolute', top: '50%', left: '50%', 
                    width: '150px', height: '150px', 
                    transform: isShaking ? 'translate(-50%, 60%)' : 'translate(-50%, 0%)', // Shift down
                    transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/1200px-WhatsApp.svg.png" style={{ width: '100%', filter: 'grayscale(100%) brightness(2)' }} alt="" />
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '50%', background: '#2e3132' }}></div>
                </div>
                
                {/* Center Icon (Hand) - Replaces the above complex split image logic for simplicity in this demo */}
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <div className={isShaking ? 'shake-anim' : ''} style={{ fontSize: '120px' }}>
                         📱
                     </div>
                     <div style={{ color: '#aaa', marginTop: '40px', fontSize: '14px' }}>
                         {isShaking ? '正在搜索同一时刻摇晃手机的人...' : '点击屏幕或摇动手机'}
                     </div>
                </div>
            </div>

            {/* Result Card */}
            {result && !isShaking && (
                <div style={{ 
                    position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)', 
                    background: 'var(--bg-card)', padding: '12px 24px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '12px', animation: 'fadeIn 0.3s'
                }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: '#ccc' }}></div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{result}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>100m away</div>
                    </div>
                </div>
            )}

            <style>{`
                .shake-anim { animation: shake 1s infinite; }
                @keyframes shake {
                    0% { transform: rotate(0deg); }
                    25% { transform: rotate(-15deg); }
                    50% { transform: rotate(0deg); }
                    75% { transform: rotate(15deg); }
                    100% { transform: rotate(0deg); }
                }
            `}</style>
        </div>
    );
};
