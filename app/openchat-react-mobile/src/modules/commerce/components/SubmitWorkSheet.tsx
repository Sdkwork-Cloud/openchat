
import React, { useState, useRef, useEffect } from 'react';
import { Toast } from '../../../components/Toast';
import { GigType } from '../services/GigService';

interface SubmitWorkSheetProps {
    visible: boolean;
    type: GigType; // 'design' or 'video_edit'
    onClose: () => void;
    onSubmit: (data: SubmissionData) => void;
}

export interface SubmissionData {
    mainFile: File;
    mainPreview: string;
    prompt: string;
    references: File[];
}

const UploadBox = ({ 
    file, 
    preview, 
    type, 
    onClick, 
    onRemove 
}: { 
    file: File | null; 
    preview: string | null; 
    type: 'image' | 'video' | 'mixed'; 
    onClick: () => void; 
    onRemove?: () => void 
}) => {
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {file && preview ? (
                <div style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-color)' }}>
                    {file.type.startsWith('video') ? (
                        <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '32px' }}>🎬</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', padding: '0 8px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{file.name}</div>
                        </div>
                    ) : (
                        <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    
                    {onRemove && (
                        <div 
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            style={{ 
                                position: 'absolute', top: 4, right: 4, 
                                background: 'rgba(0,0,0,0.6)', borderRadius: '50%', 
                                width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '12px', cursor: 'pointer', zIndex: 10
                            }}
                        >
                            ✕
                        </div>
                    )}
                </div>
            ) : (
                <div 
                    onClick={onClick}
                    style={{ 
                        width: '100%', height: '100%', borderRadius: '12px', 
                        border: '2px dashed var(--border-color)', background: 'var(--bg-body)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>
                        {type === 'video' ? '📹' : (type === 'mixed' ? '📂' : '📷')}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {type === 'video' ? '上传成品视频' : (type === 'mixed' ? '添加素材' : '上传成品图')}
                    </div>
                </div>
            )}
        </div>
    );
};

export const SubmitWorkSheet: React.FC<SubmitWorkSheetProps> = ({ visible, type, onClose, onSubmit }) => {
    const [mainFile, setMainFile] = useState<File | null>(null);
    const [mainPreview, setMainPreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [references, setReferences] = useState<{file: File, preview: string}[]>([]);
    
    const mainInputRef = useRef<HTMLInputElement>(null);
    const refInputRef = useRef<HTMLInputElement>(null);

    // Reset on open
    useEffect(() => {
        if (visible) {
            setMainFile(null);
            setMainPreview(null);
            setPrompt('');
            setReferences([]);
        }
    }, [visible]);

    if (!visible) return null;

    const handleMainFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMainFile(file);
            setMainPreview(URL.createObjectURL(file));
        }
        e.target.value = ''; // Reset
    };

    const handleRefFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newRefs = Array.from(files).map((f) => ({
                file: f as File,
                preview: URL.createObjectURL(f as Blob)
            }));
            setReferences(prev => [...prev, ...newRefs]);
        }
        e.target.value = ''; // Reset
    };

    const handleSubmit = () => {
        if (!mainFile || !mainPreview) {
            Toast.info('请先上传主交付作品');
            return;
        }
        onSubmit({
            mainFile,
            mainPreview,
            prompt,
            references: references.map(r => r.file)
        });
    };

    const isVideoTask = type === 'video_edit';

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 950, animation: 'fadeIn 0.2s forwards' }} />
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 951,
                background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
                display: 'flex', flexDirection: 'column', maxHeight: '90vh',
                paddingBottom: 'env(safe-area-inset-bottom)',
                animation: 'slideUpPanel 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.2)'
            }}>
                {/* Inputs Hidden */}
                <input 
                    type="file" 
                    ref={mainInputRef} 
                    accept={isVideoTask ? "video/*" : "image/*"} 
                    style={{display:'none'}} 
                    onChange={handleMainFile} 
                />
                <input 
                    type="file" 
                    ref={refInputRef} 
                    accept={isVideoTask ? "image/*,video/*,audio/*" : "image/*"} 
                    multiple 
                    style={{display:'none'}} 
                    onChange={handleRefFile} 
                />

                {/* Header */}
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid var(--border-color)' }}>
                    <div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>交付工坊</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {isVideoTask ? '视频剪辑任务' : '平面设计任务'}
                        </div>
                    </div>
                    <div onClick={onClose} style={{ padding: '8px', cursor: 'pointer', background: 'var(--bg-body)', borderRadius: '50%' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    
                    {/* Section 1: Main Deliverable */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>核心交付物 <span style={{color: '#fa5151'}}>*</span></span>
                            {mainFile && <span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>{(mainFile.size / 1024 / 1024).toFixed(2)} MB</span>}
                        </div>
                        <div style={{ width: '100%', height: isVideoTask ? '180px' : '240px' }}>
                            <UploadBox 
                                file={mainFile} 
                                preview={mainPreview} 
                                type={isVideoTask ? 'video' : 'image'} 
                                onClick={() => mainInputRef.current?.click()} 
                                onRemove={() => { setMainFile(null); setMainPreview(null); }}
                            />
                        </div>
                    </div>

                    {/* Section 2: Prompt / Description */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                            {isVideoTask ? '创作脚本 / 制作说明' : '设计提示词 (Prompt)'}
                        </div>
                        <textarea 
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder={isVideoTask ? "请简述剪辑思路、BGM选择或特效说明..." : "请填写用于生成的提示词，或简述创作思路..."}
                            style={{
                                width: '100%', height: '80px', padding: '12px', borderRadius: '12px',
                                background: 'var(--bg-body)', border: 'none',
                                fontSize: '14px', color: 'var(--text-primary)', outline: 'none', resize: 'none'
                            }}
                        />
                    </div>

                    {/* Section 3: References */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>参考素材 / 原始资产</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                {isVideoTask ? '支持图片、视频、音频' : '支持参考图'}
                            </span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                            {references.map((ref, idx) => (
                                <div key={idx} style={{ aspectRatio: '1/1' }}>
                                    <UploadBox 
                                        file={ref.file} 
                                        preview={ref.preview} 
                                        type="mixed"
                                        onClick={() => {}} // No action on click for existing
                                        onRemove={() => setReferences(prev => prev.filter((_, i) => i !== idx))}
                                    />
                                </div>
                            ))}
                            {/* Add Button */}
                            <div style={{ aspectRatio: '1/1' }}>
                                <UploadBox 
                                    file={null} 
                                    preview={null} 
                                    type="mixed" 
                                    onClick={() => refInputRef.current?.click()} 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                    <button 
                        onClick={handleSubmit}
                        disabled={!mainFile}
                        style={{
                            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                            background: mainFile ? 'var(--primary-gradient)' : 'var(--bg-cell-active)',
                            color: mainFile ? 'white' : 'var(--text-secondary)',
                            fontSize: '16px', fontWeight: 600, cursor: mainFile ? 'pointer' : 'not-allowed',
                            boxShadow: mainFile ? '0 4px 12px rgba(41, 121, 255, 0.3)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        确认交付
                    </button>
                </div>
            </div>
        </>
    );
};
