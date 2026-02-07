
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result } from '../../../core/types';

export interface ScanRecord extends BaseEntity {
    content: string;
    type: 'qrcode' | 'barcode' | 'ocr';
    source?: string;
}

class ScanServiceImpl extends AbstractStorageService<ScanRecord> {
    protected STORAGE_KEY = 'sys_scan_history_v1';

    async logScan(content: string, type: 'qrcode' | 'barcode' | 'ocr' = 'qrcode'): Promise<Result<ScanRecord>> {
        // Simple deduplication for recent scans could go here
        return await this.save({
            content,
            type,
            createTime: Date.now(),
            updateTime: Date.now()
        });
    }

    async getHistory(): Promise<Result<ScanRecord[]>> {
        const { data } = await this.findAll({
            sortField: 'createTime',
            sortOrder: 'desc',
            size: 50
        });
        return { success: true, data: data?.content || [] };
    }
}

export const ScanService = new ScanServiceImpl();
