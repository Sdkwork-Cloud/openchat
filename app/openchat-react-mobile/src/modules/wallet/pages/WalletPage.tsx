
import React, { useState, useEffect } from 'react';
import { Navbar } from '../../../components/Navbar/Navbar';
import { WalletService, WalletData } from '../services/WalletService';
import { Platform } from '../../../platform';

// Lightweight SVG Chart
const SimpleChart = () => (
    <svg width="100%" height="60" viewBox="0 0 300 60" preserveAspectRatio="none">
        <path d="M0,50 Q30,45 60,30 T120,20 T180,35 T240,10 T300,25" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        <path d="M0,50 Q30,45 60,30 T120,20 T180,35 T240,10 T300,25 V60 H0 Z" fill="rgba(255,255,255,0.1)" />
    </svg>
);

export const WalletPage: React.FC = () => { 
    const [showBalance, setShowBalance] = useState(false); 
    const [walletData, setWalletData] = useState<WalletData | null>(null);

    useEffect(() => {
        const load = async () => {
            const res = await WalletService.getBalance();
            if (res.success && res.data) {
                setWalletData(res.data);
            }
        };
        load();
    }, []);

    const toggleBalance = () => {
        Platform.device.vibrate(5);
        setShowBalance(!showBalance);
    };
    
    return ( 
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}> 
            <Navbar title="" variant="transparent" rightElement={<div style={{fontWeight:600, color: 'white'}}>···</div>} />
            
            <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '-44px' }}> 
                {/* Header Card */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #07c160 0%, #05a050 100%)', 
                    borderRadius: '12px', 
                    padding: '64px 24px 0 24px', 
                    color: 'white', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between', 
                    height: '240px', 
                    boxShadow: '0 8px 20px rgba(7, 193, 96, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                }}> 
                    {/* Background Pattern */}
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ position: 'absolute', bottom: -40, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}> 
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}> 
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg> 
                            <span style={{ fontSize: '18px', fontWeight: 500 }}>收付款</span> 
                        </div> 
                        <span style={{ fontSize: '14px', opacity: 0.8 }}>零钱通 &gt;</span> 
                    </div> 
                    
                    <div onClick={toggleBalance} style={{ cursor: 'pointer', zIndex: 1, marginTop: '20px' }}> 
                        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}> 
                            总资产 (元) {showBalance ? '👁️' : '🙈'} 
                        </div> 
                        <div style={{ fontSize: '40px', fontWeight: 'bold', fontFamily: 'DIN Alternate, sans-serif' }}> 
                            {walletData && showBalance ? walletData.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '****.**'} 
                        </div> 
                        <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                            昨日收益 +{walletData?.dailyIncome}
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div style={{ marginTop: 'auto', marginBottom: '0', marginLeft: '-24px', marginRight: '-24px' }}>
                        <SimpleChart />
                    </div>
                </div> 
                
                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px 10px', background: 'var(--bg-card)', padding: '24px 16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}> 
                    {['账单', '转账', '信用卡', '充值', '理财', '汇率', '公益', 'Q币'].map((item, i) => ( 
                        <div key={item} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}> 
                            <div style={{ 
                                width: '48px', height: '48px', borderRadius: '16px', 
                                background: i < 4 ? 'rgba(7, 193, 96, 0.08)' : 'rgba(255, 159, 64, 0.08)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                color: i < 4 ? '#07c160' : '#FF9F40', fontSize: '22px',
                                transition: 'transform 0.1s'
                            }}> 
                                {i < 4 ? '¥' : '★'} 
                            </div> 
                            <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{item}</span> 
                        </div> 
                    ))} 
                </div> 

                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px', marginTop: 'auto' }}>
                    本服务由 Omni Pay 提供支持
                </div>
            </div> 
        </div> 
    );
};
