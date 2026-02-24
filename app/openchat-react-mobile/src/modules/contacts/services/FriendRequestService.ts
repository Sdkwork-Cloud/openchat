
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result } from '../../../core/types';

export interface FriendRequest extends BaseEntity {
    name: string;
    avatar: string;
    reason: string;
    status: 'pending' | 'accepted' | 'rejected' | 'added';
    source: string; // e.g. "via Group Chat"
}

class FriendRequestServiceImpl extends AbstractStorageService<FriendRequest> {
    protected STORAGE_KEY = 'sys_friend_requests_v1';

    constructor() {
        super();
        this.initMockData();
    }

    private async initMockData() {
        const list = await this.loadData();
        if (list.length === 0) {
            const now = Date.now();
            const seeds: Partial<FriendRequest>[] = [
                { id: 'req_1', name: '李白', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=LiBai', reason: '我是李白，交个朋友', status: 'pending', source: '通过群聊添加', createTime: now - 3600000 },
                { id: 'req_2', name: 'Product Manager', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PM', reason: '聊聊需求', status: 'accepted', source: '通过搜索添加', createTime: now - 86400000 },
            ];
            for (const s of seeds) {
                await this.save({ ...s, updateTime: now } as FriendRequest);
            }
        }
    }

    async getRequests(): Promise<Result<FriendRequest[]>> {
        const { data } = await this.findAll({
            sort: { field: 'createTime', order: 'desc' }
        });
        return { success: true, data: data?.content || [] };
    }

    async handleRequest(id: string, action: 'accept' | 'reject'): Promise<Result<void>> {
        const { data: req } = await this.findById(id);
        if (req) {
            req.status = action === 'accept' ? 'added' : 'rejected';
            await this.save(req);
            return { success: true };
        }
        return { success: false, message: 'Request not found' };
    }
}

export const FriendRequestService = new FriendRequestServiceImpl();
