/**
 * MessageListPage 组件
 * 
 * 职责：
 * 1. 展示消息列表，支持分页、搜索和排序
 * 2. 显示消息的基本信息，如发送方、接收方、消息类型、内容等
 * 3. 提供消息的操作功能，如查看详情、删除等
 * 4. 支持批量操作，如批量删除、批量标记已读等
 */

import React, { useState, useEffect } from 'react';

// 消息类型定义
interface Message {
  id: string;
  from: string;
  to: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'event' | 'command';
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  deviceId?: string;
}

// 模拟消息数据
const mockMessages: Message[] = [
  {
    id: '1',
    from: 'user1@example.com',
    to: 'XZ-123456',
    type: 'text',
    content: '你好，开源小智！',
    status: 'read',
    createdAt: '2026-02-03 09:00:00',
    deviceId: 'XZ-123456'
  },
  {
    id: '2',
    from: 'XZ-123456',
    to: 'user1@example.com',
    type: 'text',
    content: '你好！我是开源小智，有什么可以帮你的吗？',
    status: 'read',
    createdAt: '2026-02-03 09:01:00',
    deviceId: 'XZ-123456'
  },
  {
    id: '3',
    from: 'user2@example.com',
    to: 'SN-789012',
    type: 'command',
    content: 'GET_TEMPERATURE',
    status: 'delivered',
    createdAt: '2026-02-03 09:30:00',
    deviceId: 'SN-789012'
  },
  {
    id: '4',
    from: 'SN-789012',
    to: 'user2@example.com',
    type: 'event',
    content: '{"temperature": 25.5, "humidity": 45}',
    status: 'sent',
    createdAt: '2026-02-03 09:31:00',
    deviceId: 'SN-789012'
  },
  {
    id: '5',
    from: 'user3@example.com',
    to: 'CM-901234',
    type: 'command',
    content: 'CAPTURE_IMAGE',
    status: 'failed',
    createdAt: '2026-02-03 10:00:00',
    deviceId: 'CM-901234'
  },
  {
    id: '6',
    from: 'user1@example.com',
    to: 'XZ-123456',
    type: 'text',
    content: '今天天气怎么样？',
    status: 'read',
    createdAt: '2026-02-03 10:30:00',
    deviceId: 'XZ-123456'
  },
  {
    id: '7',
    from: 'XZ-123456',
    to: 'user1@example.com',
    type: 'text',
    content: '今天天气晴朗，温度25度，非常适合户外活动！',
    status: 'read',
    createdAt: '2026-02-03 10:31:00',
    deviceId: 'XZ-123456'
  },
  {
    id: '8',
    from: 'AC-345678',
    to: 'user2@example.com',
    type: 'event',
    content: '{"status": "on", "power": 100}',
    status: 'delivered',
    createdAt: '2026-02-03 11:00:00',
    deviceId: 'AC-345678'
  },
  {
    id: '9',
    from: 'user3@example.com',
    to: 'XZ-567890',
    type: 'text',
    content: '打开客厅灯',
    status: 'read',
    createdAt: '2026-02-03 11:30:00',
    deviceId: 'XZ-567890'
  },
  {
    id: '10',
    from: 'XZ-567890',
    to: 'user3@example.com',
    type: 'event',
    content: '{"status": "success", "device": "living_room_light"}',
    status: 'read',
    createdAt: '2026-02-03 11:31:00',
    deviceId: 'XZ-567890'
  }
];

// 获取消息类型对应的显示文本
const getMessageTypeText = (type: string) => {
  switch (type) {
    case 'text':
      return '文本';
    case 'image':
      return '图片';
    case 'audio':
      return '音频';
    case 'video':
      return '视频';
    case 'file':
      return '文件';
    case 'event':
      return '事件';
    case 'command':
      return '命令';
    default:
      return type;
  }
};

// 获取消息状态对应的显示文本和样式
const getMessageStatusInfo = (status: string) => {
  switch (status) {
    case 'pending':
      return { text: '待发送', className: 'bg-warning-100 text-warning-800 px-2 py-1 rounded text-xs' };
    case 'sent':
      return { text: '已发送', className: 'bg-primary-100 text-primary-800 px-2 py-1 rounded text-xs' };
    case 'delivered':
      return { text: '已送达', className: 'bg-info-100 text-info-800 px-2 py-1 rounded text-xs' };
    case 'read':
      return { text: '已读', className: 'bg-success-100 text-success-800 px-2 py-1 rounded text-xs' };
    case 'failed':
      return { text: '失败', className: 'bg-danger-100 text-danger-800 px-2 py-1 rounded text-xs' };
    default:
      return { text: status, className: 'bg-secondary-100 text-secondary-800 px-2 py-1 rounded text-xs' };
  }
};

// 消息列表页面组件
export const MessageListPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>(mockMessages);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortField, setSortField] = useState<keyof Message>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 过滤和排序消息
  useEffect(() => {
    let result = [...messages];

    // 搜索过滤
    if (searchTerm) {
      result = result.filter(
        message =>
          message.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
          message.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
          message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (message.deviceId && message.deviceId.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // 排序
    result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === undefined && bValue === undefined) {
        return 0;
      }
      if (aValue === undefined) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (bValue === undefined) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      
      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setFilteredMessages(result);
    setCurrentPage(1);
  }, [messages, searchTerm, sortField, sortDirection]);

  // 计算分页信息
  const totalItems = filteredMessages.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMessages = filteredMessages.slice(startIndex, endIndex);

  // 处理搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // 处理排序
  const handleSort = (field: keyof Message) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 处理每页显示数量变化
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  // 处理消息选择
  const handleMessageSelect = (messageId: string) => {
    setSelectedMessages(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId);
      } else {
        return [...prev, messageId];
      }
    });
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedMessages.length === currentMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(currentMessages.map(message => message.id));
    }
  };

  // 处理删除消息
  const handleDeleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(message => message.id !== messageId));
  };

  // 处理批量删除
  const handleBatchDelete = () => {
    setMessages(prev => prev.filter(message => !selectedMessages.includes(message.id)));
    setSelectedMessages([]);
    setShowDeleteModal(false);
  };

  // 处理查看消息详情
  const handleViewMessage = (messageId: string) => {
    // 这里应该跳转到消息详情页面或打开消息详情模态框
    console.log('View message:', messageId);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">消息列表</h1>
          <p className="text-gray-500 mt-1">管理系统消息</p>
        </div>
        <div className="flex space-x-2">
          {selectedMessages.length > 0 && (
            <>
              <button className="bg-secondary-500 text-white px-4 py-2 rounded-md hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2">
                批量标记已读
              </button>
              <button
                className="bg-danger-500 text-white px-4 py-2 rounded-md hover:bg-danger-600 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2"
                onClick={() => setShowDeleteModal(true)}
              >
                批量删除
              </button>
            </>
          )}
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索发送方、接收方、内容或设备ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={searchTerm}
                onChange={handleSearch}
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">每页显示:</span>
              <select
                className="border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              共 {totalItems} 条消息
            </div>
          </div>
        </div>
      </div>

      {/* 消息列表表格 */}
      <div className="card overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th className="w-12">
                <input
                  type="checkbox"
                  checked={selectedMessages.length === currentMessages.length && currentMessages.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
                />
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('from')}
              >
                发送方
                {sortField === 'from' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('to')}
              >
                接收方
                {sortField === 'to' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('type')}
              >
                类型
                {sortField === 'type' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th>内容</th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('status')}
              >
                状态
                {sortField === 'status' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('createdAt')}
              >
                发送时间
                {sortField === 'createdAt' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th>设备ID</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {currentMessages.map((message) => {
              const statusInfo = getMessageStatusInfo(message.status);
              return (
                <tr key={message.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedMessages.includes(message.id)}
                      onChange={() => handleMessageSelect(message.id)}
                      className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
                    />
                  </td>
                  <td>{message.from}</td>
                  <td>{message.to}</td>
                  <td>{getMessageTypeText(message.type)}</td>
                  <td className="max-w-xs truncate">{message.content}</td>
                  <td>
                    <span className={statusInfo.className}>
                      {statusInfo.text}
                    </span>
                  </td>
                  <td>{message.createdAt}</td>
                  <td>{message.deviceId || '-'}</td>
                  <td>
                    <div className="flex space-x-2">
              <button
                className="bg-secondary-500 text-white py-1 px-2 text-xs rounded-md hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
                onClick={() => handleViewMessage(message.id)}
              >
                查看
              </button>
              <button
                className="bg-danger-500 text-white py-1 px-2 text-xs rounded-md hover:bg-danger-600 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2"
                onClick={() => handleDeleteMessage(message.id)}
              >
                删除
              </button>
            </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 空状态 */}
        {filteredMessages.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500">没有找到符合条件的消息</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            显示 {startIndex + 1} 到 {Math.min(endIndex, totalItems)} 共 {totalItems} 条消息
          </div>
          <div className="flex space-x-1">
            <button
              className={`px-3 py-1 rounded border ${currentPage === 1 ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              首页
            </button>
            <button
              className={`px-3 py-1 rounded border ${currentPage === 1 ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              上一页
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter(page => page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2))
              .map(page => (
                <button
                  key={page}
                  className={`px-3 py-1 rounded border ${currentPage === page ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
            <button
              className={`px-3 py-1 rounded border ${currentPage === totalPages ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              下一页
            </button>
            <button
              className={`px-3 py-1 rounded border ${currentPage === totalPages ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              末页
            </button>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">确认删除</h3>
            <p className="text-gray-600 mb-6">
              您确定要删除选中的 {selectedMessages.length} 条消息吗？此操作无法撤销。
            </p>
            <div className="flex space-x-2">
              <button
                className="bg-secondary-500 text-white px-4 py-2 rounded-md hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
                onClick={() => setShowDeleteModal(false)}
              >
                取消
              </button>
              <button
                className="bg-danger-500 text-white px-4 py-2 rounded-md hover:bg-danger-600 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2"
                onClick={handleBatchDelete}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageListPage;