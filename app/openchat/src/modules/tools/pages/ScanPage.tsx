
import React, { useEffect, useRef, useState } from 'react';
import { Navbar } from '../../../components/Navbar/Navbar';
import { navigateBack } from '../../../router';
import { Toast } from '../../../components/Toast';
import { ScanService } from '../services/ScanService';

export const ScanPage: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasCamera, setHasCamera] = useState(false);
    const [flashlight, setFlashlight] = useState(false);

    useEffect(() => {
        let stream: MediaStream | null = null;

        const startCamera = async () => {
            try {
                // Request camera
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setHasCamera(true);
                    
                    // Simulate a scan success after 3 seconds for demo
                    setTimeout(async () => {
                        await ScanService.logScan('https://openchat.ai/qr/demo', 'qrcode');
                        Toast.success('模拟扫描成功');
                    }, 3000);
                }
            } catch (err) {
                console.warn("Camera access denied or unavailable", err);
                setHasCamera(false);
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const toggleFlashlight = () => {
        setFlashlight(!flashlight);
        // Note: Real flashlight control in browser requires advanced ImageCapture API 
        // or native plugin, which is outside basic getUserMedia scope.
        // We simulate UI state here.
        if (!flashlight) {
            Toast.info('已开启手电筒 (模拟)');
        }
    };

    return (
        <div style={{ height: '100%', background: '#000', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Top Bar */}
            <div style={{ position: 'absolute', top: 0, width: '100%', zIndex: 30 }}>
                <Navbar 
                    title="扫一扫" 
                    variant="transparent" 
                    onBack={() => navigateBack()}
                />
            </div>

            {/* Camera Layer */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                {hasCamera ? (
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    // Fallback Animation
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #1a1a1a, #2a2a2a)', position: 'relative' }}>
                        <div style={{ 
                            position: 'absolute', inset: 0, opacity: 0.2, 
                            backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
                            backgroundSize: '40px 40px' 
                        }}></div>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#555', fontSize: '14px' }}>
                            未检测到摄像头
                        </div>
                    </div>
                )}
            </div>
            
            {/* Overlay Layer */}
            <div style={{ 
                position: 'absolute', inset: 0, zIndex: 10, 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' 
            }}>
                {/* 
                   The Scanner Box 
                   Using box-shadow for the dark overlay: simple, robust, performant.
                */}
                <div style={{ 
                    width: '260px', 
                    height: '260px', 
                    position: 'relative',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' // The magic cutout
                }}>
                    {/* Corner Markers */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTop: '4px solid #2979FF', borderLeft: '4px solid #2979FF' }} /> 
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTop: '4px solid #2979FF', borderRight: '4px solid #2979FF' }} /> 
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottom: '4px solid #2979FF', borderLeft: '4px solid #2979FF' }} /> 
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottom: '4px solid #2979FF', borderRight: '4px solid #2979FF' }} /> 
                    
                    {/* Scanning Laser */}
                    <div style={{ 
                        position: 'absolute', left: 0, right: 0, height: '2px', 
                        background: 'linear-gradient(90deg, transparent, #2979FF, transparent)', 
                        boxShadow: '0 0 15px rgba(41, 121, 255, 0.8)',
                        animation: 'scanMove 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite' 
                    }} /> 
                </div> 
                
                <div style={{ marginTop: '30px', color: 'rgba(255,255,255,0.8)', fontSize: '13px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                    将二维码/条码放入框内，即可自动扫描
                </div>
            </div>

            {/* Bottom Controls */}
            <div style={{ 
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
                height: '120px', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(5px)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-around',
                paddingBottom: 'env(safe-area-inset-bottom)'
            }}>
                <div onClick={() => Toast.info('打开相册')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: 0.9 }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                    <span style={{ color: 'white', fontSize: '12px' }}>相册</span>
                </div>

                {/* Shutter / Scan Button (Visual only since auto-scan is implied) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transform: 'translateY(-10px)' }}>
                    <div style={{ width: '64px', height: '64px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #000' }} />
                    </div>
                </div>

                <div onClick={toggleFlashlight} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: 0.9 }}>
                    <div style={{ width: '48px', height: '48px', background: flashlight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={flashlight ? '#000' : 'white'} strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    </div>
                    <span style={{ color: 'white', fontSize: '12px' }}>{flashlight ? '已开启' : '手电筒'}</span>
                </div>
            </div>

            <style>{`
                @keyframes scanMove { 
                    0% { top: 10px; opacity: 0; } 
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 250px; opacity: 0; } 
                }
            `}</style> 
        </div>
    );
};
