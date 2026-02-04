/**
 * 设备列表页面
 *
 * 职责：
 * 1. 显示设备列表
 * 2. 提供设备筛选功能
 * 3. 提供设备操作入口
 */

import { useState, useEffect } from 'react';
import { DeviceStatus } from '../entities/device.entity';
import type { Device, DeviceFilter, DeviceType } from '../entities/device.entity';
import { deviceService } from '../services/device.service';

/**
 * 设备列表页面组件
 */
export function DeviceListPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DeviceFilter>({});

  // 加载设备列表
  useEffect(() => {
    const loadDevices = async () => {
      setLoading(true);
      try {
        const result = await deviceService.getDevices(filter);
        setDevices(result);
      } catch (error) {
        console.error('Failed to load devices:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDevices();
  }, [filter]);

  // 处理筛选变化
  const handleFilterChange = (newFilter: Partial<DeviceFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  };

  // 处理设备状态更新
  const handleStatusUpdate = async (deviceId: string, status: DeviceStatus) => {
    try {
      await deviceService.updateDeviceStatus(deviceId, status);
      // 重新加载设备列表
      const result = await deviceService.getDevices(filter);
      setDevices(result);
    } catch (error) {
      console.error('Failed to update device status:', error);
    }
  };

  // 处理设备删除
  const handleDeleteDevice = async (deviceId: string) => {
    if (window.confirm('确定要删除这个设备吗？')) {
      try {
        await deviceService.deleteDevice(deviceId);
        // 重新加载设备列表
        const result = await deviceService.getDevices(filter);
        setDevices(result);
      } catch (error) {
        console.error('Failed to delete device:', error);
      }
    }
  };

  return (
    <div className="p-6 bg-[var(--bg-primary)] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">设备管理</h1>
          <button className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primary-light)] transition-colors">
            添加设备
          </button>
        </div>

        {/* 筛选器 */}
        <div className="bg-[var(--bg-secondary)] p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 设备类型筛选 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">设备类型</label>
              <select
                className="w-full p-2 border border-[var(--border)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)]"
                onChange={(e) => handleFilterChange({ type: e.target.value as DeviceType })}
              >
                <option value="">全部类型</option>
                <option value="xiaozhi">开源小智</option>
                <option value="other">其他设备</option>
              </select>
            </div>

            {/* 设备状态筛选 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">设备状态</label>
              <select
                className="w-full p-2 border border-[var(--border)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)]"
                onChange={(e) => handleFilterChange({ status: e.target.value as DeviceStatus })}
              >
                <option value="">全部状态</option>
                <option value="online">在线</option>
                <option value="offline">离线</option>
                <option value="unknown">未知</option>
              </select>
            </div>

            {/* 关键词搜索 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">关键词搜索</label>
              <input
                type="text"
                className="w-full p-2 border border-[var(--border)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)]"
                placeholder="设备名称、ID..."
                onChange={(e) => handleFilterChange({ keyword: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* 设备列表 */}
        <div className="bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-tertiary)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    设备名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    设备ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    IP地址
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-[var(--text-secondary)]">
                      加载中...
                    </td>
                  </tr>
                ) : devices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-[var(--text-secondary)]">
                      暂无设备
                    </td>
                  </tr>
                ) : (
                  devices.map((device) => (
                    <tr key={device.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-[var(--primary-light)] rounded-full flex items-center justify-center">
                            {device.type === 'xiaozhi' ? '小智' : '设备'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-[var(--text-primary)]">
                              {device.name}
                            </div>
                            <div className="text-sm text-[var(--text-secondary)]">
                              {device.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                        {device.deviceId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                        {device.type === 'xiaozhi' ? '开源小智' : '其他设备'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${device.status === 'online' ? 'bg-green-100 text-green-800' : device.status === 'offline' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                          {device.status === 'online' ? '在线' : device.status === 'offline' ? '离线' : '未知'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                        {device.ipAddress || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-[var(--primary)] hover:text-[var(--primary-light)]">
                            详情
                          </button>
                          <button 
                            className="text-[var(--secondary)] hover:text-[var(--secondary-light)]"
                            onClick={() => handleStatusUpdate(device.deviceId, device.status === 'online' ? 'offline' : 'online')}
                          >
                            {device.status === 'online' ? '下线' : '上线'}
                          </button>
                          <button className="text-red-600 hover:text-red-800" onClick={() => handleDeleteDevice(device.deviceId)}>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeviceListPage;
