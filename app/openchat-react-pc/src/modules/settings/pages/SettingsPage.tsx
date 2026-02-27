import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  User, Bell, Shield, Palette, Globe, Database,
  Info, LogOut, ChevronRight, Moon, Sun, Monitor,
  MessageSquare, Image, Video, Mic, Music, Sparkles,
  HardDrive, Trash2, Check
} from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StorageInfo } from '../types';
import { SettingsService } from '../services/SettingsService';

// 设置菜单项配置
interface MenuItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  path: string;
  badge?: string | number;
}

const menuGroups: { title: string; items: MenuItem[] }[] = [
  {
    title: '账号与安全',
    items: [
      {
        id: 'account',
        title: '账号信息',
        description: '管理您的个人资料和账号安全',
        icon: <User className="w-5 h-5" />,
        path: '/settings/account',
      },
      {
        id: 'privacy',
        title: '隐私设置',
        description: '控制谁可以看到您的信息',
        icon: <Shield className="w-5 h-5" />,
        path: '/settings/privacy',
      },
    ],
  },
  {
    title: '个性化',
    items: [
      {
        id: 'theme',
        title: '外观主题',
        description: '选择您喜欢的界面风格',
        icon: <Palette className="w-5 h-5" />,
        path: '/settings/theme',
      },
      {
        id: 'notifications',
        title: '通知设置',
        description: '管理消息和系统通知',
        icon: <Bell className="w-5 h-5" />,
        path: '/settings/notifications',
        badge: 3,
      },
      {
        id: 'language',
        title: '语言与地区',
        description: '简体中文',
        icon: <Globe className="w-5 h-5" />,
        path: '/settings/language',
      },
    ],
  },
  {
    title: 'AI 模型配置',
    items: [
      {
        id: 'models',
        title: '模型设置',
        description: '配置 AI 核心参数',
        icon: <Sparkles className="w-5 h-5" />,
        path: '/settings/models',
      },
    ],
  },
  {
    title: '系统',
    items: [
      {
        id: 'storage',
        title: '存储管理',
        description: '查看和管理本地存储空间',
        icon: <HardDrive className="w-5 h-5" />,
        path: '/settings/storage',
      },
      {
        id: 'about',
        title: '关于 OpenChat',
        description: '版本 3.0.0',
        icon: <Info className="w-5 h-5" />,
        path: '/settings/about',
      },
    ],
  },
];

// 菜单项组件
const MenuItemCard: React.FC<{
  item: MenuItem;
  isActive: boolean;
  onClick: () => void;
}> = ({ item, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left",
        isActive 
          ? "bg-blue-50 border-blue-200 border" 
          : "bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
        isActive ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
      )}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={cn(
            "font-medium",
            isActive ? "text-blue-900" : "text-gray-900"
          )}>
            {item.title}
          </h3>
          {item.badge && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
        </div>
        {item.description && (
          <p className={cn(
            "text-sm truncate",
            isActive ? "text-blue-600" : "text-gray-500"
          )}>
            {item.description}
          </p>
        )}
      </div>
      <ChevronRight className={cn(
        "w-5 h-5 flex-shrink-0",
        isActive ? "text-blue-400" : "text-gray-400"
      )} />
    </button>
  );
};

// 用户资料卡片
const UserProfileCard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl">
          {user.avatar ? (
            <img src={user.avatar} alt={user.nickname} className="w-full h-full rounded-full object-cover" />
          ) : (
            user.nickname?.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{user.nickname}</h2>
          <p className="text-white/80 text-sm">{user.email || user.phone}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
              ID: {user.id}
            </span>
            <span className="bg-green-400/20 text-green-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" />
              已认证
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
        <div className="text-center">
          <div className="text-2xl font-bold">128</div>
          <div className="text-white/60 text-sm">好友</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">16</div>
          <div className="text-white/60 text-sm">群组</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">3</div>
          <div className="text-white/60 text-sm">设备</div>
        </div>
      </div>
    </div>
  );
};

// 存储空间卡片
const StorageCard: React.FC = () => {
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const info = await SettingsService.getStorageInfo();
      setStorage(info);
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };

  const handleCleanCache = async () => {
    setIsCleaning(true);
    try {
      await SettingsService.cleanCache();
      await loadStorageInfo();
      showToast('缓存清理成功', 'success');
    } catch (error) {
      showToast('清理失败', 'error');
    } finally {
      setIsCleaning(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!storage) return null;

  const usagePercent = (storage.used / storage.total) * 100;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-gray-500" />
          <span className="font-medium text-gray-900">存储空间</span>
        </div>
        <button
          onClick={handleCleanCache}
          disabled={isCleaning}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {isCleaning ? '清理中...' : '清理缓存'}
        </button>
      </div>
      <div className="space-y-2">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all",
              usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-yellow-500" : "bg-blue-500"
            )}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">
            已用 {formatSize(storage.used)} / {formatSize(storage.total)}
          </span>
          <span className={cn(
            usagePercent > 90 ? "text-red-500" : "text-gray-500"
          )}>
            {usagePercent.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">{formatSize(storage.mediaSize)}</div>
          <div className="text-xs text-gray-500">媒体</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">{formatSize(storage.documentSize)}</div>
          <div className="text-xs text-gray-500">文档</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">{formatSize(storage.cacheSize)}</div>
          <div className="text-xs text-gray-500">缓存</div>
        </div>
      </div>
    </div>
  );
};

// 主设置页面
export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // 判断当前激活的菜单项
  const activeItemId = menuGroups
    .flatMap(g => g.items)
    .find(item => location.pathname.startsWith(item.path))?.id;

  const handleLogout = async () => {
    try {
      await logout();
      showToast('已成功退出登录', 'success');
      navigate('/auth/login');
    } catch (error) {
      showToast('退出失败', 'error');
    }
  };

  return (
    <div className="h-full w-full flex bg-gray-50 overflow-hidden">
      <div className="flex-1 px-6 py-6 w-full overflow-hidden">
        <div className="flex gap-6 h-full">
          {/* 左侧菜单栏 */}
          <div className="w-80 flex-shrink-0 overflow-y-auto">
            <div className="space-y-6">
              {/* 用户资料 */}
              <UserProfileCard />

              {/* 菜单组 */}
              <div className="space-y-6">
                {menuGroups.map((group) => (
                  <div key={group.title}>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
                      {group.title}
                    </h3>
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          isActive={activeItemId === item.id}
                          onClick={() => navigate(item.path)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 存储空间 */}
              <StorageCard />

              {/* 退出登录 */}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">退出登录</span>
              </button>
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-gray-100 h-full">
              <Outlet />
            </div>
          </div>
        </div>
      </div>

      {/* 退出确认弹窗 */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="确认退出登录？"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            退出后您需要重新登录才能使用完整功能。
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              确认退出
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
