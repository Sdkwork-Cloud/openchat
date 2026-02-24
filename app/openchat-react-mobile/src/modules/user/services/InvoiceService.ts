
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result } from '../../../core/types';

export interface InvoiceTitle extends BaseEntity {
    type: 'company' | 'personal';
    title: string;
    taxNo?: string;
    isDefault?: boolean;
}

class InvoiceServiceImpl extends AbstractStorageService<InvoiceTitle> {
    protected STORAGE_KEY = 'sys_user_invoices_v1';

    constructor() {
        super();
        this.initMockData();
    }

    private async initMockData() {
        const list = await this.loadData();
        if (list.length === 0) {
            const now = Date.now();
            await this.save({
                id: 'inv_default',
                type: 'company',
                title: 'OpenChat 科技有限公司',
                taxNo: '91310000XXXXXXXXXX',
                isDefault: true,
                createTime: now,
                updateTime: now
            } as InvoiceTitle);
        }
    }

    async getInvoices(): Promise<Result<InvoiceTitle[]>> {
        const { data } = await this.findAll({ 
            sort: { field: 'createTime', order: 'desc' } 
        });
        const sorted = (data?.content || []).sort((a, b) => {
            if (a.isDefault) return -1;
            if (b.isDefault) return 1;
            return 0;
        });
        return { success: true, data: sorted };
    }

    async saveInvoice(item: Partial<InvoiceTitle>): Promise<Result<InvoiceTitle>> {
        if (item.isDefault) {
            const list = await this.loadData();
            const updates = list
                .filter(a => a.isDefault && a.id !== item.id)
                .map(a => ({ ...a, isDefault: false }));
            for (const u of updates) await this.save(u);
        }
        return await this.save(item);
    }
}

export const InvoiceService = new InvoiceServiceImpl();
