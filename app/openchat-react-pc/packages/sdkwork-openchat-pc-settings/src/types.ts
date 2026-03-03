/**
 * Settings Module Type Definitions
 * 设置模块类型定义
 */

export type ThemeType = 'light' | 'dark' | 'blue' | 'purple' | 'green' | 'system';

export interface ThemeOption {
  key: ThemeType;
  name: string;
  description: string;
  preview: {
    bg: string;
    primary: string;
    text: string;
  };
}

export interface ModelConfig {
  id: string;
  domain: 'text' | 'image' | 'video' | 'speech' | 'music';
  name: string;
  provider: string;
  modelId: string;
  apiKey?: string;
  apiEndpoint?: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  isDefault: boolean;
  isEnabled: boolean;
  customParams?: Record<string, any>;
}

export interface NotificationSettings {
  // 消息通知
  messagePreview: boolean;
  messageSound: boolean;
  messageVibration: boolean;
  // 群组通知
  groupMessage: boolean;
  groupMention: boolean;
  // 系统通知
  systemUpdates: boolean;
  marketingEmails: boolean;
  // 免打扰
  doNotDisturb: boolean;
  doNotDisturbStart: string;
  doNotDisturbEnd: string;
}

export interface PrivacySettings {
  // 在线状态
  onlineStatus: 'everyone' | 'contacts' | 'nobody';
  // 最后上线时间
  lastSeen: 'everyone' | 'contacts' | 'nobody';
  // 个人资料
  profilePhoto: 'everyone' | 'contacts' | 'nobody';
  phoneNumber: 'everyone' | 'contacts' | 'nobody';
  // 添加方式
  addByPhone: boolean;
  addByUsername: boolean;
  addByQRCode: boolean;
  // 已读回执
  readReceipts: boolean;
  // 截屏通知
  screenshotNotification: boolean;
}

export interface UserPreferences {
  language: string;
  fontSize: 'small' | 'medium' | 'large';
  chatBackground?: string;
  compactMode: boolean;
  autoDownload: {
    images: boolean;
    videos: boolean;
    files: boolean;
  };
  mediaQuality: 'auto' | 'high' | 'medium' | 'low';
}

export interface SettingsState {
  theme: ThemeType;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  preferences: UserPreferences;
  modelConfigs: ModelConfig[];
}

export interface StorageInfo {
  total: number;
  used: number;
  free: number;
  appUsage: number;
  cacheSize: number;
  mediaSize: number;
  documentSize: number;
}

export interface AppInfo {
  version: string;
  buildNumber: string;
  platform: string;
  electronVersion?: string;
  tauriVersion?: string;
  updateAvailable?: boolean;
  latestVersion?: string;
  releaseNotes?: string;
}

export interface FeedbackSubmitRequest {
  type: string;
  content: string;
  contact?: string;
  attachmentUrl?: string;
  screenshotUrl?: string;
}

export interface FeedbackSubmission {
  id: string;
  type: string;
  content: string;
  status: string;
  submitTime: string;
  processTime?: string;
}

export interface FeedbackSupportInfo {
  hotline?: string;
  email?: string;
  workingHours?: string;
  wechatQrcode?: string;
  onlineSupportUrl?: string;
  faqUrl?: string;
  helpCenterUrl?: string;
}
