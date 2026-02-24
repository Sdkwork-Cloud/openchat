
import React, { useState, useRef } from 'react';
import { navigate, navigateBack } from '../../../router';
import { Page } from '../../../components/Page/Page'; 
import { Cell, CellGroup } from '../../../components/Cell';
import { UserService, UserProfile } from '../services/UserService';
import { Toast } from '../../../components/Toast';
import { ProfileEditSheet } from '../components/ProfileEditSheet';
import { GenderSheet } from '../components/GenderSheet';
import { RegionSheet } from '../components/RegionSheet';
import { Platform } from '../../../platform';
import { ImageCropper } from '../../../components/ImageCropper/ImageCropper';
import { Spinner } from '../../../components/Spinner/Spinner';
import { useLiveQuery } from '../../../core/hooks';
import { StateView } from '../../../components/StateView/StateView';
import { Icon } from '../../../components/Icon/Icon';
import { useTranslation } from '../../../core/i18n/I18nContext';

export const ProfileInfoPage: React.FC = () => {
    const { t } = useTranslation();
    
    // Live Query for automatic updates
    const { data: profile, viewStatus, refresh } = useLiveQuery(
        UserService,
        () => UserService.getProfile(),
        { deps: [] }
    );

    const [activeSheet, setActiveSheet] = useState<'none' | 'name' | 'signature' | 'gender' | 'region'>('none');
    const [isUploading, setIsUploading] = useState(false);
    const [tempImage, setTempImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpdate = async (field: keyof UserProfile, value: any) => {
        if (!profile) return;
        const res = await UserService.updateInfo({ [field]: value });
        if (!res.success) {
            Toast.error('更新失败');
            refresh();
        }
    };

    const handleCopyWXID = () => {
        if (profile?.wxid) {
            Platform.clipboard.write(profile.wxid);
            Platform.device.vibrate(10);
            Toast.success(t('profile.actions.copied'));
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            Toast.error('图片过大，请选择小于 10MB 的图片');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setTempImage(reader.result as string);
        };
        reader.readAsDataURL(file);
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCropConfirm = async (base64: string) => {
        setTempImage(null); 
        setIsUploading(true);
        try {
            const res = await fetch(base64);
            const blob = await res.blob();
            const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });

            const uploadRes = await UserService.uploadAvatar(file);
            if (uploadRes.success && uploadRes.data) {
                await handleUpdate('avatar', uploadRes.data);
                Toast.success('头像已更新');
            }
        } catch (error) {
            Toast.error('上传出错');
        } finally {
            setIsUploading(false);
        }
    };

    const AvatarValue = (
        <div style={{ position: 'relative', width: '64px', height: '64px' }}>
            {profile && (
                <img 
                    src={profile.avatar} 
                    style={{ 
                        width: '100%', height: '100%', borderRadius: '10px', 
                        objectFit: 'cover', background: '#f5f5f5', 
                        border: '0.5px solid rgba(0,0,0,0.1)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }} 
                />
            )}
            {isUploading && (
                <div style={{
                    position: 'absolute', inset: 0, borderRadius: '10px',
                    background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Spinner size={20} color="white" />
                </div>
            )}
        </div>
    );

    return (
        <Page title={t('profile.title')} onBack={() => navigateBack('/me')}>
            <StateView status={viewStatus} onRetry={refresh}>
                {profile && (
                    <>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />

                        {tempImage && (
                            <ImageCropper 
                                imageUrl={tempImage} 
                                onCancel={() => setTempImage(null)} 
                                onConfirm={handleCropConfirm} 
                            />
                        )}

                        <div style={{ marginTop: '12px' }}>
                            <CellGroup>
                                <Cell 
                                    title={t('profile.avatar')}
                                    value={AvatarValue} 
                                    isLink
                                    center
                                    style={{ minHeight: '88px' }}
                                    onClick={() => fileInputRef.current?.click()} 
                                />
                                <Cell title={t('profile.name')} value={profile.name} isLink onClick={() => setActiveSheet('name')} />
                                <Cell 
                                    title={t('profile.wxid')}
                                    value={profile.wxid} 
                                    style={{ opacity: 1 }} 
                                    valueStyle={{ color: 'var(--text-secondary)' }} 
                                    onClick={handleCopyWXID}
                                />
                                <Cell 
                                    title={t('profile.qrcode')}
                                    value={
                                        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                                            <Icon name="qrcode" size={18} />
                                        </div>
                                    }
                                    isLink 
                                    onClick={() => navigate('/profile/qrcode')} 
                                />
                            </CellGroup>
                        </div>

                        <div style={{ marginTop: '12px' }}>
                            <CellGroup>
                                <Cell 
                                    title={t('profile.gender')}
                                    value={profile.gender === 'male' ? t('profile.gender_value.male') : t('profile.gender_value.female')} 
                                    isLink 
                                    onClick={() => setActiveSheet('gender')}
                                />
                                <Cell 
                                    title={t('profile.region')}
                                    value={profile.region} 
                                    isLink 
                                    onClick={() => setActiveSheet('region')} 
                                />
                                <Cell 
                                    title={t('profile.signature')}
                                    value={<span style={{maxWidth: '200px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle'}}>{profile.signature || '未填写'}</span>} 
                                    isLink 
                                    onClick={() => setActiveSheet('signature')}
                                />
                            </CellGroup>
                        </div>

                        <div style={{ marginTop: '12px' }}>
                            <CellGroup>
                                <Cell title={t('profile.address')} isLink onClick={() => navigate('/my-address')} />
                                <Cell title={t('profile.invoice')} isLink onClick={() => navigate('/profile/invoice')} />
                            </CellGroup>
                        </div>

                        {/* Edit Sheets */}
                        <ProfileEditSheet 
                            visible={activeSheet === 'name'} 
                            title={t('profile.name')}
                            value={profile.name}
                            onClose={() => setActiveSheet('none')}
                            onSave={(val) => handleUpdate('name', val)}
                        />

                        <ProfileEditSheet 
                            visible={activeSheet === 'signature'} 
                            title={t('profile.signature')}
                            value={profile.signature}
                            maxLength={60}
                            multiline
                            onClose={() => setActiveSheet('none')}
                            onSave={(val) => handleUpdate('signature', val)}
                        />

                        <GenderSheet 
                            visible={activeSheet === 'gender'} 
                            current={profile.gender}
                            onClose={() => setActiveSheet('none')} 
                            onSelect={(g) => { handleUpdate('gender', g); setActiveSheet('none'); }} 
                        />

                        <RegionSheet
                            visible={activeSheet === 'region'}
                            current={profile.region}
                            onClose={() => setActiveSheet('none')}
                            onSelect={(r) => { handleUpdate('region', r); setActiveSheet('none'); }}
                        />
                    </>
                )}
            </StateView>
        </Page>
    );
};
