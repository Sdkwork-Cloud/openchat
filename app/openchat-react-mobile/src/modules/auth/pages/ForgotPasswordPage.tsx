
import React, { useState } from 'react';
import { navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Toast } from '../../../components/Toast';
import { Input } from '../../../components/Input/Input';
import { Button } from '../../../components/Button/Button';
import { useTranslation } from '../../../core/i18n/I18nContext';
import { Icon } from '../../../components/Icon/Icon';

export const ForgotPasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [isSent, setIsSent] = useState(false);

    const handleSendCode = () => {
        if (!email || !email.includes('@')) {
            Toast.error('请输入有效的邮箱地址');
            return;
        }
        
        Toast.loading('正在发送...');
        setTimeout(() => {
            Toast.success('重置邮件已发送');
            setIsSent(true);
        }, 1200);
    };

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="" onBack={() => navigateBack('/login')} variant="transparent" />
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ minHeight: '100%', padding: '0 32px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    {!isSent ? (
                        <>
                            <div style={{ 
                                width: '64px', height: '64px', borderRadius: '50%', 
                                background: 'rgba(255, 154, 68, 0.1)', color: '#ff9a44',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <Icon name="bell" size={28} />
                            </div>
                            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>
                                {t('auth.recover_title')}
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px', padding: '0 10px', opacity: 0.8 }}>
                                {t('auth.recover_desc')}
                            </p>
                            
                            <Input 
                                placeholder={t('auth.input_contact')} 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                variant="outline"
                                style={{ height: '50px' }}
                                prefix={<span style={{fontSize: '16px'}}>✉️</span>}
                            />
                            
                            <div style={{ marginTop: '28px' }}>
                                <Button block size="lg" onClick={handleSendCode} style={{ height: '52px', borderRadius: '14px' }}>
                                    {t('auth.send_code')}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div style={{ animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                            <div style={{ 
                                width: '72px', height: '72px', borderRadius: '50%', 
                                background: '#07c160', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px', boxShadow: '0 8px 20px rgba(7, 193, 96, 0.2)'
                            }}>
                                <Icon name="check" size={36} strokeWidth={3} />
                            </div>
                            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>
                                邮件已发出
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}>
                                我们已向 <b>{email}</b> 发送了一封重置密码邮件，请在 30 分钟内点击邮件中的链接完成操作。
                            </p>
                            <Button block variant="outline" onClick={() => navigateBack('/login')} style={{ borderRadius: '14px' }}>
                                返回登录
                            </Button>
                        </div>
                    )}

                    <div style={{ marginTop: '40px', fontSize: '12px', color: 'var(--text-placeholder)', opacity: 0.6 }}>
                        遇到困难？<span style={{ color: 'var(--primary-color)', cursor: 'pointer' }}>联系技术支持</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
