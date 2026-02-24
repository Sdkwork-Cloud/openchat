
import React from 'react';
import { navigate, useQueryParams } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Cell, CellGroup } from '../../../components/Cell';
import { useChatStore } from '../../../services/store';

export const ContactProfilePage: React.FC = () => {
    const { createSession } = useChatStore();
    const query = useQueryParams();
    const name = query.get('name') || 'User';

    const handleSendMessage = async () => {
        const sessionId = await createSession('omni_core');
        navigate('/chat', { id: sessionId });
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)' }}>
            <Navbar title="" variant="transparent" backFallback="/contacts" rightElement={<div style={{padding: '0 12px', fontWeight: 900}}>···</div>} />
            
            <div style={{ background: 'var(--bg-card)', padding: '20px 24px 40px 24px', display: 'flex', marginBottom: '10px', alignItems: 'flex-start', marginTop: '-44px', paddingTop: '64px' }}>
                 <div style={{ width: '70px', height: '70px', borderRadius: '12px', backgroundImage: `url(https://api.dicebear.com/7.x/identicon/svg?seed=${name})`, backgroundSize: 'cover', marginRight: '20px', border: '1px solid var(--border-color)' }}></div>
                 <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>{name}</div>
                     <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>微信号: wxid_{name.toLowerCase()}</div>
                     <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>地区: 中国 上海</div>
                 </div>
            </div>
            
            <CellGroup>
                <Cell title="朋友圈" isLink onClick={() => navigate('/moments')} />
                <Cell title="更多信息" isLink />
            </CellGroup>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '10px' }}>
                <div 
                    onClick={handleSendMessage}
                    style={{ background: 'var(--bg-card)', padding: '16px', textAlign: 'center', color: '#576b95', fontWeight: 600, fontSize: '17px', cursor: 'pointer', borderBottom: '0.5px solid var(--border-color)' }}
                >
                    发消息
                </div>
                <div 
                    onClick={() => navigate('/video-call')}
                    style={{ background: 'var(--bg-card)', padding: '16px', textAlign: 'center', color: 'var(--text-primary)', fontWeight: 600, fontSize: '17px', cursor: 'pointer' }}
                >
                    音视频通话
                </div>
            </div>
        </div>
    );
};
