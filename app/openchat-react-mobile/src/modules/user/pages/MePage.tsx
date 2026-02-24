
import React, { useEffect, useState } from 'react';
import { navigate } from '../../../router';
import { Cell, CellGroup } from '../../../components/Cell';
import { UserService, UserProfile } from '../services/UserService';
import { Toast } from '../../../components/Toast';
import { Skeleton } from '../../../components/Skeleton/Skeleton';
import { FluidCard } from '../../../components/FluidCard/FluidCard'; 
import { Sound } from '../../../utils/sound'; 
import { Icon } from '../../../components/Icon/Icon';
import { useTranslation } from '../../../core/i18n/I18nContext';

const UserHeader = ({ profile, loading }: { profile: UserProfile | null, loading: boolean }) => {
    const handleStatusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        Sound.click();
        const statuses = ['✨ Feeling lucky', '💻 Coding', '☕ Coffee time', '🌙 Sleeping'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        Toast.success(`状态已更新: ${randomStatus}`);
    };

    if (loading || !profile) {
        return (
            <div style={{ padding: '24px 16px', marginBottom: '10px' }}>
                <Skeleton width="100%" height={160} variant="rect" style={{ borderRadius: '16px' }} />
            </div>
        );
    }

    return (
        <div style={{ padding: '12px 12px 0 12px', marginBottom: '12px' }}>
            <FluidCard onClick={() => navigate('/profile/self')} height="180px">
                <div style={{ 
                    position: 'absolute', inset: 0, 
                    display: 'flex', alignItems: 'center', padding: '0 24px', 
                    color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ 
                        width: '72px', height: '72px', 
                        borderRadius: '50%', 
                        marginRight: '20px',
                        backgroundImage: `url(${profile.avatar})`,
                        backgroundSize: 'cover',
                        border: '3px solid rgba(255,255,255,0.3)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}></div>
                    
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>{profile.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontSize: '13px', opacity: 0.9, fontFamily: 'monospace' }}>ID: {profile.wxid}</div>
                            <div style={{ color: 'rgba(255,255,255,0.6)' }} onClick={(e) => { e.stopPropagation(); navigate('/profile/qrcode'); }}>
                                <Icon name="qrcode" size={16} strokeWidth={2.5} color="currentColor" />
                            </div>
                        </div>
                        
                        <div 
                            onClick={handleStatusClick}
                            style={{ 
                                marginTop: '12px', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                padding: '4px 12px', 
                                borderRadius: '16px', 
                                background: 'rgba(255,255,255,0.15)', 
                                backdropFilter: 'blur(4px)',
                                cursor: 'pointer',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}
                        >
                            <span style={{ fontSize: '12px', fontWeight: 500 }}>
                                {profile.status.isActive ? `${profile.status.icon} ${profile.status.text}` : '+ Set Status'}
                            </span>
                        </div>
                    </div>
                    
                    <div style={{ opacity: 0.5 }}>
                        <Icon name="arrow-right" size={24} color="white" />
                    </div>
                </div>
            </FluidCard>
        </div>
    );
};

export const MePage: React.FC = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const load = async () => {
          setLoading(true);
          await new Promise(r => setTimeout(r, 400));
          const res = await UserService.getProfile();
          if (res.success && res.data) {
              setProfile(res.data);
          }
          setLoading(false);
      };
      load();
  }, []);

  return (
    <div style={{ background: 'var(--bg-body)', minHeight: '100%', paddingBottom: '20px' }}>
      
      <UserHeader profile={profile} loading={loading} />

      {/* Group 1: Income & Assets */}
      <CellGroup>
        <Cell 
            title={t('me.pay_service')}
            icon={<Icon name="wallet" color="#07c160" />}
            isLink
            onClick={() => navigate('/wallet')}
        />
        <Cell 
            title={t('me.distribution')} 
            icon={<Icon name="distribution" color="var(--primary-color)" />}
            isLink
            onClick={() => navigate('/commerce/distribution')}
        />
        <Cell 
            title={t('me.gigs')} 
            icon={<Icon name="gig" color="#ff9a44" />}
            isLink
            onClick={() => navigate('/my-gigs')}
        />
      </CellGroup>

      {/* Group 2: Creative & Productivity */}
      <CellGroup>
        <Cell 
            title={t('me.creations')} 
            icon={<Icon name="creation" color="#FF9C6E" />}
            isLink
            onClick={() => navigate('/my-creations')} 
        />
        <Cell 
            title={t('me.agents')} 
            icon={<Icon name="agents" color="#7928CA" />}
            isLink
            onClick={() => navigate('/my-agents')} 
        />
      </CellGroup>

      {/* Group 3: Social & Life & Commerce */}
      <CellGroup>
        <Cell 
            title="朋友圈" 
            icon={<Icon name="moments" color="#4080ff" />}
            isLink
            onClick={() => navigate('/moments')}
        />
        <Cell 
            title="购物车" 
            icon={<Icon name="shop" color="#fa5151" />}
            isLink
            onClick={() => navigate('/commerce/cart')}
        />
        <Cell 
            title={t('me.favorites')} 
            icon={<Icon name="favorites" color="#E6A23C" />}
            isLink
            onClick={() => navigate('/favorites')}
        />
        <Cell 
            title={t('me.cards')} 
            icon={<Icon name="card" color="#4080ff" />}
            isLink
            onClick={() => navigate('/general', { title: '卡包' })}
        />
        <Cell 
            title={t('me.orders')} 
            icon={<Icon name="order" color="#ff9a44" />}
            label="消费订单"
            isLink
            onClick={() => navigate('/orders')}
        />
        <Cell 
            title="预约服务" 
            icon={<Icon name="service" color="#2979FF" />}
            isLink
            onClick={() => navigate('/appointments')}
        />
      </CellGroup>

      <CellGroup>
        <Cell 
            title={t('me.settings')}
            icon={<Icon name="settings" color="#7585a9" />}
            isLink
            onClick={() => navigate('/settings')}
        />
      </CellGroup>
    </div>
  );
};
