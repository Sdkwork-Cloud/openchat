
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result } from '../../../core/types';
import { ThemeType } from '../../../services/themeContext';

export interface AppConfig extends BaseEntity {
    theme: ThemeType;
    notificationsEnabled: boolean;
    language: 'zh-CN' | 'en-US';
    autoPlayVideo: boolean;
}

class SettingsServiceImpl extends AbstractStorageService<AppConfig> {
    protected STORAGE_KEY = 'sys_app_config_v1';
    private readonly CONFIG_ID = 'sys_global_config';

    constructor() {
        super();
        this.initConfig();
    }

    private async initConfig() {
        const list = await this.loadData();
        if (list.length === 0) {
            const now = Date.now();
            const defaultConfig: AppConfig = {
                id: this.CONFIG_ID,
                createTime: now,
                updateTime: now,
                theme: 'wechat-dark', // Default preference
                notificationsEnabled: true,
                language: 'zh-CN',
                autoPlayVideo: true
            };
            await this.save(defaultConfig);
        }
    }

    async getConfig(): Promise<Result<AppConfig>> {
        const res = await this.findById(this.CONFIG_ID);
        if (res.success && res.data) {
            return res;
        }
        // Fallback re-init if somehow missing
        await this.initConfig();
        return this.findById(this.CONFIG_ID);
    }

    async updateConfig(partial: Partial<AppConfig>): Promise<Result<void>> {
        const { data: config } = await this.getConfig();
        if (config) {
            Object.assign(config, partial);
            await this.save(config);
            return { success: true };
        }
        return { success: false, message: 'Config not loaded' };
    }
}

export const SettingsService = new SettingsServiceImpl();
