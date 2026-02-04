import React, { useState, useEffect } from 'react';

// 日志类型定义
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  category: 'system' | 'auth' | 'api' | 'database' | 'other';
  message: string;
  user?: string;
  ip?: string;
  details?: string;
}

// 模拟日志数据
const generateMockLogs = (): LogEntry[] => {
  const logs: LogEntry[] = [];
  const levels: ('info' | 'warning' | 'error' | 'debug')[] = ['info', 'warning', 'error', 'debug'];
  const categories: ('system' | 'auth' | 'api' | 'database' | 'other')[] = ['system', 'auth', 'api', 'database', 'other'];
  const messages = [
    '系统启动成功',
    '用户登录成功',
    '用户登录失败',
    'API请求成功',
    'API请求失败',
    '数据库连接成功',
    '数据库查询超时',
    '文件上传成功',
    '文件上传失败',
    '系统配置更新',
  ];
  const users = ['admin', 'user1', 'user2', 'user3', 'anonymous'];
  const ips = [
    '192.168.1.1',
    '192.168.1.2',
    '10.0.0.1',
    '10.0.0.2',
    '203.0.113.1',
  ];

  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
    const level = levels[Math.floor(Math.random() * levels.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const ip = ips[Math.floor(Math.random() * ips.length)];

    logs.push({
      id: `log-${i + 1}`,
      timestamp,
      level,
      category,
      message,
      user,
      ip,
      details: level === 'error' ? '详细错误信息: 发生了一个系统错误，请检查相关配置。' : undefined,
    });
  }

  // 按时间戳降序排序
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

/**
 * 系统日志页面
 * 功能：查看系统日志、筛选日志、搜索日志、导出日志
 */
export const SystemLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7d');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 初始化加载日志
  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockLogs = generateMockLogs();
        setLogs(mockLogs);
        setFilteredLogs(mockLogs);
      } catch (error) {
        console.error('加载日志失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  // 应用过滤器
  useEffect(() => {
    let result = [...logs];

    // 应用搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(log => 
        log.message.toLowerCase().includes(term) ||
        log.user?.toLowerCase().includes(term) ||
        log.ip?.includes(term) ||
        log.details?.toLowerCase().includes(term)
      );
    }

    // 应用级别过滤
    if (levelFilter !== 'all') {
      result = result.filter(log => log.level === levelFilter);
    }

    // 应用类别过滤
    if (categoryFilter !== 'all') {
      result = result.filter(log => log.category === categoryFilter);
    }

    // 应用日期过滤
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();

      switch (dateFilter) {
        case '1h':
          cutoffDate.setHours(now.getHours() - 1);
          break;
        case '24h':
          cutoffDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }

      result = result.filter(log => new Date(log.timestamp) >= cutoffDate);
    }

    setFilteredLogs(result);
    setPage(1); // 重置到第一页
  }, [logs, searchTerm, levelFilter, categoryFilter, dateFilter]);

  // 计算分页数据
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  // 导出日志
  const handleExportLogs = () => {
    const csvContent = [
      ['ID', '时间', '级别', '类别', '消息', '用户', 'IP', '详情'].join(','),
      ...filteredLogs.map(log => [
        log.id,
        log.timestamp,
        log.level,
        log.category,
        log.message,
        log.user || '',
        log.ip || '',
        log.details || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `system-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 清除过滤器
  const handleClearFilters = () => {
    setSearchTerm('');
    setLevelFilter('all');
    setCategoryFilter('all');
    setDateFilter('7d');
  };

  // 获取日志级别对应的样式
  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'debug':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">系统日志</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleExportLogs}
            className="px-4 py-2 bg-green-500 text-white rounded-md font-medium hover:bg-green-600 transition-colors"
          >
            导出日志
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-md font-medium hover:bg-gray-600 transition-colors"
          >
            清除过滤器
          </button>
        </div>
      </div>

      {/* 过滤器和搜索 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">搜索</label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索日志内容..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">级别</label>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">所有级别</option>
            <option value="info">信息</option>
            <option value="warning">警告</option>
            <option value="error">错误</option>
            <option value="debug">调试</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">类别</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">所有类别</option>
            <option value="system">系统</option>
            <option value="auth">认证</option>
            <option value="api">API</option>
            <option value="database">数据库</option>
            <option value="other">其他</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="1h">1小时</option>
            <option value="24h">24小时</option>
            <option value="7d">7天</option>
            <option value="30d">30天</option>
            <option value="all">全部</option>
          </select>
        </div>
      </div>

      {/* 日志统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-600">总日志数</p>
          <p className="text-2xl font-bold text-blue-800">{filteredLogs.length}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-md">
          <p className="text-sm text-red-600">错误日志</p>
          <p className="text-2xl font-bold text-red-800">{filteredLogs.filter(log => log.level === 'error').length}</p>
        </div>
        <div className="p-4 bg-yellow-50 rounded-md">
          <p className="text-sm text-yellow-600">警告日志</p>
          <p className="text-2xl font-bold text-yellow-800">{filteredLogs.filter(log => log.level === 'warning').length}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-md">
          <p className="text-sm text-green-600">信息日志</p>
          <p className="text-2xl font-bold text-green-800">{filteredLogs.filter(log => log.level === 'info').length}</p>
        </div>
      </div>

      {/* 日志表格 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">加载日志中...</span>
          </div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-md">
          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500">没有找到匹配的日志记录</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    级别
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类别
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    消息
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    详情
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className={log.level === 'error' ? 'bg-red-50' : log.level === 'warning' ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLevelStyle(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.user || '-'}  
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.ip || '-'}  
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.details ? (
                        <button
                          className="text-primary-600 hover:text-primary-900"
                          onClick={() => {
                            // 显示详情模态框
                            alert(log.details);
                          }}
                        >
                          查看
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  显示第 <span className="font-medium">{((page - 1) * pageSize) + 1}</span> 到 <span className="font-medium">{Math.min(page * pageSize, filteredLogs.length)}</span> 条，共 <span className="font-medium">{filteredLogs.length}</span> 条记录
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">第一页</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">最后一页</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// 导出组件
export default SystemLogsPage;