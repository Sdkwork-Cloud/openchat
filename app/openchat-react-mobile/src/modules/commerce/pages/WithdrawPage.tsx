
import React, { useState, useEffect } from 'react';
import { navigateBack, navigate } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { DistributionService, Distributor } from '../services/DistributionService';
import { Toast } from '../../../components/Toast';
import { Button } from '../../../components/Button/Button';

export const WithdrawPage: React.FC = () => {
    const [info, setInfo] = useState<Distributor | null>(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [method, setMethod] = useState<'wechat' | 'bank'>('wechat');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const res = await DistributionService.getMyDistributorInfo();
        if (res.success && res.data) setInfo(res.data);
    };

    const handleAll = () => {
        if (info) setAmount(info.withdrawableCommission.toString());
    };

    const handleWithdraw = async () => {
        const val = parseFloat(amount);
        if (!val || val <= 0) {
            Toast.info('请输入提现金额');
            return;
        }
        if (info && val > info.withdrawableCommission) {
            Toast.error('余额不足');
            return;
        }

        setLoading(true);
        // Simulate network
        setTimeout(async () => {
            await DistributionService.withdraw(val);
            Toast.success('申请成功，预计2小时内到账');
            setLoading(false);
            navigateBack();
        }, 1500);
    };

    const handleHistory = () => {
        navigate('/commerce/distribution/commission'); // Reuse commission page's withdraw tab logic if implemented there, or separate
    };

    if (!info) return <div />;

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar 
                title="提现" 
                onBack={() => navigateBack()} 
                rightElement={
                    <div onClick={handleHistory} style={{ fontSize: '14px', padding: '0 12px', cursor: 'pointer' }}>记录</div>
                }
            />
            
            <div style={{ margin: '16px', background: 'var(--bg-card)', borderRadius: '12px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>到账账户</span>
                    <div 
                        onClick={() => setMethod(prev => prev === 'wechat' ? 'bank' : 'wechat')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                    >
                        {method === 'wechat' ? (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#07c160"><path d="M8 5v14l11-7z"/></svg>
                                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>微信零钱</span>
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1677ff"><path d="M4 4h16v16H4z"/></svg>
                                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>工商银行(8888)</span>
                            </>
                        )}
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>▼</span>
                    </div>
                </div>

                <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '16px' }}>提现金额</div>
                
                <div style={{ display: 'flex', alignItems: 'baseline', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '32px', fontWeight: 600, marginRight: '8px' }}>¥</span>
                    <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        autoFocus
                        style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '36px', outline: 'none', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'DIN Alternate' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>可提现余额 ¥{info.withdrawableCommission.toFixed(2)}</span>
                    <span onClick={handleAll} style={{ color: 'var(--primary-color)', cursor: 'pointer' }}>全部提现</span>
                </div>

                <div style={{ marginTop: '32px' }}>
                    <Button 
                        block 
                        size="lg" 
                        disabled={!amount || parseFloat(amount) <= 0 || loading}
                        loading={loading}
                        onClick={handleWithdraw}
                        style={{
                            background: '#07c160', // WeChat Green for standard withdraw feel
                            borderColor: 'transparent'
                        }}
                    >
                        提现
                    </Button>
                </div>
                
                <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--text-placeholder)' }}>
                    提现免手续费，单笔限额 5000 元
                </div>
            </div>
        </div>
    );
};
