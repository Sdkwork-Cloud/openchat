import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SupportedLocale = 'zh-CN' | 'zh-TW' | 'en-US' | 'en-GB' | 'ja-JP' | 'ko-KR';

export interface I18nOptions {
  defaultLocale?: SupportedLocale;
  fallbackLocale?: SupportedLocale;
  missingKeyHandler?: (key: string, locale: string) => string;
}

export interface TranslationData {
  [key: string]: string | TranslationData;
}

@Injectable()
export class I18nService implements OnModuleInit {
  private readonly logger = new Logger(I18nService.name);
  private readonly translations = new Map<string, TranslationData>();
  private readonly defaultLocale: SupportedLocale;
  private readonly fallbackLocale: SupportedLocale;

  constructor(
    private readonly configService: ConfigService,
    private readonly options?: I18nOptions,
  ) {
    this.defaultLocale =
      options?.defaultLocale ||
      (this.configService.get('DEFAULT_LOCALE') as SupportedLocale) ||
      'zh-CN';
    this.fallbackLocale =
      options?.fallbackLocale ||
      (this.configService.get('FALLBACK_LOCALE') as SupportedLocale) ||
      'en-US';
  }

  async onModuleInit() {
    await this.loadTranslations();
    this.logger.log(
      `I18nService initialized with default locale: ${this.defaultLocale}`,
    );
  }

  t(
    key: string,
    options?: {
      locale?: SupportedLocale;
      args?: Record<string, any>;
      defaultValue?: string;
      count?: number;
    },
  ): string {
    const locale = options?.locale || this.defaultLocale;
    const translation = this.getTranslation(key, locale);

    if (translation === null) {
      if (options?.defaultValue) {
        return this.interpolate(options.defaultValue, options.args);
      }

      if (this.options?.missingKeyHandler) {
        return this.options.missingKeyHandler(key, locale);
      }

      this.logger.warn(`Missing translation key: ${key} for locale: ${locale}`);
      return key;
    }

    let result = translation;

    if (options?.count !== undefined) {
      result = this.handlePlural(result, options.count);
    }

    return this.interpolate(result, options?.args);
  }

  translate(key: string, locale?: SupportedLocale): string {
    return this.t(key, { locale });
  }

  translateWithArgs(
    key: string,
    args: Record<string, any>,
    locale?: SupportedLocale,
  ): string {
    return this.t(key, { locale, args });
  }

  translatePlural(
    key: string,
    count: number,
    args?: Record<string, any>,
    locale?: SupportedLocale,
  ): string {
    return this.t(key, { locale, count, args: { ...args, count } });
  }

  exists(key: string, locale?: SupportedLocale): boolean {
    return this.getTranslation(key, locale || this.defaultLocale) !== null;
  }

  getLocale(): SupportedLocale {
    return this.defaultLocale;
  }

  getSupportedLocales(): SupportedLocale[] {
    return ['zh-CN', 'zh-TW', 'en-US', 'en-GB', 'ja-JP', 'ko-KR'];
  }

  setLocale(locale: SupportedLocale): void {
    this.logger.debug(`Locale set to: ${locale}`);
  }

  addTranslations(locale: string, translations: TranslationData): void {
    const existing = this.translations.get(locale) || {};
    this.translations.set(locale, this.deepMerge(existing, translations));
    this.logger.debug(`Translations added for locale: ${locale}`);
  }

  private getTranslation(key: string, locale: string): string | null {
    const keys = key.split('.');
    let result: any = this.translations.get(locale);

    if (!result) {
      result = this.translations.get(this.fallbackLocale);
    }

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        if (locale !== this.fallbackLocale) {
          return this.getTranslation(key, this.fallbackLocale);
        }
        return null;
      }
    }

    return typeof result === 'string' ? result : null;
  }

  private interpolate(template: string, args?: Record<string, any>): string {
    if (!args) return template;

    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return args[key] !== undefined ? String(args[key]) : match;
    });
  }

  private handlePlural(template: string, count: number): string {
    const parts = template.split('|').map((s) => s.trim());

    if (parts.length === 1) {
      return template;
    }

    if (parts.length === 2) {
      return count === 1 ? parts[0] : parts[1];
    }

    if (parts.length === 3) {
      if (count === 0) return parts[0];
      if (count === 1) return parts[1];
      return parts[2];
    }

    const index = Math.min(count, parts.length - 1);
    return parts[index];
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  private async loadTranslations(): Promise<void> {
    this.addTranslations('zh-CN', {
      common: {
        success: '操作成功',
        failed: '操作失败',
        loading: '加载中...',
        confirm: '确认',
        cancel: '取消',
        save: '保存',
        delete: '删除',
        edit: '编辑',
        create: '创建',
        search: '搜索',
        reset: '重置',
        submit: '提交',
        back: '返回',
        next: '下一步',
        previous: '上一步',
        close: '关闭',
        yes: '是',
        no: '否',
      },
      validation: {
        required: '{field}是必填项',
        email: '请输入有效的邮箱地址',
        minLength: '{field}至少需要{min}个字符',
        maxLength: '{field}不能超过{max}个字符',
        pattern: '{field}格式不正确',
        number: '{field}必须是数字',
        integer: '{field}必须是整数',
        positiveNumber: '{field}必须是正数',
        date: '{field}必须是有效的日期',
        url: '请输入有效的URL',
        phone: '请输入有效的手机号码',
        password: '密码必须包含字母和数字，长度至少8位',
        confirmPassword: '两次输入的密码不一致',
      },
      auth: {
        login: '登录',
        logout: '退出登录',
        register: '注册',
        forgotPassword: '忘记密码',
        resetPassword: '重置密码',
        loginSuccess: '登录成功',
        logoutSuccess: '退出成功',
        registerSuccess: '注册成功',
        invalidCredentials: '用户名或密码错误',
        accountLocked: '账户已被锁定',
        accountNotActivated: '账户未激活',
        sessionExpired: '会话已过期，请重新登录',
        tokenExpired: '令牌已过期',
        invalidToken: '无效的令牌',
        passwordChanged: '密码修改成功',
        emailSent: '邮件已发送',
      },
      user: {
        profile: '个人资料',
        settings: '设置',
        avatar: '头像',
        nickname: '昵称',
        username: '用户名',
        password: '密码',
        email: '邮箱',
        phone: '手机号',
        status: '状态',
        online: '在线',
        offline: '离线',
        busy: '忙碌',
        away: '离开',
      },
      message: {
        send: '发送',
        received: '已接收',
        sent: '已发送',
        delivered: '已送达',
        read: '已读',
        unread: '未读',
        typing: '正在输入...',
        noMessages: '暂无消息',
        messageSent: '消息已发送',
        messageFailed: '消息发送失败',
        messageRecalled: '消息已撤回',
        messageDeleted: '消息已删除',
      },
      friend: {
        add: '添加好友',
        remove: '删除好友',
        block: '拉黑',
        unblock: '取消拉黑',
        friendList: '好友列表',
        friendRequest: '好友请求',
        friendRequestSent: '好友请求已发送',
        friendRequestAccepted: '已同意好友请求',
        friendRequestRejected: '已拒绝好友请求',
        alreadyFriend: '已经是好友',
        friendNotFound: '好友不存在',
      },
      group: {
        create: '创建群组',
        join: '加入群组',
        leave: '退出群组',
        disband: '解散群组',
        groupName: '群名称',
        groupNotice: '群公告',
        groupMembers: '群成员',
        groupOwner: '群主',
        groupAdmin: '群管理员',
        inviteMember: '邀请成员',
        removeMember: '移除成员',
        transferOwner: '转让群主',
        groupNotFound: '群组不存在',
        notGroupMember: '不是群成员',
        notGroupOwner: '不是群主',
        notGroupAdmin: '不是群管理员',
      },
      error: {
        unknown: '未知错误',
        networkError: '网络错误',
        serverError: '服务器错误',
        notFound: '资源不存在',
        forbidden: '没有权限',
        unauthorized: '未授权',
        badRequest: '请求参数错误',
        conflict: '资源冲突',
        tooManyRequests: '请求过于频繁',
        serviceUnavailable: '服务暂不可用',
      },
    });

    this.addTranslations('en-US', {
      common: {
        success: 'Success',
        failed: 'Failed',
        loading: 'Loading...',
        confirm: 'Confirm',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        search: 'Search',
        reset: 'Reset',
        submit: 'Submit',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        close: 'Close',
        yes: 'Yes',
        no: 'No',
      },
      validation: {
        required: '{field} is required',
        email: 'Please enter a valid email address',
        minLength: '{field} must be at least {min} characters',
        maxLength: '{field} cannot exceed {max} characters',
        pattern: '{field} format is invalid',
        number: '{field} must be a number',
        integer: '{field} must be an integer',
        positiveNumber: '{field} must be a positive number',
        date: '{field} must be a valid date',
        url: 'Please enter a valid URL',
        phone: 'Please enter a valid phone number',
        password: 'Password must contain letters and numbers, at least 8 characters',
        confirmPassword: 'Passwords do not match',
      },
      auth: {
        login: 'Login',
        logout: 'Logout',
        register: 'Register',
        forgotPassword: 'Forgot Password',
        resetPassword: 'Reset Password',
        loginSuccess: 'Login successful',
        logoutSuccess: 'Logout successful',
        registerSuccess: 'Registration successful',
        invalidCredentials: 'Invalid username or password',
        accountLocked: 'Account is locked',
        accountNotActivated: 'Account is not activated',
        sessionExpired: 'Session expired, please login again',
        tokenExpired: 'Token expired',
        invalidToken: 'Invalid token',
        passwordChanged: 'Password changed successfully',
        emailSent: 'Email sent',
      },
      user: {
        profile: 'Profile',
        settings: 'Settings',
        avatar: 'Avatar',
        nickname: 'Nickname',
        username: 'Username',
        password: 'Password',
        email: 'Email',
        phone: 'Phone',
        status: 'Status',
        online: 'Online',
        offline: 'Offline',
        busy: 'Busy',
        away: 'Away',
      },
      message: {
        send: 'Send',
        received: 'Received',
        sent: 'Sent',
        delivered: 'Delivered',
        read: 'Read',
        unread: 'Unread',
        typing: 'Typing...',
        noMessages: 'No messages',
        messageSent: 'Message sent',
        messageFailed: 'Message failed to send',
        messageRecalled: 'Message recalled',
        messageDeleted: 'Message deleted',
      },
      friend: {
        add: 'Add Friend',
        remove: 'Remove Friend',
        block: 'Block',
        unblock: 'Unblock',
        friendList: 'Friend List',
        friendRequest: 'Friend Request',
        friendRequestSent: 'Friend request sent',
        friendRequestAccepted: 'Friend request accepted',
        friendRequestRejected: 'Friend request rejected',
        alreadyFriend: 'Already friends',
        friendNotFound: 'Friend not found',
      },
      group: {
        create: 'Create Group',
        join: 'Join Group',
        leave: 'Leave Group',
        disband: 'Disband Group',
        groupName: 'Group Name',
        groupNotice: 'Group Notice',
        groupMembers: 'Group Members',
        groupOwner: 'Group Owner',
        groupAdmin: 'Group Admin',
        inviteMember: 'Invite Member',
        removeMember: 'Remove Member',
        transferOwner: 'Transfer Owner',
        groupNotFound: 'Group not found',
        notGroupMember: 'Not a group member',
        notGroupOwner: 'Not group owner',
        notGroupAdmin: 'Not group admin',
      },
      error: {
        unknown: 'Unknown error',
        networkError: 'Network error',
        serverError: 'Server error',
        notFound: 'Resource not found',
        forbidden: 'Access denied',
        unauthorized: 'Unauthorized',
        badRequest: 'Bad request',
        conflict: 'Resource conflict',
        tooManyRequests: 'Too many requests',
        serviceUnavailable: 'Service unavailable',
      },
    });
  }
}

export function i18n(key: string, args?: Record<string, any>): string {
  return key;
}
