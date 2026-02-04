import React, { useState, useEffect } from 'react';

// 系统状态类型定义
interface SystemStatus {
  uptime: number;
  loadAverage: number[];
  cpuUsage: number;
  memoryUsage: {
    total: number;
    used: number;
    free: number;
  };
  diskUsage: {
    total: number;
    used: number;
    free: number;
  };
  network: {
    rxBytes: number;
    txBytes: number;
    rxPackets: number;
    txPackets: number;
  };
  processes: number;
  timestamp: string;
}

// 服务器信息类型定义
interface ServerInfo {
  id: string;
  name: string;
  ip: string;
  status: 'online' | 'offline' | 'warning';
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
  lastChecked: string;
}

// 模拟系统状态数据
const generateMockSystemStatus = (): SystemStatus => {
  return {
    uptime: Math.floor(Math.random() * 86400) + 3600, // 1小时到25小时之间
    loadAverage: [
      Math.random() * 2,
      Math.random() * 1.5,
      Math.random() * 1
    ],
    cpuUsage: Math.random() * 80 + 10, // 10%到90%之间
    memoryUsage: {
      total: 16 * 1024 * 1024 * 1024, // 16GB
      used: Math.random() * 12 * 1024 * 1024 * 1024 + 2 * 1024 * 1024 * 1024, // 2GB到14GB之间
      free: 0
    },
    diskUsage: {
      total: 500 * 1024 * 1024 * 1024, // 500GB
      used: Math.random() * 300 * 1024 * 1024 * 1024 + 50 * 1024 * 1024 * 1024, // 50GB到350GB之间
      free: 0
    },
    network: {
      rxBytes: Math.random() * 1000000000 + 100000000, // 100MB到1.1GB之间
      txBytes: Math.random() * 500000000 + 50000000, // 50MB到550MB之间
      rxPackets: Math.random() * 1000000 + 100000, // 100K到1.1M之间
      txPackets: Math.random() * 500000 + 50000, // 50K到550K之间
    },
    processes: Math.floor(Math.random() * 200) + 50, // 50到250之间
    timestamp: new Date().toISOString()
  };
};

// 模拟服务器信息数据
const generateMockServerInfo = (): ServerInfo[] => {
  const servers: ServerInfo[] = [];
  const statuses: ('online' | 'offline' | 'warning')[] = ['online', 'offline', 'warning'];
  
  for (let i = 1; i <= 5; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    servers.push({
      id: `server-${i}`,
      name: `服务器 ${i}`,
      ip: `192.168.1.${100 + i}`,
      status,
      cpuUsage: status === 'offline' ? 0 : Math.random() * 80 + 10,
      memoryUsage: status === 'offline' ? 0 : Math.random() * 80 + 10,
      diskUsage: status === 'offline' ? 0 : Math.random() * 80 + 10,
      uptime: status === 'offline' ? 0 : Math.floor(Math.random() * 86400) + 3600,
      lastChecked: new Date().toISOString()
    });
  }
  
  return servers;
};

// 格式化时间
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
};

// 格式化字节数
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 系统监控页面
 * 功能：监控系统状态、服务器性能、资源使用情况
 */
export const SystemMonitorPage: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5秒刷新一次
  const [timeRange, setTimeRange] = useState('1h'); // 1小时数据范围

  // 初始化加载数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 500));
        const status = generateMockSystemStatus();
        // 计算空闲内存和磁盘空间
        status.memoryUsage.free = status.memoryUsage.total - status.memoryUsage.used;
        status.diskUsage.free = status.diskUsage.total - status.diskUsage.used;
        setSystemStatus(status);
        
        const serverInfo = generateMockServerInfo();
        setServers(serverInfo);
      } catch (error) {
        console.error('加载系统状态失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // 设置定时刷新
    const interval = setInterval(loadData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // 获取状态对应的样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态对应的图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'offline':
        return (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">系统监控</h1>
        <div className="flex space-x-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">刷新间隔</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={1000}>1秒</option>
              <option value={5000}>5秒</option>
              <option value={10000}>10秒</option>
              <option value={30000}>30秒</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="1h">1小时</option>
              <option value="6h">6小时</option>
              <option value="24h">24小时</option>
              <option value="7d">7天</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">加载系统状态中...</span>
          </div>
        </div>
      ) : systemStatus ? (
        <>
          {/* 系统概览卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-600">系统运行时间</p>
              <p className="text-2xl font-bold text-blue-800">{formatUptime(systemStatus.uptime)}</p>
              <p className="text-xs text-blue-500 mt-1">最后更新: {new Date(systemStatus.timestamp).toLocaleTimeString()}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-md">
              <p className="text-sm text-green-600">CPU使用率</p>
              <p className="text-2xl font-bold text-green-800">{systemStatus.cpuUsage.toFixed(1)}%</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${systemStatus.cpuUsage}%` }}
                />
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-md">
              <p className="text-sm text-purple-600">内存使用率</p>
              <p className="text-2xl font-bold text-purple-800">
                {((systemStatus.memoryUsage.used / systemStatus.memoryUsage.total) * 100).toFixed(1)}%
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${(systemStatus.memoryUsage.used / systemStatus.memoryUsage.total) * 100}%` }}
                />
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-600">磁盘使用率</p>
              <p className="text-2xl font-bold text-yellow-800">
                {((systemStatus.diskUsage.used / systemStatus.diskUsage.total) * 100).toFixed(1)}%
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ width: `${(systemStatus.diskUsage.used / systemStatus.diskUsage.total) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* 详细系统状态 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 内存和磁盘使用详情 */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">资源使用详情</h2>
              
              <div className="space-y-6">
                {/* 内存使用 */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">内存使用</span>
                    <span className="text-sm text-gray-600">
                      {formatBytes(systemStatus.memoryUsage.used)} / {formatBytes(systemStatus.memoryUsage.total)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-purple-500 h-4 rounded-full" 
                      style={{ width: `${(systemStatus.memoryUsage.used / systemStatus.memoryUsage.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>已用: {formatBytes(systemStatus.memoryUsage.used)}</span>
                    <span>空闲: {formatBytes(systemStatus.memoryUsage.free)}</span>
                  </div>
                </div>

                {/* 磁盘使用 */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">磁盘使用</span>
                    <span className="text-sm text-gray-600">
                      {formatBytes(systemStatus.diskUsage.used)} / {formatBytes(systemStatus.diskUsage.total)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-yellow-500 h-4 rounded-full" 
                      style={{ width: `${(systemStatus.diskUsage.used / systemStatus.diskUsage.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>已用: {formatBytes(systemStatus.diskUsage.used)}</span>
                    <span>空闲: {formatBytes(systemStatus.diskUsage.free)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 网络和进程信息 */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">网络和进程</h2>
              
              <div className="space-y-4">
                {/* 网络流量 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">网络流量</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded-md shadow-sm">
                      <p className="text-xs text-gray-500">接收</p>
                      <p className="text-lg font-bold text-blue-600">{formatBytes(systemStatus.network.rxBytes)}</p>
                      <p className="text-xs text-gray-500">{systemStatus.network.rxPackets} 数据包</p>
                    </div>
                    <div className="p-3 bg-white rounded-md shadow-sm">
                      <p className="text-xs text-gray-500">发送</p>
                      <p className="text-lg font-bold text-green-600">{formatBytes(systemStatus.network.txBytes)}</p>
                      <p className="text-xs text-gray-500">{systemStatus.network.txPackets} 数据包</p>
                    </div>
                  </div>
                </div>

                {/* 系统负载 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">系统负载</h3>
                  <div className="p-3 bg-white rounded-md shadow-sm">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">1分钟</p>
                        <p className="text-lg font-bold text-gray-700">{systemStatus.loadAverage[0].toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">5分钟</p>
                        <p className="text-lg font-bold text-gray-700">{systemStatus.loadAverage[1].toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">15分钟</p>
                        <p className="text-lg font-bold text-gray-700">{systemStatus.loadAverage[2].toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 进程数 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">进程数</h3>
                  <div className="p-3 bg-white rounded-md shadow-sm">
                    <p className="text-2xl font-bold text-gray-700">{systemStatus.processes}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 服务器列表 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">服务器状态</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      服务器名称
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP地址
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPU使用率
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      内存使用率
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      磁盘使用率
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      运行时间
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {servers.map((server) => (
                    <tr key={server.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {server.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {server.ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(server.status)}`}>
                          {getStatusIcon(server.status)}
                          {server.status === 'online' ? '在线' : server.status === 'offline' ? '离线' : '警告'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {server.cpuUsage.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {server.memoryUsage.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {server.diskUsage.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {server.status === 'offline' ? '-' : formatUptime(server.uptime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 系统告警 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">系统告警</h2>
            <div className="bg-red-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-semibold text-red-700">当前告警</h3>
              </div>
              <div className="space-y-3">
                {servers
                  .filter(server => server.status === 'warning' || server.status === 'offline')
                  .map(server => (
                    <div key={server.id} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm">
                      <div className="flex items-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(server.status)} mr-3`}>
                          {getStatusIcon(server.status)}
                          {server.status === 'warning' ? '警告' : '离线'}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{server.name} ({server.ip})</span>
                      </div>
                      <button className="text-primary-600 hover:text-primary-900 text-sm">
                        查看详情
                      </button>
                    </div>
                  ))
                }
                {servers.every(server => server.status === 'online') && (
                  <div className="text-center p-4 text-gray-500">
                    <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <p>当前没有告警</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-md">
          <div className="text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-gray-500">无法获取系统状态</p>
          </div>
        </div>
      )}
    </div>
  );
};

// 导出组件
export default SystemMonitorPage;