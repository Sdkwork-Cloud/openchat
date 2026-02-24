
import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { navigate } from '../../../router';
import { Toast } from '../../../components/Toast';
import { Input } from '../../../components/Input/Input';
import { Button } from '../../../components/Button/Button';
import { useTranslation } from '../../../core/i18n/I18nContext';
import { Divider } from '../../../components/Divider/Divider';
import { AuthService } from '../services/AuthService';
import { Icon } from '../../../components/Icon/Icon';

const SocialButton = ({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color?: string }) => (
    <div 
        onClick={onClick}
        style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', 
            cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
        }}
        onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
        onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
        <div style={{ 
            width: '50px', height: '50px', borderRadius: '15px', 
            background: 'rgba(255, 255, 255, 0.04)', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            color: color || 'inherit'
        }}>
            {icon}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, opacity: 0.8 }}>{label}</span>
    </div>
);

export const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            Toast.info(t('auth.fill_all'));
            return;
        }
        setLoading(true);
        const success = await login(username, password);
        setLoading(false);
        
        if (success) {
            Toast.success(t('auth.login_success'));
            navigate('/');
        } else {
            Toast.error(t('auth.login_failed'));
        }
    };

    const handleSocialLogin = async (provider: 'github' | 'google' | 'wechat') => {
        Toast.loading(t('auth.authorizing'));
        try {
            const res = await AuthService.loginWithSocial(provider);
            if (res.success && res.data) {
                setTimeout(() => window.location.reload(), 600);
            }
        } catch (e) {
            Toast.error('授权失败');
        }
    };

    return (
        <div style={{ 
            height: '100%', width: '100%', display: 'flex', flexDirection: 'column', 
            background: '#0a0a0a', position: 'relative', overflow: 'hidden'
        }}>
            {/* 顶层光晕装饰 */}
            <div style={{ 
                position: 'absolute', top: '-10%', left: '50%', width: '120%', height: '40%', 
                background: 'radial-gradient(ellipse at center, rgba(41, 121, 255, 0.15) 0%, transparent 70%)', 
                transform: 'translateX(-50%)', zIndex: 0 
            }} />

            <div style={{ 
                flex: 1, padding: '0 32px', display: 'flex', flexDirection: 'column', zIndex: 1,
                overflowY: 'auto', WebkitOverflowScrolling: 'touch'
            }}>
                <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '20px 0 32px' }}>
                    <div style={{ flex: 1.2, minHeight: '10px' }} /> {/* 弹性占位 */}

                    {/* Logo Area */}
                    <div style={{ marginBottom: '24px', textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ 
                            width: '60px', height: '60px', borderRadius: '18px', 
                            background: 'var(--primary-gradient)', 
                            margin: '0 auto 16px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 10px 30px rgba(41, 121, 255, 0.3)',
                            animation: 'popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}>
                            <Icon name="chat" size={30} color="white" strokeWidth={2.5} />
                        </div>
                        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '6px', letterSpacing: '-0.5px' }}>
                            {t('auth.login_title')}
                        </h1>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                            {t('auth.login_subtitle')}
                        </p>
                    </div>

                    <div style={{ flex: 0.4, minHeight: '10px' }} /> {/* 弹性占位 */}

                    {/* Form Area */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
                        <Input 
                            placeholder={t('auth.username_placeholder')} 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            variant="outline"
                            style={{ height: '52px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '14px' }}
                            containerStyle={{ marginBottom: 0 }}
                            prefix={<Icon name="me" size={18} color="rgba(255,255,255,0.3)" />}
                        />
                        <Input 
                            placeholder={t('auth.password_placeholder')} 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            variant="outline"
                            style={{ height: '52px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '14px' }}
                            containerStyle={{ marginBottom: 0 }}
                            prefix={<Icon name="settings" size={18} color="rgba(255,255,255,0.3)" />}
                        />
                    </div>

                    <div style={{ marginTop: '12px', textAlign: 'right', flexShrink: 0 }}>
                        <span 
                            onClick={() => navigate('/forgot-password')}
                            style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer', padding: '4px' }}
                        >
                            {t('auth.forgot_password')}
                        </span>
                    </div>

                    <div style={{ marginTop: '28px', flexShrink: 0 }}>
                        <Button block size="lg" onClick={handleLogin} loading={loading} style={{ height: '54px', borderRadius: '14px', fontSize: '16px' }}>
                            {t('auth.login_btn')}
                        </Button>
                    </div>

                    <div style={{ marginTop: '20px', textAlign: 'center', flexShrink: 0 }}>
                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                            还没有账号？ 
                            <span 
                                onClick={() => navigate('/register')}
                                style={{ color: 'var(--primary-color)', fontWeight: 600, marginLeft: '6px', cursor: 'pointer' }}
                            >
                                {t('auth.register_new')}
                            </span>
                        </p>
                    </div>

                    <div style={{ flex: 1.5, minHeight: '20px' }} /> {/* 弹性占位 */}

                    {/* Social Login Area */}
                    <div style={{ marginTop: 'auto', flexShrink: 0 }}>
                        <Divider style={{ margin: '12px 0', opacity: 0.3 }}>
                            <span style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>{t('auth.social_divider')}</span>
                        </Divider>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '8px' }}>
                            <SocialButton 
                                label="GitHub"
                                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12"/></svg>}
                                onClick={() => handleSocialLogin('github')}
                            />
                            <SocialButton 
                                label="Google"
                                icon={<svg width="22" height="22" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
                                onClick={() => handleSocialLogin('google')}
                            />
                            <SocialButton 
                                label="WeChat"
                                color="#07c160"
                                icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="#07c160"><path d="M8.5 14.5c.3 0 .5-.2.5-.5s-.2-.5-.5-.5-.5.2-.5.5.2.5.5.5zm4 0c.3 0 .5-.2.5-.5s-.2-.5-.5-.5-.5.2-.5.5.2.5.5.5zM21 9.5c0-3.6-3.8-6.5-8.5-6.5s-8.5 2.9-8.5 6.5c0 2 1.2 3.8 3.2 5l-.5 1.5 2-.8c1.2.5 2.5.8 3.8.8.4 0 .8 0 1.2-.1-.2.4-.2.8-.2 1.3 0 3.2 3.1 5.8 7 5.8 1.1 0 2.1-.2 3-.7l1.7.7-.4-1.4c1.8-.9 2.9-2.5 2.9-4.3 0-1.7-1-3.2-2.5-4.2.1-.2.1-.4.1-.6zM15 8.5c.4 0 .8.3.8.8s-.3.8-.8.8-.8-.3-.8-.8.4-.8.8-.8zm-5 0c.4 0 .8.3.8.8s-.3.8-.8.8-.8-.3-.8-.8.4-.8.8-.8zm11 8c0 1.9-2.2 3.5-5 3.5-.8 0-1.5-.1-2.2-.4l-1.3.5.3-1c-1.1-.7-1.8-1.7-1.8-2.6 0-1.9 2.2-3.5 5-3.5s5 1.6 5 3.5z"/></svg>}
                                onClick={() => handleSocialLogin('wechat')}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
