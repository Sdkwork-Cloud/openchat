
import React from 'react';
import { navigate } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Cell, CellGroup } from '../../../components/Cell';
import { useChatStore } from '../../../services/store';
import { Toast } from '../../../components/Toast';

export const ProfileInfoPage: React.FC = () => {
    const { createSession } = useChatStore();
    
    // Hardcoded for "Me"
    const name = 'AI User'; 

    const handleSendMessage = () => {
        const sessionId = createSession('omni_core');
        navigate('/chat', { id: sessionId });
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)' }}>
            <Navbar title="个人信息" />
            
            <div style={{ background: 'var(--bg-card)', padding: '40px 24px', display: 'flex', marginBottom: '12px', alignItems: 'flex-start', borderBottom: '0.5px solid var(--border-color)' }}>
                 <div style={{ 
                     width: '70px', height: '70px', borderRadius: '10px', 
                     backgroundImage: `url(https://api.dicebear.com/7.x/avataaars/svg?seed=Felix)`, 
                     backgroundSize: 'cover', marginRight: '20px',
                     boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                 }}></div>
                 <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>{name}</div>
                     <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>微信号: ai_88888888</div>
                     <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>地区: 中国 上海</div>
                 </div>
            </div>
            
            <CellGroup>
                <Cell title="名字" value={name} isLink onClick={() => Toast.info('修改名字功能暂未开放')} />
                <Cell title="我的二维码" isLink onClick={() => navigate('/profile/qrcode')} />
                <Cell title="更多信息" isLink />
            </CellGroup>

            <CellGroup>
                <Cell title="我的地址" isLink />
                <Cell title="发票抬头" isLink />
            </CellGroup>
        </div>
    );
};
