
import React, { useState, useMemo } from 'react';
import { Navbar } from '../../../components/Navbar/Navbar';
import { WalletService } from '../services/WalletService';
import { navigate } from '../../../router';
import { Cell, CellGroup } from '../../../components/Cell';
import { useCountUp } from '../../../hooks/useCountUp';
import { Grid, GridItem } from '../../../components/Grid/Grid';
import { useLiveQuery } from '../../../core/hooks';
import { StateView } from '../../../components/StateView/StateView';
import { Icon } from '../../../components/Icon/Icon';
import { useTranslation } from '../../../core/i18n/I18nContext';

// --- Components ---

const QuickAction: React.FC<{ 
    icon: string; 
    label: string; 
    subLabel?: string;
    onClick: () => void;
    primary?: boolean;
}> = ({ icon, label, subLabel, onClick, primary }) => (
    <div 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        style={{ 
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: primary ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)', 
            backdropFilter: 'blur(10px)',
            borderRadius: '16px', padding: '16px 0',
            cursor: 'pointer', transition: 'transform 0.1s, background 0.2s',
            border: '1px solid rgba(255,255,255,0.1)'
        }}
        onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
        onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
        <div style={{ fontSize: '24px', marginBottom: '8px', color: 'white' }}>
            <Icon name={icon} size={28} color="white" />
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>{label}</div>
        {subLabel && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{subLabel}</div>}
    </div>
);

export const WalletPage: React.FC = () => { 
    const { t } = useTranslation();
    
    // Persist showBalance in localStorage
    const [showBalance, setShowBalance] = useState(() => {
        return localStorage.getItem('wallet_show_balance') !== 'false';
    });
    
    // Live Queries
    const { data: walletData } = useLiveQuery(
        WalletService,
        () => WalletService.getBalance(),
        { deps: [] }
    );

    const { data: transactionPage, viewStatus, refresh } = useLiveQuery(
        WalletService,
        () => WalletService.getTransactions(1, 5),
        { deps: [] }
    );

    const transactions = transactionPage?.content || [];

    // Animated Values
    const animatedBalance = useCountUp(walletData?.balance || 0, 1500, 2);
    const animatedIncome = useCountUp(walletData?.dailyIncome || 0, 1500, 2);

    const toggleBalance = () => {
        const newState = !showBalance;
        setShowBalance(newState);
        localStorage.setItem('wallet_show_balance', String(newState));
    };
    
    // Memoize Grid Config for reactivity
    const gridItems = useMemo(() => [
        { label: t('wallet.services.credit_card'), icon: '💳', path: '/general?title=信用卡' },
        { label: t('wallet.services.top_up'), icon: '📱', path: '/general?title=充值' },
        { label: t('wallet.services.wealth'), icon: '📈', path: '/general?title=理财' },
        { label: t('wallet.services.utilities'), icon: '⚡', path: '/general?title=生活缴费' },
        { label: t('wallet.services.qb'), icon: '🐧', path: '/general?title=Q币' },
        { label: t('wallet.services.city'), icon: '🏙️', path: '/general?title=城市服务' },
        { label: t('wallet.services.orders'), icon: 'order', path: '/orders', isIconName: true },
        { label: t('wallet.services.charity'), icon: 'heart', path: '/general?title=公益', isIconName: true },
    ], [t]);

    return ( 
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}> 
            
            {/* --- Premium Header Area --- */}
            <div style={{ 
                background: 'linear-gradient(160deg, #004d40 0%, #00695c 40%, #004d40 100%)', 
                position: 'relative',
                overflow: 'hidden',
                paddingBottom: '24px',
                marginBottom: '12px'
            }}>
                {/* Background Decor */}
                <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', opacity: 0.6 }} />
                
                {/* Navbar (Transparent Overlay) */}
                <Navbar 
                    title={t('wallet.title')}
                    variant="transparent" 
                    rightElement={<Icon name="more" size={24} color="white" />} 
                />

                <div style={{ padding: '0 16px', marginTop: '12px' }}>
                    
                    {/* 1. Quick Action Cards Row */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <QuickAction 
                            icon="money-transfer"
                            label={t('wallet.pay')}
                            subLabel={t('wallet.pay_desc')}
                            primary
                            onClick={() => navigate('/scan')} // Mock pay action
                        />
                        <QuickAction 
                            icon="wallet"
                            label={t('wallet.balance')}
                            subLabel={walletData ? `¥${Math.floor(walletData.balance).toLocaleString()}` : '***'}
                            onClick={() => toggleBalance()}
                        />
                    </div>

                    {/* 2. Stats / Balance Strip */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'rgba(255,255,255,0.9)', padding: '0 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={toggleBalance}>
                            <span style={{ fontSize: '14px', opacity: 0.8 }}>{t('wallet.balance_title')}</span>
                            {showBalance ? (
                                <span style={{ fontSize: '20px', fontWeight: 600, fontFamily: 'DIN Alternate' }}>
                                    ¥{Number(animatedBalance).toLocaleString()}
                                </span>
                            ) : (
                                <span style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '2px' }}>****</span>
                            )}
                            <Icon name={showBalance ? 'eye' : 'eye-off'} size={16} color="white" style={{ opacity: 0.6 }} />
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>
                            {t('wallet.income_yesterday')} <span style={{ fontWeight: 600 }}>+{animatedIncome}</span>
                        </div>
                    </div>

                </div>
            </div>
            
            {/* --- Main Content --- */}
            <div style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}> 
                
                {/* Services Grid (Generic) */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>{t('wallet.services_title')}</div>
                    <Grid cols={4} gap={8}>
                        {gridItems.map((item) => ( 
                            <GridItem 
                                key={item.label} 
                                text={item.label}
                                icon={item.isIconName ? <Icon name={item.icon} size={24} /> : <div style={{ fontSize: '24px' }}>{item.icon}</div>} 
                                onClick={() => navigate(item.path)} 
                            />
                        ))} 
                    </Grid> 
                </div>

                {/* Transactions List */}
                <StateView 
                    status={viewStatus} 
                    onRetry={refresh} 
                    emptyText="暂无账单" 
                    emptyIcon="bill"
                >
                    <CellGroup title={t('wallet.bill')} inset>
                        {transactions.map(tx => (
                            <Cell 
                                key={tx.id}
                                icon={
                                    <div style={{ 
                                        width: '40px', height: '40px', borderRadius: '12px', 
                                        background: tx.type === 'income' ? 'rgba(7, 193, 96, 0.1)' : 'rgba(255, 159, 64, 0.1)', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                        color: tx.type === 'income' ? '#07c160' : '#FF9F40', 
                                        fontSize: '18px'
                                    }}>
                                        {tx.type === 'income' ? '↙' : '↗'}
                                    </div>
                                }
                                title={tx.title}
                                label={`${new Date(tx.createTime).toLocaleDateString()} · ${tx.category}`}
                                value={
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span style={{ 
                                            fontSize: '17px', fontWeight: 600, 
                                            color: tx.type === 'income' ? '#07c160' : 'var(--text-primary)', 
                                            fontFamily: 'DIN Alternate, sans-serif' 
                                        }}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                                        </span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-placeholder)', marginTop: '2px' }}>成功</span>
                                    </div>
                                }
                                center
                            />
                        ))}
                    </CellGroup>
                </StateView>

                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    本服务由 Omni Pay 提供支持
                </div>
            </div> 
        </div> 
    );
};
