
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result } from '../../../core/types';

export interface Address extends BaseEntity {
    name: string;
    phone: string;
    detail: string;
    tag?: string;
    isDefault?: boolean;
}

class AddressServiceImpl extends AbstractStorageService<Address> {
    protected STORAGE_KEY = 'sys_user_addresses_v1';

    constructor() {
        super();
        this.initMockData();
    }

    private async initMockData() {
        const list = await this.loadData();
        if (list.length === 0) {
            const now = Date.now();
            await this.save({
                id: 'addr_default',
                name: 'AI User',
                phone: '13800138000',
                detail: '上海市 浦东新区 张江高科技园区 888号',
                tag: '公司',
                isDefault: true,
                createTime: now,
                updateTime: now
            } as Address);
        }
    }

    async getAddresses(): Promise<Result<Address[]>> {
        const { data } = await this.findAll({ 
            sort: { field: 'createTime', order: 'desc' } 
        });
        // Sort: Default first, then by time
        const sorted = (data?.content || []).sort((a, b) => {
            if (a.isDefault) return -1;
            if (b.isDefault) return 1;
            return 0;
        });
        return { success: true, data: sorted };
    }

    async saveAddress(addr: Partial<Address>): Promise<Result<Address>> {
        // Logic: If setting as default, unset others
        if (addr.isDefault) {
            const list = await this.loadData();
            const updates = list
                .filter(a => a.isDefault && a.id !== addr.id)
                .map(a => ({ ...a, isDefault: false }));
            
            // Batch update silently (internal cache manipulation is safe here as AbstractStorageService handles commit on save)
            // Ideally we'd use saveAll but simpler loop works for small datasets
            for (const u of updates) {
                await this.save(u);
            }
        }
        return await this.save(addr);
    }
}

export const AddressService = new AddressServiceImpl();
