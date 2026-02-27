import React, { useState, useEffect } from 'react';
import { Info, Github, Globe, Mail, MessageCircle, ExternalLink, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { SettingsService } from '../services/SettingsService';
import { AppInfo } from '../types';

export const AboutPage: React.FC = () => {
  const { showToast } = useToast();
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  useEffect(() => {
    loadAppInfo();
  }, []);

  const loadAppInfo = async () => {
    try {
      const info = await SettingsService.getAppInfo();
      setAppInfo(info);
    } catch (error) {
      console.error('Failed to load app info:', error);
    }
  };

  const checkForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const info = await SettingsService.checkForUpdates();
      setAppInfo(info);
      if (info.updateAvailable) {
        showToast(`发现新版本: ${info.latestVersion}`, 'info');
      } else {
        showToast('当前已是最新版本', 'success');
      }
    } catch (error) {
      showToast('检查更新失败', 'error');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const links = [
    { icon: Globe, label: '官方网站', url: 'https://openchat.example.com' },
    { icon: Github, label: 'GitHub', url: 'https://github.com/openchat' },
    { icon: MessageCircle, label: '社区论坛', url: 'https://community.openchat.example.com' },
    { icon: Mail, label: '联系我们', url: 'mailto:support@openchat.example.com' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <Info className="w-7 h-7 text-blue-500" />
        关于 OpenChat
      </h1>

      {/* Logo 和版本信息 */}
      <div className="text-center py-8">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <span className="text-4xl font-bold text-white">OC</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">OpenChat</h2>
        <p className="text-gray-500 mt-1">下一代智能通讯平台</p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="text-sm text-gray-600">版本 {appInfo?.version || '3.0.0'}</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-600">Build {appInfo?.buildNumber || '20240101'}</span>
        </div>
        {appInfo?.updateAvailable && (
          <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm">
            <Check className="w-4 h-4" />
            有新版本可用: {appInfo.latestVersion}
          </div>
        )}
      </div>

      {/* 更新检查 */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">软件更新</h3>
            <p className="text-sm text-gray-500 mt-1">
              {appInfo?.updateAvailable 
                ? `新版本 ${appInfo.latestVersion} 可用` 
                : '当前已是最新版本'}
            </p>
          </div>
          <Button
            onClick={checkForUpdates}
            disabled={isCheckingUpdate}
            variant={appInfo?.updateAvailable ? 'default' : 'outline'}
          >
            {isCheckingUpdate ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                检查中...
              </>
            ) : appInfo?.updateAvailable ? (
              <>
                <Download className="w-4 h-4 mr-2" />
                立即更新
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                检查更新
              </>
            )}
          </Button>
        </div>
        {appInfo?.releaseNotes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="font-medium text-gray-900 mb-2">更新日志</h4>
            <p className="text-sm text-gray-600 whitespace-pre-line">{appInfo.releaseNotes}</p>
          </div>
        )}
      </div>

      {/* 技术信息 */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">技术信息</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { label: '平台', value: appInfo?.platform || 'Desktop (Tauri)' },
            { label: 'Electron 版本', value: appInfo?.electronVersion || 'N/A' },
            { label: 'Tauri 版本', value: appInfo?.tauriVersion || '1.5.0' },
            { label: 'Chromium 版本', value: '120.0.0' },
            { label: 'Node.js 版本', value: '20.10.0' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-6 py-3">
              <span className="text-gray-600">{item.label}</span>
              <span className="text-gray-900 font-mono text-sm">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 相关链接 */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">相关链接</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <link.icon className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{link.label}</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          ))}
        </div>
      </div>

      {/* 版权信息 */}
      <div className="text-center text-sm text-gray-500 mt-8">
        <p>© 2024 OpenChat. All rights reserved.</p>
        <p className="mt-1">Licensed under MIT License</p>
      </div>
    </div>
  );
};
