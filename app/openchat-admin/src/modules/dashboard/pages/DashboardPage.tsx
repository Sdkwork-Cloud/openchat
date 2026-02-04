/**
 * DashboardPage 组件
 * 
 * 职责：
 * 1. 展示系统的关键指标和概览信息
 * 2. 显示用户数量、设备数量、消息数量等统计数据
 * 3. 展示系统状态和性能指标
 * 4. 提供快速访问系统功能的入口
 */

import React, { useState } from 'react';

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  trend?: string;
  trendType?: 'up' | 'down';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  trendType
}) => {
  return (
    <div className="card">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trendType === 'up' ? 'text-success-500' : 'text-danger-500'
            }`}>
              {trendType === 'up' ? '↑' : '↓'} {trend}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

// 系统状态组件
const SystemStatus: React.FC = () => {
  const [status] = useState({
    cpu: 45,
    memory: 60,
    disk: 75,
    network: 30
  });

  return (
    <div className="card">
      <h3 className="text-lg font-medium mb-4">系统状态</h3>
      <div className="space-y-4">
        {/* CPU 使用率 */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>CPU 使用率</span>
            <span>{status.cpu}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${status.cpu}%` }}
            ></div>
          </div>
        </div>

        {/* 内存使用率 */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>内存使用率</span>
            <span>{status.memory}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-warning-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${status.memory}%` }}
            ></div>
          </div>
        </div>

        {/* 磁盘使用率 */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>磁盘使用率</span>
            <span>{status.disk}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-danger-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${status.disk}%` }}
            ></div>
          </div>
        </div>

        {/* 网络使用率 */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>网络使用率</span>
            <span>{status.network}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-success-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${status.network}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 最近活动组件
const RecentActivities: React.FC = () => {
  const [activities] = useState([
    {
      id: '1',
      type: 'user',
      action: '新用户注册',
      user: '张三',
      time: '10分钟前'
    },
    {
      id: '2',
      type: 'device',
      action: '设备上线',
      user: '设备A-123',
      time: '25分钟前'
    },
    {
      id: '3',
      type: 'message',
      action: '消息发送',
      user: '李四',
      time: '1小时前'
    },
    {
      id: '4',
      type: 'system',
      action: '系统更新',
      user: '系统',
      time: '2小时前'
    },
    {
      id: '5',
      type: 'user',
      action: '用户登录',
      user: '王五',
      time: '3小时前'
    }
  ]);

  // 获取活动类型对应的图标
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return '👥';
      case 'device':
        return '📱';
      case 'message':
        return '💬';
      case 'system':
        return '⚙️';
      default:
        return '📄';
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-medium mb-4">最近活动</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-md transition-colors">
            <div className="p-2 bg-gray-100 rounded-full">
              <span>{getActivityIcon(activity.type)}</span>
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <p className="text-sm font-medium">{activity.action}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
              <p className="text-xs text-gray-600 mt-1">{activity.user}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <button className="text-sm text-primary-500 hover:text-primary-600">
          查看全部活动
        </button>
      </div>
    </div>
  );
};

// 快速操作组件
const QuickActions: React.FC = () => {
  const actions = [
    {
      id: '1',
      title: '创建用户',
      icon: '👥',
      path: '/users/create'
    },
    {
      id: '2',
      title: '添加设备',
      icon: '📱',
      path: '/devices/create'
    },
    {
      id: '3',
      title: '系统设置',
      icon: '⚙️',
      path: '/system/settings'
    },
    {
      id: '4',
      title: '查看日志',
      icon: '📄',
      path: '/system/logs'
    }
  ];

  return (
    <div className="card">
      <h3 className="text-lg font-medium mb-4">快速操作</h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => (
          <a
            key={action.id}
            href={action.path}
            className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-primary-50 rounded-full text-primary-500">
              <span>{action.icon}</span>
            </div>
            <span className="text-sm font-medium">{action.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

// 仪表盘页面组件
export const DashboardPage: React.FC = () => {
  // 模拟统计数据
  const [stats] = useState({
    users: '1,234',
    devices: '567',
    messages: '8,910',
    onlineDevices: '432'
  });

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">仪表盘</h1>
          <p className="text-gray-500 mt-1">欢迎回来，查看系统概览</p>
        </div>
        <div className="flex space-x-2">
          <button className="btn btn-secondary">
            导出报告
          </button>
          <button className="btn btn-primary">
            刷新数据
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="总用户数"
          value={stats.users}
          icon="👥"
          color="bg-blue-100 text-blue-600"
          trend="12%"
          trendType="up"
        />
        <StatCard
          title="总设备数"
          value={stats.devices}
          icon="📱"
          color="bg-green-100 text-green-600"
          trend="8%"
          trendType="up"
        />
        <StatCard
          title="总消息数"
          value={stats.messages}
          icon="💬"
          color="bg-purple-100 text-purple-600"
          trend="15%"
          trendType="up"
        />
        <StatCard
          title="在线设备"
          value={stats.onlineDevices}
          icon="🟢"
          color="bg-yellow-100 text-yellow-600"
          trend="3%"
          trendType="down"
        />
      </div>

      {/* 系统状态和最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemStatus />
        <RecentActivities />
      </div>

      {/* 快速操作和其他信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions />
        <div className="card">
          <h3 className="text-lg font-medium mb-4">系统信息</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">系统版本</span>
              <span className="text-sm font-medium">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">最后更新</span>
              <span className="text-sm font-medium">2026-02-03</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">服务器状态</span>
              <span className="text-sm font-medium text-success-500">运行中</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">API 响应时间</span>
              <span className="text-sm font-medium">120ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;