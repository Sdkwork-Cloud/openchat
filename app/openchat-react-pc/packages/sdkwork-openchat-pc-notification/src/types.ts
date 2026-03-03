import type { BaseEntity } from '@sdkwork/openchat-pc-contracts';

export type NotificationType = 'system' | 'social' | 'order' | 'promotion' | 'message';

export interface Notification extends BaseEntity {
  type: NotificationType;
  title: string;
  content: string;
  icon?: string;
  link?: string;
  isRead: boolean;
  meta?: {
    sender?: {
      id: string;
      name: string;
      avatar?: string;
    };
    targetId?: string;
    targetType?: string;
    action?: string;
  };
}

export interface NotificationFilter {
  type?: NotificationType | 'all';
  isRead?: boolean;
  startTime?: number;
  endTime?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  emailEnabled: boolean;
  typeSettings: Record<NotificationType, {
    push: boolean;
    sound: boolean;
    desktop: boolean;
  }>;
}


