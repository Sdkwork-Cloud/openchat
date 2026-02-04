import React, { useState } from 'react';

// 系统设置类型定义
interface SystemSettings {
  general: {
    appName: string;
    appVersion: string;
    maintenanceMode: boolean;
    defaultLanguage: string;
    timezone: string;
  };
  security: {
    jwtSecret: string;
    jwtExpiry: number;
    rateLimit: number;
    bruteForceProtection: boolean;
    twoFactorAuth: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    fromEmail: string;
    emailVerification: boolean;
  };
  storage: {
    maxFileSize: number;
    allowedFileTypes: string[];
    storagePath: string;
    backupSchedule: string;
  };
}

// 模拟系统设置数据
const mockSystemSettings: SystemSettings = {
  general: {
    appName: 'OpenChat Admin',
    appVersion: '1.0.0',
    maintenanceMode: false,
    defaultLanguage: 'zh-CN',
    timezone: 'Asia/Shanghai',
  },
  security: {
    jwtSecret: 'your-secret-key-here',
    jwtExpiry: 86400,
    rateLimit: 1000,
    bruteForceProtection: true,
    twoFactorAuth: false,
  },
  email: {
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUser: 'noreply@example.com',
    smtpPass: '********',
    fromEmail: 'noreply@example.com',
    emailVerification: true,
  },
  storage: {
    maxFileSize: 50,
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    storagePath: '/uploads',
    backupSchedule: 'daily',
  },
};

/**
 * 系统设置页面
 * 功能：管理系统的基本配置、安全设置、邮件设置和存储设置
 */
export const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(mockSystemSettings);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'email' | 'storage'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 处理设置变更
  const handleSettingChange = (section: keyof SystemSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));

    // 清除对应字段的错误
    if (errors[`${section}.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${section}.${field}`];
        return newErrors;
      });
    }
  };

  // 验证设置
  const validateSettings = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 验证通用设置
    if (!settings.general.appName.trim()) {
      newErrors['general.appName'] = '应用名称不能为空';
    }

    // 验证安全设置
    if (!settings.security.jwtSecret.trim()) {
      newErrors['security.jwtSecret'] = 'JWT密钥不能为空';
    }
    if (settings.security.jwtExpiry <= 0) {
      newErrors['security.jwtExpiry'] = 'JWT过期时间必须大于0';
    }

    // 验证邮件设置
    if (!settings.email.smtpHost.trim()) {
      newErrors['email.smtpHost'] = 'SMTP主机不能为空';
    }
    if (settings.email.smtpPort <= 0) {
      newErrors['email.smtpPort'] = 'SMTP端口必须大于0';
    }
    if (!settings.email.smtpUser.trim()) {
      newErrors['email.smtpUser'] = 'SMTP用户名不能为空';
    }
    if (!settings.email.fromEmail.trim()) {
      newErrors['email.fromEmail'] = '发件人邮箱不能为空';
    }

    // 验证存储设置
    if (settings.storage.maxFileSize <= 0) {
      newErrors['storage.maxFileSize'] = '最大文件大小必须大于0';
    }
    if (!settings.storage.storagePath.trim()) {
      newErrors['storage.storagePath'] = '存储路径不能为空';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 保存设置
  const handleSaveSettings = async () => {
    if (!validateSettings()) {
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 保存成功
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('保存设置失败:', error);
      // 实际应用中应该显示错误消息
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">系统设置</h1>
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-6 py-2 bg-primary-500 text-white rounded-md font-medium hover:bg-primary-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSaving ? '保存中...' : '保存设置'}
        </button>
      </div>

      {/* 保存成功提示 */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md flex items-center space-x-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>设置保存成功！</span>
        </div>
      )}

      {/* 标签页导航 */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'general' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            通用设置
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'security' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            安全设置
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'email' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            邮件设置
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'storage' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            存储设置
          </button>
        </nav>
      </div>

      {/* 通用设置 */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-700">通用配置</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">应用名称</label>
              <input
                type="text"
                value={settings.general.appName}
                onChange={(e) => handleSettingChange('general', 'appName', e.target.value)}
                className={`w-full px-4 py-2 border rounded-md ${errors['general.appName'] ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors['general.appName'] && (
                <p className="mt-1 text-sm text-red-600">{errors['general.appName']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">应用版本</label>
              <input
                type="text"
                value={settings.general.appVersion}
                onChange={(e) => handleSettingChange('general', 'appVersion', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">默认语言</label>
              <select
                value={settings.general.defaultLanguage}
                onChange={(e) => handleSettingChange('general', 'defaultLanguage', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
                <option value="ja-JP">日本語</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">时区</label>
              <select
                value={settings.general.timezone}
                onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="Asia/Shanghai">亚洲/上海</option>
                <option value="America/New_York">美国/纽约</option>
                <option value="Europe/London">欧洲/伦敦</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="maintenanceMode"
                  checked={settings.general.maintenanceMode}
                  onChange={(e) => handleSettingChange('general', 'maintenanceMode', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-700">
                  维护模式
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500">启用后，系统将进入维护模式，普通用户无法访问</p>
            </div>
          </div>
        </div>
      )}

      {/* 安全设置 */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-700">安全配置</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">JWT密钥</label>
              <input
                type="text"
                value={settings.security.jwtSecret}
                onChange={(e) => handleSettingChange('security', 'jwtSecret', e.target.value)}
                className={`w-full px-4 py-2 border rounded-md ${errors['security.jwtSecret'] ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors['security.jwtSecret'] && (
                <p className="mt-1 text-sm text-red-600">{errors['security.jwtSecret']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">JWT过期时间 (秒)</label>
              <input
                type="number"
                value={settings.security.jwtExpiry}
                onChange={(e) => handleSettingChange('security', 'jwtExpiry', parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-2 border rounded-md ${errors['security.jwtExpiry'] ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors['security.jwtExpiry'] && (
                <p className="mt-1 text-sm text-red-600">{errors['security.jwtExpiry']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API速率限制 (次/分钟)</label>
              <input
                type="number"
                value={settings.security.rateLimit}
                onChange={(e) => handleSettingChange('security', 'rateLimit', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="bruteForceProtection"
                  checked={settings.security.bruteForceProtection}
                  onChange={(e) => handleSettingChange('security', 'bruteForceProtection', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="bruteForceProtection" className="ml-2 block text-sm text-gray-700">
                  启用暴力破解防护
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="twoFactorAuth"
                  checked={settings.security.twoFactorAuth}
                  onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="twoFactorAuth" className="ml-2 block text-sm text-gray-700">
                  启用两步验证
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 邮件设置 */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-700">邮件配置</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP主机</label>
              <input
                type="text"
                value={settings.email.smtpHost}
                onChange={(e) => handleSettingChange('email', 'smtpHost', e.target.value)}
                className={`w-full px-4 py-2 border rounded-md ${errors['email.smtpHost'] ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors['email.smtpHost'] && (
                <p className="mt-1 text-sm text-red-600">{errors['email.smtpHost']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP端口</label>
              <input
                type="number"
                value={settings.email.smtpPort}
                onChange={(e) => handleSettingChange('email', 'smtpPort', parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-2 border rounded-md ${errors['email.smtpPort'] ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors['email.smtpPort'] && (
                <p className="mt-1 text-sm text-red-600">{errors['email.smtpPort']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP用户名</label>
              <input
                type="text"
                value={settings.email.smtpUser}
                onChange={(e) => handleSettingChange('email', 'smtpUser', e.target.value)}
                className={`w-full px-4 py-2 border rounded-md ${errors['email.smtpUser'] ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors['email.smtpUser'] && (
                <p className="mt-1 text-sm text-red-600">{errors['email.smtpUser']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP密码</label>
              <input
                type="password"
                value={settings.email.smtpPass}
                onChange={(e) => handleSettingChange('email', 'smtpPass', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">发件人邮箱</label>
              <input
                type="email"
                value={settings.email.fromEmail}
                onChange={(e) => handleSettingChange('email', 'fromEmail', e.target.value)}
                className={`w-full px-4 py-2 border rounded-md ${errors['email.fromEmail'] ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors['email.fromEmail'] && (
                <p className="mt-1 text-sm text-red-600">{errors['email.fromEmail']}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emailVerification"
                  checked={settings.email.emailVerification}
                  onChange={(e) => handleSettingChange('email', 'emailVerification', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="emailVerification" className="ml-2 block text-sm text-gray-700">
                  启用邮箱验证
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 存储设置 */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-700">存储配置</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">最大文件大小 (MB)</label>
              <input
                type="number"
                value={settings.storage.maxFileSize}
                onChange={(e) => handleSettingChange('storage', 'maxFileSize', parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-2 border rounded-md ${errors['storage.maxFileSize'] ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors['storage.maxFileSize'] && (
                <p className="mt-1 text-sm text-red-600">{errors['storage.maxFileSize']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">存储路径</label>
              <input
                type="text"
                value={settings.storage.storagePath}
                onChange={(e) => handleSettingChange('storage', 'storagePath', e.target.value)}
                className={`w-full px-4 py-2 border rounded-md ${errors['storage.storagePath'] ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors['storage.storagePath'] && (
                <p className="mt-1 text-sm text-red-600">{errors['storage.storagePath']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">备份计划</label>
              <select
                value={settings.storage.backupSchedule}
                onChange={(e) => handleSettingChange('storage', 'backupSchedule', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="daily">每日备份</option>
                <option value="weekly">每周备份</option>
                <option value="monthly">每月备份</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">允许的文件类型</label>
              <input
                type="text"
                value={settings.storage.allowedFileTypes.join(', ')}
                onChange={(e) => handleSettingChange('storage', 'allowedFileTypes', e.target.value.split(',').map(type => type.trim()))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="例如: jpg, jpeg, png, gif, pdf"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 导出组件
export default SystemSettingsPage;