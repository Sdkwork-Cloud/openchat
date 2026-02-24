
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page } from '../../../core/types';
import { UserService } from '../../user/services/UserService';

// --- Types ---

export interface Distributor extends BaseEntity {
    userId: string;
    level: 'standard' | 'gold' | 'diamond'; // V1, V2, V3
    referrerId: string | null; // My boss
    referralCode: string;
    
    // Stats
    totalCommission: number;
    pendingCommission: number;
    withdrawableCommission: number;
    
    totalSales: number;
    teamCountLevel1: number;
    teamCountLevel2: number;
}

export interface TeamMember {
    userId: string;
    name: string;
    avatar: string;
    joinTime: number;
    contribution: number; // Commission generated for me
    level: 1 | 2; // Direct or Indirect
    role: string;
}

export interface CommissionRecord extends BaseEntity {
    distributorId: string;
    orderId: string;
    amount: number; // Positive for income, negative for withdraw
    level: 1 | 2 | 0; // 0 for system/withdraw
    status: 'pending' | 'settled' | 'cancelled' | 'processing' | 'success';
    sourceUser: string; // Who bought it or 'System'
    productName: string;
    type: 'income' | 'withdraw';
}

export interface RankItem {
    rank: number;
    userId: string;
    name: string;
    avatar: string;
    amount: number;
    trend: 'up' | 'down' | 'flat';
}

export interface DistributionTask {
    id: string;
    title: string;
    desc: string;
    target: number;
    current: number;
    reward: string;
    status: 'todo' | 'claim' | 'done';
}

class DistributionServiceImpl extends AbstractStorageService<Distributor> {
    protected STORAGE_KEY = 'sys_distribution_v1';
    
    // Mock Data Init
    constructor() {
        super();
        this.initMock();
    }

    private async initMock() {
        const list = await this.loadData();
        if (list.length === 0) {
            // Assume current user is a distributor for demo
            const now = Date.now();
            const me: Distributor = {
                id: 'dist_me',
                userId: 'u_current', // Placeholder, updated on login usually
                level: 'gold',
                referrerId: 'dist_boss',
                referralCode: 'AI888',
                totalCommission: 12580.50,
                pendingCommission: 450.00,
                withdrawableCommission: 3200.00,
                totalSales: 89000,
                teamCountLevel1: 12,
                teamCountLevel2: 35,
                createTime: now,
                updateTime: now
            };
            await this.save(me);
        }
    }

    // --- Core Logic ---

    async getMyDistributorInfo(): Promise<Result<Distributor>> {
        const list = await this.loadData();
        const me = list[0];
        if (me) return { success: true, data: me };
        return { success: false, message: 'Not a distributor' };
    }

    async getTeamMembers(level: 1 | 2 | 'all' = 'all'): Promise<Result<TeamMember[]>> {
        const mockMembers: TeamMember[] = [];
        const avatars = ['Felix', 'Aneka', 'Zack', 'Bella', 'Charlie', 'David', 'Eva', 'Frank'];
        
        // Level 1
        for(let i=0; i<5; i++) {
            mockMembers.push({
                userId: `u_l1_${i}`,
                name: `合伙人 ${i+1}`,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatars[i]}`,
                joinTime: Date.now() - i * 86400000 * 5,
                contribution: Math.floor(Math.random() * 5000), // Random contribution for sorting demo
                level: 1,
                role: '金牌分销'
            });
        }

        // Level 2
        for(let i=0; i<8; i++) {
            mockMembers.push({
                userId: `u_l2_${i}`,
                name: `团队成员 ${i+1}`,
                avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=L2_${i}`,
                joinTime: Date.now() - i * 86400000 * 2,
                contribution: Math.floor(Math.random() * 1000),
                level: 2,
                role: '分销员'
            });
        }

        let result = mockMembers;
        if (level !== 'all') {
            result = mockMembers.filter(m => m.level === level);
        }
        
        return { success: true, data: result };
    }

    async getCommissionRecords(type: 'all' | 'income' | 'withdraw' = 'all'): Promise<Result<CommissionRecord[]>> {
        // Mock commission records
        const records: CommissionRecord[] = [
            // Recent Withdrawals
            { id: 'w1', distributorId: 'dist_me', orderId: 'wd_1', amount: -1000.00, level: 0, status: 'processing', sourceUser: 'System', productName: '提现到微信', type: 'withdraw', createTime: Date.now() - 100000, updateTime: Date.now() },
            { id: 'w2', distributorId: 'dist_me', orderId: 'wd_2', amount: -500.00, level: 0, status: 'success', sourceUser: 'System', productName: '提现到微信', type: 'withdraw', createTime: Date.now() - 86400000 * 5, updateTime: Date.now() },
            
            // Income
            { id: 'c1', distributorId: 'dist_me', orderId: 'ord_1', amount: 45.00, level: 1, status: 'settled', sourceUser: 'Alice', productName: 'Sony WH-1000XM5', type: 'income', createTime: Date.now() - 3600000, updateTime: Date.now() },
            { id: 'c2', distributorId: 'dist_me', orderId: 'ord_2', amount: 12.50, level: 2, status: 'settled', sourceUser: 'Bob', productName: 'OpenChat T-Shirt', type: 'income', createTime: Date.now() - 86400000, updateTime: Date.now() },
            { id: 'c3', distributorId: 'dist_me', orderId: 'ord_3', amount: 150.00, level: 1, status: 'pending', sourceUser: 'Charlie', productName: 'MacBook Pro', type: 'income', createTime: Date.now() - 100000, updateTime: Date.now() },
            { id: 'c4', distributorId: 'dist_me', orderId: 'ord_4', amount: 28.00, level: 1, status: 'settled', sourceUser: 'David', productName: '咖啡套装', type: 'income', createTime: Date.now() - 172800000, updateTime: Date.now() },
            { id: 'c5', distributorId: 'dist_me', orderId: 'ord_5', amount: 5.50, level: 2, status: 'settled', sourceUser: 'Eve', productName: '手机壳', type: 'income', createTime: Date.now() - 259200000, updateTime: Date.now() },
        ];

        let filtered = records;
        if (type !== 'all') {
            filtered = records.filter(r => r.type === type);
        }
        
        return { success: true, data: filtered };
    }

    async getWeeklyEarnings(): Promise<Result<{ labels: string[], data: number[] }>> {
        return {
            success: true,
            data: {
                labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                data: [120, 200, 150, 80, 70, 110, 300]
            }
        };
    }

    async getRankings(): Promise<Result<RankItem[]>> {
        const ranks: RankItem[] = [
            { rank: 1, userId: 'u_1', name: 'Top Sales King', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=King', amount: 158000, trend: 'flat' },
            { rank: 2, userId: 'u_2', name: 'Queen Bee', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Queen', amount: 142000, trend: 'up' },
            { rank: 3, userId: 'u_3', name: 'Jack Ma', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack', amount: 128000, trend: 'down' },
            { rank: 4, userId: 'u_4', name: 'Elon Musk', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elon', amount: 98000, trend: 'up' },
            { rank: 5, userId: 'u_5', name: 'Pony Ma', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pony', amount: 88000, trend: 'flat' },
            { rank: 6, userId: 'dist_me', name: '我 (AI User)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', amount: 12580, trend: 'up' },
            { rank: 7, userId: 'u_7', name: 'Newbie', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=New', amount: 5000, trend: 'down' },
        ];
        return { success: true, data: ranks };
    }

    async getTasks(): Promise<Result<DistributionTask[]>> {
        const tasks: DistributionTask[] = [
            { id: 't1', title: '分享海报', desc: '保存并分享邀请海报到朋友圈', target: 1, current: 0, reward: '+50 积分', status: 'todo' },
            { id: 't2', title: '成功邀请', desc: '邀请 1 位好友注册', target: 1, current: 1, reward: '佣金提升 1%', status: 'claim' },
            { id: 't3', title: '首单开张', desc: '团队成员完成首笔订单', target: 1, current: 1, reward: '¥10 红包', status: 'done' },
        ];
        return { success: true, data: tasks };
    }

    async claimTask(taskId: string): Promise<Result<void>> {
        // Mock claim logic
        return new Promise(resolve => {
            setTimeout(() => resolve({ success: true }), 600);
        });
    }

    async withdraw(amount: number): Promise<Result<void>> {
        const info = await this.getMyDistributorInfo();
        if (!info.success || !info.data) return { success: false, message: 'Error' };
        
        const dist = info.data;
        if (dist.withdrawableCommission < amount) {
            return { success: false, message: '余额不足' };
        }

        dist.withdrawableCommission -= amount;
        await this.save(dist);
        return { success: true };
    }

    // --- Advanced Algorithm Simulation ---
    // Simulate multi-level recursion for commission distribution
    calculateRecursiveCommission(orderAmount: number, rates: number[] = [0.10, 0.05]): number[] {
        // Returns commission for [Level 1, Level 2]
        return rates.map(rate => parseFloat((orderAmount * rate).toFixed(2)));
    }

    calculateCommission(price: number, rate: number = 0.1): number {
        return parseFloat((price * rate).toFixed(2));
    }
}

export const DistributionService = new DistributionServiceImpl();
