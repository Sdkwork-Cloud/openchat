/**
 * MessageSettingsPage 组件
 * 
 * 职责：
 * 1. 提供消息相关的配置功能
 * 2. 配置消息过滤规则
 * 3. 配置消息存储设置
 * 4. 配置消息推送设置
 * 5. 配置消息安全设置
 */

import React, { useState } from 'react';

// 消息设置类型定义
interface MessageSettings {
  // 消息存储设置
  storage: {
    enabled: boolean;
    retentionDays: number;
    maxSize: number; // MB
  };
  // 消息过滤设置
  filtering: {
    enabled: boolean;
    blockedKeywords: string[];
    blockedUsers: string[];
    blockedDevices: string[];
  };
  // 消息推送设置
  push: {
    enabled: boolean;
    webhookUrl: string;
    retryAttempts: number;
    retryDelay: number; // seconds
  };
  // 消息安全设置
  security: {
    enabled: boolean;
    encryption: boolean;
    antiSpam: boolean;
    rateLimit: number; // messages per minute
  };
}

// 模拟消息设置数据
const mockSettings: MessageSettings = {
  storage: {
    enabled: true,
    retentionDays: 30,
    maxSize: 1024 // 1GB
  },
  filtering: {
    enabled: true,
    blockedKeywords: ['spam', 'advertisement', 'scam'],
    blockedUsers: [],
    blockedDevices: []
  },
  push: {
    enabled: false,
    webhookUrl: '',
    retryAttempts: 3,
    retryDelay: 5
  },
  security: {
    enabled: true,
    encryption: true,
    antiSpam: true,
    rateLimit: 60
  }
};

// 消息设置页面组件
export const MessageSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<MessageSettings>(mockSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newDevice, setNewDevice] = useState('');

  // 处理设置变化
  const handleSettingChange = (section: keyof MessageSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };



  // 处理添加数组元素
  const handleAddArrayElement = (field: 'blockedKeywords' | 'blockedUsers' | 'blockedDevices', value: string) => {
    if (!value.trim()) return;
    
    setSettings(prev => {
      const currentArray = prev.filtering[field];
      const newArray = [...currentArray];
      if (!newArray.includes(value)) {
        newArray.push(value);
      }
      return {
        ...prev,
        filtering: {
          ...prev.filtering,
          [field]: newArray
        }
      };
    });

    // 重置输入
    if (field === 'blockedKeywords') setNewKeyword('');
    if (field === 'blockedUsers') setNewUser('');
    if (field === 'blockedDevices') setNewDevice('');
  };

  // 处理删除数组元素
  const handleRemoveArrayElement = (field: 'blockedKeywords' | 'blockedUsers' | 'blockedDevices', index: number) => {
    setSettings(prev => {
      const currentArray = prev.filtering[field];
      const newArray = [...currentArray];
      newArray.splice(index, 1);
      return {
        ...prev,
        filtering: {
          ...prev.filtering,
          [field]: newArray
        }
      };
    });
  };

  // 处理保存设置
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setSuccessMessage('');
      setErrorMessage('');

      // 模拟API请求
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模拟保存成功
      setSuccessMessage('设置保存成功！');

      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setErrorMessage('保存设置失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">消息设置</h1>
        <p className="text-gray-500 mt-1">配置系统消息相关设置</p>
      </div>

      {/* 成功消息 */}
      {successMessage && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}

      {/* 错误消息 */}
      {errorMessage && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-md">
          {errorMessage}
        </div>
      )}

      {/* 消息存储设置 */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-800 mb-4">消息存储设置</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="storage-enabled"
              checked={settings.storage.enabled}
              onChange={(e) => handleSettingChange('storage', 'enabled', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
            />
            <label htmlFor="storage-enabled" className="text-sm font-medium text-gray-700">
              启用消息存储
            </label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="retention-days" className="block text-sm font-medium text-gray-700 mb-1">
                消息保留天数
              </label>
              <input
              type="number"
              id="retention-days"
              min="1"
              max="365"
              value={settings.storage.retentionDays}
              onChange={(e) => handleSettingChange('storage', 'retentionDays', parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={!settings.storage.enabled}
            />
            </div>
            <div>
              <label htmlFor="max-size" className="block text-sm font-medium text-gray-700 mb-1">
                最大存储大小 (MB)
              </label>
              <input
              type="number"
              id="max-size"
              min="1"
              value={settings.storage.maxSize}
              onChange={(e) => handleSettingChange('storage', 'maxSize', parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={!settings.storage.enabled}
            />
            </div>
          </div>
        </div>
      </div>

      {/* 消息过滤设置 */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-800 mb-4">消息过滤设置</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="filtering-enabled"
              checked={settings.filtering.enabled}
              onChange={(e) => handleSettingChange('filtering', 'enabled', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
            />
            <label htmlFor="filtering-enabled" className="text-sm font-medium text-gray-700">
              启用消息过滤
            </label>
          </div>

          {/* 屏蔽关键词 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              屏蔽关键词
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent flex-1"
                placeholder="输入关键词"
                disabled={!settings.filtering.enabled}
              />
              <button
                className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 whitespace-nowrap"
                onClick={() => handleAddArrayElement('blockedKeywords', newKeyword)}
                disabled={!settings.filtering.enabled || !newKeyword.trim()}
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.filtering.blockedKeywords.map((keyword, index) => (
                <div key={index} className="flex items-center space-x-1 bg-gray-100 px-3 py-1 rounded-full">
                  <span className="text-sm">{keyword}</span>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => handleRemoveArrayElement('blockedKeywords', index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 屏蔽用户 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              屏蔽用户
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent flex-1"
                placeholder="输入用户邮箱"
                disabled={!settings.filtering.enabled}
              />
              <button
                className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 whitespace-nowrap"
                onClick={() => handleAddArrayElement('blockedUsers', newUser)}
                disabled={!settings.filtering.enabled || !newUser.trim()}
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.filtering.blockedUsers.map((user, index) => (
                <div key={index} className="flex items-center space-x-1 bg-gray-100 px-3 py-1 rounded-full">
                  <span className="text-sm">{user}</span>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => handleRemoveArrayElement('blockedUsers', index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 屏蔽设备 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              屏蔽设备
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newDevice}
                onChange={(e) => setNewDevice(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent flex-1"
                placeholder="输入设备ID"
                disabled={!settings.filtering.enabled}
              />
              <button
                className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 whitespace-nowrap"
                onClick={() => handleAddArrayElement('blockedDevices', newDevice)}
                disabled={!settings.filtering.enabled || !newDevice.trim()}
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.filtering.blockedDevices.map((device, index) => (
                <div key={index} className="flex items-center space-x-1 bg-gray-100 px-3 py-1 rounded-full">
                  <span className="text-sm">{device}</span>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => handleRemoveArrayElement('blockedDevices', index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 消息推送设置 */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-800 mb-4">消息推送设置</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="push-enabled"
              checked={settings.push.enabled}
              onChange={(e) => handleSettingChange('push', 'enabled', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
            />
            <label htmlFor="push-enabled" className="text-sm font-medium text-gray-700">
              启用消息推送
            </label>
          </div>
          
          <div>
            <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700 mb-1">
              Webhook URL
            </label>
            <input
              type="url"
              id="webhook-url"
              value={settings.push.webhookUrl}
              onChange={(e) => handleSettingChange('push', 'webhookUrl', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://example.com/webhook"
              disabled={!settings.push.enabled}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="retry-attempts" className="block text-sm font-medium text-gray-700 mb-1">
                重试次数
              </label>
              <input
              type="number"
              id="retry-attempts"
              min="1"
              max="10"
              value={settings.push.retryAttempts}
              onChange={(e) => handleSettingChange('push', 'retryAttempts', parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={!settings.push.enabled}
            />
            </div>
            <div>
              <label htmlFor="retry-delay" className="block text-sm font-medium text-gray-700 mb-1">
                重试延迟 (秒)
              </label>
              <input
              type="number"
              id="retry-delay"
              min="1"
              max="60"
              value={settings.push.retryDelay}
              onChange={(e) => handleSettingChange('push', 'retryDelay', parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={!settings.push.enabled}
            />
            </div>
          </div>
        </div>
      </div>

      {/* 消息安全设置 */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-800 mb-4">消息安全设置</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="security-enabled"
              checked={settings.security.enabled}
              onChange={(e) => handleSettingChange('security', 'enabled', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
            />
            <label htmlFor="security-enabled" className="text-sm font-medium text-gray-700">
              启用消息安全
            </label>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="encryption"
                checked={settings.security.encryption}
                onChange={(e) => handleSettingChange('security', 'encryption', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
                disabled={!settings.security.enabled}
              />
              <label htmlFor="encryption" className="text-sm font-medium text-gray-700">
                启用消息加密
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="anti-spam"
                checked={settings.security.antiSpam}
                onChange={(e) => handleSettingChange('security', 'antiSpam', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
                disabled={!settings.security.enabled}
              />
              <label htmlFor="anti-spam" className="text-sm font-medium text-gray-700">
                启用反垃圾消息
              </label>
            </div>
          </div>
          
          <div>
            <label htmlFor="rate-limit" className="block text-sm font-medium text-gray-700 mb-1">
              速率限制 (每分钟消息数)
            </label>
            <input
              type="number"
              id="rate-limit"
              min="1"
              max="1000"
              value={settings.security.rateLimit}
              onChange={(e) => handleSettingChange('security', 'rateLimit', parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={!settings.security.enabled}
            />
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex justify-end space-x-3">
        <button
          className="bg-secondary-500 text-white px-4 py-2 rounded-md hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
          onClick={() => setSettings({ ...mockSettings })}
        >
          重置默认
        </button>
        <button
          className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
};

export default MessageSettingsPage;