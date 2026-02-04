/**
 * MainLayout 组件
 * 
 * 职责：
 * 1. 提供应用的主要布局结构
 * 2. 包含侧边栏导航
 * 3. 包含顶部导航栏
 * 4. 渲染主内容区域
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthContext } from '../app/AppProvider';

// 侧边栏菜单项类型定义
interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  submenu?: MenuItem[];
}

// 侧边栏菜单项配置
const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: '仪表盘',
    path: '/dashboard',
    icon: '📊'
  },
  {
    id: 'users',
    label: '用户管理',
    path: '/users',
    icon: '👥',
    submenu: [
      {
        id: 'user-list',
        label: '用户列表',
        path: '/users/list',
        icon: '📋'
      },
      {
        id: 'user-create',
        label: '创建用户',
        path: '/users/create',
        icon: '➕'
      }
    ]
  },
  {
    id: 'devices',
    label: '设备管理',
    path: '/devices',
    icon: '📱',
    submenu: [
      {
        id: 'device-list',
        label: '设备列表',
        path: '/devices/list',
        icon: '📋'
      },
      {
        id: 'device-create',
        label: '添加设备',
        path: '/devices/create',
        icon: '➕'
      }
    ]
  },
  {
    id: 'messages',
    label: '消息管理',
    path: '/messages',
    icon: '💬',
    submenu: [
      {
        id: 'message-list',
        label: '消息列表',
        path: '/messages/list',
        icon: '📋'
      },
      {
        id: 'message-settings',
        label: '消息设置',
        path: '/messages/settings',
        icon: '⚙️'
      }
    ]
  },
  {
    id: 'system',
    label: '系统管理',
    path: '/system',
    icon: '⚙️',
    submenu: [
      {
        id: 'system-settings',
        label: '系统设置',
        path: '/system/settings',
        icon: '🔧'
      },
      {
        id: 'system-logs',
        label: '系统日志',
        path: '/system/logs',
        icon: '📄'
      },
      {
        id: 'system-monitor',
        label: '系统监控',
        path: '/system/monitor',
        icon: '👁️'
      }
    ]
  }
];

// 侧边栏组件
const Sidebar: React.FC = () => {
  const location = useLocation();
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);
  const { user, logout } = useAuthContext();

  // 切换子菜单展开状态
  const toggleSubmenu = (menuId: string) => {
    setExpandedSubmenu(expandedSubmenu === menuId ? null : menuId);
  };

  // 检查菜单项是否激活
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // 检查父菜单项是否有激活的子菜单
  const hasActiveSubmenu = (submenu?: MenuItem[]) => {
    if (!submenu) return false;
    return submenu.some(item => isActive(item.path));
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 overflow-y-auto">
      {/* 侧边栏顶部品牌标识 */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-500">OpenChat Admin</h1>
        <p className="text-sm text-gray-500">管理系统</p>
      </div>

      {/* 侧边栏菜单 */}
      <nav className="p-4">
        {menuItems.map((item) => (
          <div key={item.id} className="mb-2">
            {/* 父菜单项 */}
            <div
              className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-200 ${
                isActive(item.path) || hasActiveSubmenu(item.submenu)
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : 'hover:bg-gray-100'
              }`}
            >
              <Link to={item.path} className="flex items-center space-x-3 w-full">
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
              {item.submenu && (
                <button
                  onClick={() => toggleSubmenu(item.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {expandedSubmenu === item.id ? '▼' : '▶'}
                </button>
              )}
            </div>

            {/* 子菜单项 */}
            {item.submenu && expandedSubmenu === item.id && (
              <div className="pl-8 mt-1 space-y-1">
                {item.submenu.map((subItem) => (
                  <Link
                    key={subItem.id}
                    to={subItem.path}
                    className={`flex items-center space-x-2 p-2 rounded-md transition-all duration-200 ${
                      isActive(subItem.path)
                        ? 'bg-primary-50 text-primary-600 font-medium'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span className="text-sm">{subItem.icon}</span>
                    <span className="text-sm">{subItem.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* 侧边栏底部用户信息 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-500 font-medium">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">{user?.username}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="退出登录"
          >
            🚪
          </button>
        </div>
      </div>
    </div>
  );
};

// 顶部导航栏组件
const TopBar: React.FC = () => {
  const [notifications] = useState([
    { id: '1', message: '新用户注册', time: '10分钟前' },
    { id: '2', message: '设备离线', time: '30分钟前' },
    { id: '3', message: '系统更新完成', time: '1小时前' }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 h-16 fixed top-0 left-64 right-0 flex items-center justify-between px-6">
      {/* 左侧搜索栏 */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
        </div>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center space-x-6">
        {/* 通知图标 */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-gray-500 hover:text-gray-700 transition-colors relative"
          >
            🔔
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
              {notifications.length}
            </span>
          </button>

          {/* 通知下拉菜单 */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
              <div className="p-3 border-b border-gray-200">
                <h3 className="font-medium">通知</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                  </div>
                ))}
              </div>
              <div className="p-2 text-center">
                <button className="text-sm text-primary-500 hover:text-primary-600">查看全部</button>
              </div>
            </div>
          )}
        </div>

        {/* 消息图标 */}
        <button className="text-gray-500 hover:text-gray-700 transition-colors">
          💬
        </button>

        {/* 设置图标 */}
        <button className="text-gray-500 hover:text-gray-700 transition-colors">
          ⚙️
        </button>
      </div>
    </div>
  );
};

// 主布局组件
interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区域 */}
      <div className="flex-1 ml-64 mt-16">
        {/* 顶部导航栏 */}
        <TopBar />

        {/* 主内容 */}
        <main className="p-6 bg-gray-50 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;