
import React, { useState, useEffect } from 'react';
import { Platform } from '../../../platform';
import { Popup } from '../../../components/Popup/Popup';
import { NumberKeyboard } from '../../../components/NumberKeyboard/NumberKeyboard';
import { PasswordInput } from '../../../components/PasswordInput/PasswordInput';
import { Cell } from '../../../components/Cell';

interface CashierModalProps {
    visible: boolean;
    amount: number;
    orderId: string;
    onClose: () => void;
    onSuccess: () => void;
}

type PaymentMethod = 'wechat' | 'alipay' | 'balance';
type Step = 'select' | 'password' | 'processing' | 'success';

export const CashierModal: React.FC<CashierModalProps> = ({ visible, amount, orderId, onClose, onSuccess }) => {
    const [step, setStep] = useState<Step>('select');
    const [method, setMethod] = useState<PaymentMethod>('wechat');
    const [password, setPassword] = useState('');
    const [pwdError, setPwdError] = useState(false);

    // Reset state on open
    useEffect(() => {
        if (visible) {
            setStep('select');
            setPassword('');
            setPwdError(false);
        }
    }, [visible]);

    const handleMethodSelect = (m: PaymentMethod) => {
        setMethod(m);
        Platform.device.vibrate(5);
    };

    const handlePayClick = () => {
        setStep('password');
    };

    const handleInput = (key: string) => {
        if (password.length < 6) {
            const nextPwd = password + key;
            setPassword(nextPwd);
            if (nextPwd.length === 6) {
                setTimeout(() => processPayment(nextPwd), 300);
            }
        }
    };

    const handleDelete = () => {
        setPassword(prev => prev.slice(0, -1));
    };

    const processPayment = (finalPwd: string) => {
        // Mock validation
        if (finalPwd === '666666') { // Mock wrong password
             setPwdError(true);
             setTimeout(() => {
                 setPassword('');
                 setPwdError(false);
             }, 600);
             return;
        }

        setStep('processing');
        // Simulate network request
        setTimeout(() => {
            setStep('success');
            Platform.device.vibrate([10, 50, 10]);
            setTimeout(() => {
                onSuccess();
            }, 1500);
        }, 1500);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
    };

    return (
        <>
            <Popup 
                visible={visible} 
                onClose={step === 'password' || step === 'processing' ? undefined : onClose}
                position="bottom" 
                round 
                maskClosable={step !== 'password' && step !== 'processing'}
            >
                <div style={{ display: 'flex', flexDirection: 'column', height: 'auto', minHeight: '300px' }}>
                    {/* Header */}
                    <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '0.5px solid rgba(0,0,0,0.1)', position: 'relative', background: 'var(--bg-card)' }}>
                        <div onClick={onClose} style={{ position: 'absolute', left: 0, padding: '12px 16px', fontSize: '24px', lineHeight: 1, cursor: 'pointer', color: 'var(--text-secondary)', display: (step === 'password' || step === 'processing') ? 'none' : 'block' }}>×</div>
                        {step === 'password' && (
                             <div onClick={() => setStep('select')} style={{ position: 'absolute', left: 0, padding: '12px 16px', fontSize: '15px', cursor: 'pointer', color: 'var(--text-secondary)' }}>返回</div>
                        )}
                        <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>{step === 'password' ? '请输入支付密码' : '确认付款'}</div>
                    </div>

                    {/* Content */}
                    {step === 'select' && (
                        <>
                            <div style={{ padding: '30px', textAlign: 'center', background: 'var(--bg-card)' }}>
                                <div style={{ fontSize: '40px', fontWeight: 700, fontFamily: 'DIN Alternate', color: 'var(--text-primary)' }}>
                                    <span style={{ fontSize: '24px' }}>¥</span>{formatPrice(amount)}
                                </div>
                            </div>

                            <div style={{ padding: '0 16px', background: 'var(--bg-card)', flex: 1 }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>支付方式</div>
                                
                                <Cell 
                                    title="微信支付" 
                                    icon={<div style={{ width: '24px', height: '24px', background: '#07c160', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div>}
                                    onClick={() => handleMethodSelect('wechat')}
                                    rightIcon={<div style={{ width: '20px', height: '20px', borderRadius: '50%', border: method === 'wechat' ? 'none' : '2px solid #ccc', background: method === 'wechat' ? 'var(--primary-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{method === 'wechat' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}</div>}
                                />
                                <Cell 
                                    title="支付宝" 
                                    icon={<div style={{ width: '24px', height: '24px', background: '#1677ff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{color:'white', fontWeight:900, fontSize:'14px'}}>支</span></div>}
                                    onClick={() => handleMethodSelect('alipay')}
                                    rightIcon={<div style={{ width: '20px', height: '20px', borderRadius: '50%', border: method === 'alipay' ? 'none' : '2px solid #ccc', background: method === 'alipay' ? 'var(--primary-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{method === 'alipay' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}</div>}
                                />
                                <Cell 
                                    title="钱包余额" 
                                    label="剩余 ¥8888.00"
                                    icon={<div style={{ width: '24px', height: '24px', background: '#ff9a44', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{color:'white', fontWeight:900, fontSize:'14px'}}>¥</span></div>}
                                    onClick={() => handleMethodSelect('balance')}
                                    rightIcon={<div style={{ width: '20px', height: '20px', borderRadius: '50%', border: method === 'balance' ? 'none' : '2px solid #ccc', background: method === 'balance' ? 'var(--primary-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{method === 'balance' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}</div>}
                                />
                            </div>

                            <div style={{ padding: '20px 16px 40px 16px', background: 'var(--bg-card)' }}>
                                <button 
                                    onClick={handlePayClick}
                                    style={{ 
                                        width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
                                        background: 'var(--primary-gradient)', color: 'white',
                                        fontSize: '17px', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    立即付款
                                </button>
                            </div>
                        </>
                    )}

                    {step === 'password' && (
                        <div style={{ background: 'var(--bg-card)', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '40px 40px', textAlign: 'center' }}>
                                <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '24px' }}>请输入6位支付密码</div>
                                <PasswordInput value={password} focused={true} error={pwdError} />
                                {pwdError && <div style={{ color: '#fa5151', fontSize: '12px', marginTop: '12px' }}>密码错误，请重试</div>}
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div style={{ height: '300px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="spinner-border" style={{ width: '40px', height: '40px', borderWidth: '3px', color: 'var(--primary-color)' }} />
                            <div style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>正在安全支付...</div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div style={{ height: '300px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#07c160', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'popIn 0.3s' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <div style={{ marginTop: '16px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>支付成功</div>
                            <div style={{ marginTop: '8px', fontSize: '24px', fontWeight: 700, fontFamily: 'DIN Alternate', color: 'var(--text-primary)' }}>¥{formatPrice(amount)}</div>
                        </div>
                    )}
                </div>
            </Popup>

            {/* Virtual Keyboard (Only for password step) */}
            <NumberKeyboard 
                visible={step === 'password'} 
                onInput={handleInput} 
                onDelete={handleDelete} 
                onClose={() => {}} // Non-closable via keyboard down, use back button
                showCloseButton={false}
                zIndex={2001}
            />
        </>
    );
};
