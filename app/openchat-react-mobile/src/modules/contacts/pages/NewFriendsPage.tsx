
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../../components/Navbar/Navbar';
import { navigate } from '../../../router';
import { FriendRequestService, FriendRequest } from '../services/FriendRequestService';
import { Toast } from '../../../components/Toast';
import { Cell, CellGroup } from '../../../components/Cell';
import { Avatar } from '../../../components/Avatar';
import { Empty } from '../../../components/Empty/Empty';
import { Button } from '../../../components/Button/Button';

export const NewFriendsPage: React.FC = () => {
    const [requests, setRequests] = useState<FriendRequest[]>([]);

    useEffect(() => {
        const load = async () => {
            const res = await FriendRequestService.getRequests();
            if (res.success && res.data) {
                setRequests(res.data);
            }
        };
        load();
    }, []);

    const handleAccept = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await FriendRequestService.handleRequest(id, 'accept');
        Toast.success('已添加');
        const res = await FriendRequestService.getRequests();
        if (res.success && res.data) setRequests(res.data);
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)' }}>
            <Navbar title="新的朋友" backFallback="/contacts" rightElement={<div onClick={() => navigate('/contacts')} style={{ fontSize: '15px', color: 'var(--text-primary)', cursor: 'pointer' }}>添加朋友</div>} />
            
            <div style={{ padding: '16px 16px 8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                近三天
            </div>
            
            <CellGroup>
                {requests.length > 0 ? (
                    requests.map(req => {
                        const isPending = req.status === 'pending';
                        const ActionButton = isPending ? (
                            <Button size="sm" onClick={(e) => handleAccept(e, req.id)}>接受</Button>
                        ) : (
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                {req.status === 'added' ? '已添加' : '已拒绝'}
                            </span>
                        );

                        return (
                            <Cell 
                                key={req.id} 
                                icon={<Avatar src={req.avatar} size={48} />}
                                title={req.name}
                                label={req.reason}
                                value={ActionButton}
                                center
                            />
                        );
                    })
                ) : (
                    <Empty text="暂无新朋友申请" fullHeight={false} />
                )}
            </CellGroup>
        </div>
    );
};
