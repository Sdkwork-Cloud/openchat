import { apiClient } from '@/services/api.client';
import { StorageInfo, AppInfo, SettingsState } from '../types';

class SettingsServiceClass {
  private readonly baseUrl = '/settings';

  // 存储管理
  async getStorageInfo(): Promise<StorageInfo> {
    const response = await apiClient.get(`${this.baseUrl}/storage`);
    return response.data;
  }

  async cleanCache(): Promise<void> {
    await apiClient.post(`${this.baseUrl}/storage/clean-cache`);
  }

  async cleanAllData(): Promise<void> {
    await apiClient.post(`${this.baseUrl}/storage/clean-all`);
  }

  // 应用信息
  async getAppInfo(): Promise<AppInfo> {
    const response = await apiClient.get(`${this.baseUrl}/app-info`);
    return response.data;
  }

  async checkForUpdates(): Promise<AppInfo> {
    const response = await apiClient.get(`${this.baseUrl}/check-update`);
    return response.data;
  }

  // 设置管理
  async getSettings(): Promise<SettingsState> {
    const response = await apiClient.get(this.baseUrl);
    return response.data;
  }

  async updateSettings(settings: Partial<SettingsState>): Promise<SettingsState> {
    const response = await apiClient.put(this.baseUrl, settings);
    return response.data;
  }

  // 主题设置
  async setTheme(theme: string): Promise<void> {
    await apiClient.put(`${this.baseUrl}/theme`, { theme });
  }

  // 通知设置
  async updateNotificationSettings(settings: any): Promise<void> {
    await apiClient.put(`${this.baseUrl}/notifications`, settings);
  }

  // 隐私设置
  async updatePrivacySettings(settings: any): Promise<void> {
    await apiClient.put(`${this.baseUrl}/privacy`, settings);
  }

  // 模型配置
  async getModelConfigs(): Promise<any[]> {
    const response = await apiClient.get(`${this.baseUrl}/models`);
    return response.data;
  }

  async saveModelConfig(config: any): Promise<void> {
    await apiClient.post(`${this.baseUrl}/models`, config);
  }

  async deleteModelConfig(configId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/models/${configId}`);
  }

  async setDefaultModelConfig(configId: string): Promise<void> {
    await apiClient.put(`${this.baseUrl}/models/${configId}/default`);
  }
}

export const SettingsService = new SettingsServiceClass();
