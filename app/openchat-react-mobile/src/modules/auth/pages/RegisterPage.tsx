
import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { navigate, navigateBack } from '../../../router';
import { Toast } from '../../../components/Toast';
import { Input } from '../../../components/Input/Input';
import { Button } from '../../../components/Button/Button';
import { Navbar } from '../../../components/Navbar/Navbar';
import { useTranslation } from '../../../core/i18n/I18nContext';
import { Icon } from '../../../components/Icon/Icon';

export const RegisterPage: React.FC = () => {
    const { register } = useAuth();
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!username || !password) {
            Toast.info(t('auth.fill_all'));
            return;
        }
        if (password.length < 6) {
            Toast.error(t('auth.password_short'));
            return;
        }
        if (password !== confirm) {
            Toast.error(t('auth.password_mismatch'));
            return;
        }

        setLoading(true);
        const success = await register(username, password);
        setLoading(false);
        
        if (success) {
            Toast.success(t('auth.register_success'));
            navigate('/');
        } else {
            Toast.error(t('auth.register_failed'));
        }
    };

    // 严谨对标登录页的输入框样式
    const inputStyle = {
        height: '52px',
        background: 'rgba(255,255,255,0.02)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: '14px',
        fontSize: '15px'
    };

    return (
        <div style={{ height: '100%', width: '100%', background: '#0a0a0a', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <Navbar title="" onBack={() => navigateBack('/login')} variant="transparent" />
            
            {/* 顶层光晕装饰 - 与登录页完全一致 */}
            <div style={{ 
                position: 'absolute', top: '-10%', left: '50%', width: '120%', height: '40%', 
                background: 'radial-gradient(ellipse at center, rgba(41, 121, 255, 0.15) 0%, transparent 70%)', 
                transform: 'translateX(-50%)', zIndex: 0 
            }} />

            <div style={{ 
                flex: 1, padding: '0 32px', display: 'flex', flexDirection: 'column', zIndex: 1,
                overflowY: 'auto', WebkitOverflowScrolling: 'touch'
            }}>
                <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', paddingBottom: '32px' }}>
                    
                    <div style={{ flex: 0.8, minHeight: '10px' }} />

                    {/* Logo & Title Area - 统一尺寸 */}
                    <div style={{ marginBottom: '24px', textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ 
                            width: '60px', height: '60px', borderRadius: '18px', 
                            background: 'rgba(41, 121, 255, 0.1)', 
                            border: '1px solid rgba(41, 121, 255, 0.2)',
                            margin: '0 auto 20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 24px rgba(41, 121, 255, 0.15)',
                            animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}>
                            <Icon name="add-circle" size={30} color="var(--primary-color)" strokeWidth={2.5} />
                        </div>
                        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '6px', letterSpacing: '-0.5px' }}>
                            {t('auth.register_title')}
                        </h1>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                            {t('auth.create_subtitle')}
                        </p>
                    </div>

                    <div style={{ flex: 0.2 }} />

                    {/* Form Area - 移除外部 Label，使用 Placeholder 和 Icon 对标登录页 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
                        <Input 
                            placeholder={t('auth.username_placeholder')} 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            variant="outline"
                            style={inputStyle}
                            containerStyle={{ marginBottom: 0 }}
                            prefix={<Icon name="me" size={18} color="rgba(255,255,255,0.3)" />}
                        />
                        <Input 
                            placeholder={t('auth.password_placeholder')} 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            variant="outline"
                            style={inputStyle}
                            containerStyle={{ marginBottom: 0 }}
                            prefix={<Icon name="settings" size={18} color="rgba(255,255,255,0.3)" />}
                            clearable
                        />
                        <Input 
                            placeholder={t('auth.confirm_password_desc')} 
                            type="password" 
                            value={confirm} 
                            onChange={e => setConfirm(e.target.value)} 
                            variant="outline"
                            style={inputStyle}
                            containerStyle={{ marginBottom: 0 }}
                            prefix={<Icon name="check" size={18} color="rgba(255,255,255,0.3)" />}
                            clearable
                        />
                    </div>

                    <div style={{ marginTop: '32px', flexShrink: 0 }}>
                        <Button block size="lg" onClick={handleRegister} loading={loading} style={{ height: '54px', borderRadius: '14px', fontSize: '16px' }}>
                            {t('auth.register_btn')}
                        </Button>
                    </div>

                    <div style={{ flex: 1, minHeight: '20px' }} />

                    {/* Footer Policy - 紧致排版 */}
                    <div style={{ marginTop: 'auto', textAlign: 'center', flexShrink: 0 }}>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                            点击提交即表示您同意我们的 
                            <span style={{ color: 'var(--primary-color)', fontWeight: 600, margin: '0 4px', cursor: 'pointer' }}>用户协议</span> 
                            与 
                            <span style={{ color: 'var(--primary-color)', fontWeight: 600, margin: '0 4px', cursor: 'pointer' }}>隐私政策</span>
                        </p>
                    </div>

                    <div style={{ height: 'env(safe-area-inset-bottom)' }} />
                </div>
            </div>
        </div>
    );
};
