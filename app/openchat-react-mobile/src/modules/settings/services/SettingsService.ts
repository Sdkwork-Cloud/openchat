
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result } from '../../../core/types';
import { ThemeType } from '../../../services/themeContext';

export type AIProviderMode = 'cloud' | 'local';

export interface ModelConfigItem {
    enabled: boolean;
    mode: AIProviderMode;
    provider: string;
    modelName: string;
    apiKey?: string;
    endpoint?: string;
    maxTokens?: number;
    temperature?: number;
}

export interface AIConfig {
    text: ModelConfigItem;
    image: ModelConfigItem;
    video: ModelConfigItem;
    speech: ModelConfigItem;
    music: ModelConfigItem;
}

export interface AppConfig extends BaseEntity {
    theme: ThemeType;
    notificationsEnabled: boolean;
    language: 'zh-CN' | 'en-US';
    autoPlayVideo: boolean;
    chatBackground: string;
    fontSize: number;
    aiConfig: AIConfig;
}

class SettingsServiceImpl extends AbstractStorageService<AppConfig> {
    protected STORAGE_KEY = 'sys_app_config_v3';
    private readonly CONFIG_ID = 'sys_global_config';

    protected async onInitialize() {
        const list = await this.loadData();
        if (list.length === 0) {
            const now = Date.now();
            const defaultAIConfig: ModelConfigItem = {
                enabled: true, mode: 'cloud', provider: 'gemini', modelName: 'default', temperature: 0.7
            };
            const defaultConfig: AppConfig = {
                id: this.CONFIG_ID, createTime: now, updateTime: now, theme: 'wechat-dark',
                notificationsEnabled: true, language: 'zh-CN', autoPlayVideo: true, chatBackground: '', fontSize: 16,
                aiConfig: {
                    text: { ...defaultAIConfig, provider: 'gemini', modelName: 'gemini-3-flash-preview' },
                    image: { ...defaultAIConfig, provider: 'midjourney', modelName: 'v6' },
                    video: { ...defaultAIConfig, provider: 'runway', modelName: 'gen-3' },
                    speech: { ...defaultAIConfig, provider: 'openai', modelName: 'tts-1' },
                    music: { ...defaultAIConfig, provider: 'suno', modelName: 'v3' }
                }
            };
            this.cache = [defaultConfig];
            await this.commit();
        }
    }

    async getConfig(): Promise<Result<AppConfig>> {
        const res = await this.findById(this.CONFIG_ID);
        if (res.success && res.data) return res;
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
    
    async updateAIConfig(domain: keyof AIConfig, settings: Partial<ModelConfigItem>): Promise<Result<void>> {
        const { data: config } = await this.getConfig();
        if (config) {
            config.aiConfig[domain] = { ...config.aiConfig[domain], ...settings };
            await this.save(config);
            return { success: true };
        }
        return { success: false };
    }
}

export const SettingsService = new SettingsServiceImpl();
