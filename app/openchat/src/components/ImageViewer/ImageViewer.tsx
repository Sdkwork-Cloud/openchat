
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// Simple Event Bus for the Singleton Viewer
const viewerState = {
    open: (url: string) => {},
};

const ImageViewerContainer: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [scale, setScale] = useState(1);

    useEffect(() => {
        viewerState.open = (url) => {
            setImageUrl(url);
            setVisible(true);
            setScale(1);
        };
    }, []);

    if (!visible) return null;

    const handleClose = () => {
        setVisible(false);
    };

    return (
        <div 
            onClick={handleClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.95)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'fadeIn 0.2s ease-out'
            }}
        >
            <img 
                src={imageUrl} 
                onClick={(e) => e.stopPropagation()} 
                style={{ 
                    maxWidth: '100%', maxHeight: '100%', 
                    objectFit: 'contain',
                    transform: `scale(${scale})`,
                    transition: 'transform 0.2s'
                }} 
                alt="Fullscreen"
            />
            {/* Close Button */}
            <div 
                onClick={handleClose}
                style={{
                    position: 'absolute', top: '40px', right: '20px',
                    width: '40px', height: '40px',
                    background: 'rgba(255,255,255,0.1)', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer'
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
        </div>
    );
};

// Initialize Helper
export const InitImageViewer = () => <ImageViewerContainer />;

// Export API
export const ImageViewer = {
    show: (url: string) => viewerState.open(url)
};
