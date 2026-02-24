
import React from 'react';
import { Toast } from '../../../components/Toast';

interface QRCodeActionSheetProps {
    visible: boolean;
    onClose: () => void;
    onStyleChange: (style: 'classic' | 'dot' | 'liquid') => void;
}

export const QRCodeActionSheet: React.FC<QRCodeActionSheetProps> = ({ visible, onClose, onStyleChange }) => {
    if (!visible) return null;
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 900, animation: 'fadeIn 0.2s forwards' }} />
            <div style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                background: 'var(--bg-card)', zIndex: 901, 
                borderRadius: '12px 12px 0 0', overflow: 'hidden',
                animation: 'slideUp 0.3s cubic-bezier(0.19, 1, 0.22, 1) forwards',
                paddingBottom: 'env(safe-area-inset-bottom)'
            }}>
                <div 
                    onClick={() => { Toast.success('已保存到相册'); onClose(); }} 
                    style={{ padding: '16px', textAlign: 'center', borderBottom: '0.5px solid var(--border-color)', fontSize: '17px', color: 'var(--text-primary)', background: 'var(--bg-card)', cursor: 'pointer' }}
                >
                    保存图片
                </div>
                <div 
                    onClick={() => { onStyleChange('dot'); onClose(); }} 
                    style={{ padding: '16px', textAlign: 'center', borderBottom: '0.5px solid var(--border-color)', fontSize: '17px', color: 'var(--text-primary)', background: 'var(--bg-card)', cursor: 'pointer' }}
                >
                    换个样式
                </div>
                <div 
                    onClick={onClose} 
                    style={{ padding: '16px', textAlign: 'center', fontSize: '17px', color: 'var(--text-primary)', fontWeight: 600, background: 'var(--bg-card)', borderTop: '8px solid var(--bg-body)', cursor: 'pointer' }}
                >
                    取消
                </div>
            </div>
        </>
    );
};
