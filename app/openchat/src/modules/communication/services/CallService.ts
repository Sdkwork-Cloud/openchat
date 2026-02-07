
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result } from '../../../core/types';

export interface CallRecord extends BaseEntity {
    type: 'video' | 'audio';
    targetName: string;
    targetAvatar: string;
    direction: 'incoming' | 'outgoing';
    status: 'missed' | 'completed' | 'rejected';
    duration: number; // Seconds
}

class CallServiceImpl extends AbstractStorageService<CallRecord> {
    protected STORAGE_KEY = 'sys_call_history_v1';

    async logCall(record: Partial<CallRecord>): Promise<Result<CallRecord>> {
        return await this.save({
            ...record,
            createTime: Date.now(),
            updateTime: Date.now()
        } as CallRecord);
    }

    async getHistory(): Promise<Result<CallRecord[]>> {
        const { data } = await this.findAll({ 
            sortField: 'createTime', 
            sortOrder: 'desc',
            size: 50 
        });
        return { success: true, data: data?.content || [] };
    }
}

export const CallService = new CallServiceImpl();
