/**
 * DeviceListPage 组件
 * 
 * 职责：
 * 1. 展示设备列表，支持分页、搜索和排序
 * 2. 显示设备的基本信息，如设备ID、设备类型、状态、在线状态等
 * 3. 提供设备的操作功能，如编辑、删除、重启等
 * 4. 支持批量操作，如批量删除、批量重启等
 */

import React, { useState, useEffect } from 'react';

// 设备类型定义
interface Device {
  id: string;
  deviceId: string;
  name: string;
  type: 'xiaozhi' | 'sensor' | 'actuator' | 'camera';
  status: 'online' | 'offline' | 'error';
  ipAddress: string;
  macAddress: string;
  lastActive: string;
  createdAt: string;
}

// 模拟设备数据
const mockDevices: Device[] = [
  {
    id: '1',
    deviceId: 'XZ-123456',
    name: '开源小智设备1',
    type: 'xiaozhi',
    status: 'online',
    ipAddress: '192.168.1.100',
    macAddress: '00:11:22:33:44:55',
    lastActive: '2026-02-03 09:00:00',
    createdAt: '2026-01-01 10:00:00'
  },
  {
    id: '2',
    deviceId: 'SN-789012',
    name: '传感器设备1',
    type: 'sensor',
    status: 'offline',
    ipAddress: '192.168.1.101',
    macAddress: '11:22:33:44:55:66',
    lastActive: '2026-02-02 11:00:00',
    createdAt: '2026-01-02 11:00:00'
  },
  {
    id: '3',
    deviceId: 'AC-345678',
    name: '执行器设备1',
    type: 'actuator',
    status: 'online',
    ipAddress: '192.168.1.102',
    macAddress: '22:33:44:55:66:77',
    lastActive: '2026-02-03 10:00:00',
    createdAt: '2026-01-03 12:00:00'
  },
  {
    id: '4',
    deviceId: 'CM-901234',
    name: '摄像头设备1',
    type: 'camera',
    status: 'error',
    ipAddress: '192.168.1.103',
    macAddress: '33:44:55:66:77:88',
    lastActive: '2026-02-01 12:00:00',
    createdAt: '2026-01-04 13:00:00'
  },
  {
    id: '5',
    deviceId: 'XZ-567890',
    name: '开源小智设备2',
    type: 'xiaozhi',
    status: 'online',
    ipAddress: '192.168.1.104',
    macAddress: '44:55:66:77:88:99',
    lastActive: '2026-02-03 11:00:00',
    createdAt: '2026-01-05 14:00:00'
  },
  {
    id: '6',
    deviceId: 'SN-123456',
    name: '传感器设备2',
    type: 'sensor',
    status: 'online',
    ipAddress: '192.168.1.105',
    macAddress: '55:66:77:88:99:00',
    lastActive: '2026-02-03 12:00:00',
    createdAt: '2026-01-06 15:00:00'
  },
  {
    id: '7',
    deviceId: 'AC-789012',
    name: '执行器设备2',
    type: 'actuator',
    status: 'offline',
    ipAddress: '192.168.1.106',
    macAddress: '66:77:88:99:00:11',
    lastActive: '2026-02-02 13:00:00',
    createdAt: '2026-01-07 16:00:00'
  },
  {
    id: '8',
    deviceId: 'CM-345678',
    name: '摄像头设备2',
    type: 'camera',
    status: 'online',
    ipAddress: '192.168.1.107',
    macAddress: '77:88:99:00:11:22',
    lastActive: '2026-02-03 13:00:00',
    createdAt: '2026-01-08 17:00:00'
  },
  {
    id: '9',
    deviceId: 'XZ-901234',
    name: '开源小智设备3',
    type: 'xiaozhi',
    status: 'online',
    ipAddress: '192.168.1.108',
    macAddress: '88:99:00:11:22:33',
    lastActive: '2026-02-03 14:00:00',
    createdAt: '2026-01-09 18:00:00'
  },
  {
    id: '10',
    deviceId: 'SN-567890',
    name: '传感器设备3',
    type: 'sensor',
    status: 'error',
    ipAddress: '192.168.1.109',
    macAddress: '99:00:11:22:33:44',
    lastActive: '2026-02-01 14:00:00',
    createdAt: '2026-01-10 19:00:00'
  }
];

// 获取设备类型对应的显示文本
const getDeviceTypeText = (type: string) => {
  switch (type) {
    case 'xiaozhi':
      return '开源小智';
    case 'sensor':
      return '传感器';
    case 'actuator':
      return '执行器';
    case 'camera':
      return '摄像头';
    default:
      return type;
  }
};

// 获取设备状态对应的显示文本和样式
const getDeviceStatusInfo = (status: string) => {
  switch (status) {
    case 'online':
      return { text: '在线', className: 'badge-success' };
    case 'offline':
      return { text: '离线', className: 'badge-warning' };
    case 'error':
      return { text: '错误', className: 'badge-danger' };
    default:
      return { text: status, className: 'badge-primary' };
  }
};

// 设备列表页面组件
export const DeviceListPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>(mockDevices);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortField, setSortField] = useState<keyof Device>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 过滤和排序设备
  useEffect(() => {
    let result = [...devices];

    // 搜索过滤
    if (searchTerm) {
      result = result.filter(
        device =>
          device.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          device.ipAddress.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 排序
    result.sort((a, b) => {
      if (a[sortField] < b[sortField]) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (a[sortField] > b[sortField]) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setFilteredDevices(result);
    setCurrentPage(1);
  }, [devices, searchTerm, sortField, sortDirection]);

  // 计算分页信息
  const totalItems = filteredDevices.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDevices = filteredDevices.slice(startIndex, endIndex);

  // 处理搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // 处理排序
  const handleSort = (field: keyof Device) => {
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

  // 处理设备选择
  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevices(prev => {
      if (prev.includes(deviceId)) {
        return prev.filter(id => id !== deviceId);
      } else {
        return [...prev, deviceId];
      }
    });
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedDevices.length === currentDevices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(currentDevices.map(device => device.id));
    }
  };

  // 处理删除设备
  const handleDeleteDevice = (deviceId: string) => {
    setDevices(prev => prev.filter(device => device.id !== deviceId));
  };

  // 处理批量删除
  const handleBatchDelete = () => {
    setDevices(prev => prev.filter(device => !selectedDevices.includes(device.id)));
    setSelectedDevices([]);
    setShowDeleteModal(false);
  };

  // 处理编辑设备
  const handleEditDevice = (deviceId: string) => {
    // 这里应该跳转到编辑页面或打开编辑模态框
    console.log('Edit device:', deviceId);
  };

  // 处理重启设备
  const handleRestartDevice = (deviceId: string) => {
    // 这里应该发送重启命令到设备
    console.log('Restart device:', deviceId);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">设备列表</h1>
          <p className="text-gray-500 mt-1">管理系统设备</p>
        </div>
        <div className="flex space-x-2">
          <a href="/devices/create" className="btn btn-primary">
            添加设备
          </a>
          {selectedDevices.length > 0 && (
            <button
              className="btn btn-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              批量删除
            </button>
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
                placeholder="搜索设备ID、名称或IP地址..."
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
              共 {totalItems} 个设备
            </div>
          </div>
        </div>
      </div>

      {/* 设备列表表格 */}
      <div className="card overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th className="w-12">
                <input
                  type="checkbox"
                  checked={selectedDevices.length === currentDevices.length && currentDevices.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
                />
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('deviceId')}
              >
                设备ID
                {sortField === 'deviceId' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('name')}
              >
                设备名称
                {sortField === 'name' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('type')}
              >
                设备类型
                {sortField === 'type' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
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
                onClick={() => handleSort('ipAddress')}
              >
                IP地址
                {sortField === 'ipAddress' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('lastActive')}
              >
                最后活跃
                {sortField === 'lastActive' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {currentDevices.map((device) => {
              const statusInfo = getDeviceStatusInfo(device.status);
              return (
                <tr key={device.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(device.id)}
                      onChange={() => handleDeviceSelect(device.id)}
                      className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
                    />
                  </td>
                  <td>{device.deviceId}</td>
                  <td>{device.name}</td>
                  <td>{getDeviceTypeText(device.type)}</td>
                  <td>
                    <span className={`badge ${statusInfo.className}`}>
                      {statusInfo.text}
                    </span>
                  </td>
                  <td>{device.ipAddress}</td>
                  <td>{device.lastActive}</td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        className="btn btn-secondary py-1 px-2 text-xs"
                        onClick={() => handleEditDevice(device.id)}
                      >
                        编辑
                      </button>
                      <button
                        className="btn btn-primary py-1 px-2 text-xs"
                        onClick={() => handleRestartDevice(device.id)}
                      >
                        重启
                      </button>
                      <button
                        className="btn btn-danger py-1 px-2 text-xs"
                        onClick={() => handleDeleteDevice(device.id)}
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
        {filteredDevices.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500">没有找到符合条件的设备</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            显示 {startIndex + 1} 到 {Math.min(endIndex, totalItems)} 共 {totalItems} 个设备
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
              您确定要删除选中的 {selectedDevices.length} 个设备吗？此操作无法撤销。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-danger"
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

export default DeviceListPage;