/**
 * Settings Module - PC Version
 * 
 * 设置模块 - 包含账号、主题、通知、AI模型配置等
 * 专为PC大屏优化的三栏布局设计
 */

export { SettingsService } from './services/SettingsService';

export { SettingsPage } from './pages/SettingsPage';
export { ThemePage } from './pages/ThemePage';
export { ModelSettingsPage } from './pages/ModelSettingsPage';
export { AccountPage } from './pages/AccountPage';
export { NotificationPage } from './pages/NotificationPage';
export { PrivacyPage } from './pages/PrivacyPage';
export { AboutPage } from './pages/AboutPage';

export type {
  SettingsState,
  ThemeType,
  ModelConfig,
  NotificationSettings,
  PrivacySettings,
  UserPreferences
} from './types';
