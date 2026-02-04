import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deviceService, type Device, type DeviceMessage, DeviceStatus, DeviceMessageType, type DeviceCommand } from '../index';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';

interface CommandOption {
  label: string;
  value: string;
  params?: any;
}

const commandOptions: CommandOption[] = [
  { label: '播放音乐', value: 'playMusic', params: { url: 'https://example.com/music.mp3' } },
  { label: '停止播放', value: 'stopMusic' },
  { label: '调整音量', value: 'setVolume', params: { volume: 50 } },
  { label: '重启设备', value: 'reboot' },
  { label: '恢复出厂设置', value: 'factoryReset' },
];

const DeviceDetailPage: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<DeviceMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [controlModalOpen, setControlModalOpen] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<string>('');
  const [customParams, setCustomParams] = useState<string>('');

  useEffect(() => {
    if (deviceId) {
      loadDevice();
      loadDeviceMessages();
    }
  }, [deviceId]);

  const loadDevice = async () => {
    try {
      setLoading(true);
      const data = await deviceService.getDevice(deviceId!);
      setDevice(data);
    } catch (error) {
      console.error('Failed to load device:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeviceMessages = async () => {
    try {
      setMessagesLoading(true);
      const data = await deviceService.getDeviceMessages(deviceId!, 50);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load device messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!device) return;

    try {
      const newStatus = device.status === DeviceStatus.ONLINE 
        ? DeviceStatus.OFFLINE 
        : DeviceStatus.ONLINE;
      await deviceService.updateDeviceStatus(deviceId!, newStatus);
      await loadDevice();
    } catch (error) {
      console.error('Failed to update device status:', error);
    }
  };

  const handleCommandExecute = async () => {
    if (!device || !selectedCommand) return;

    try {
      const commandData: DeviceCommand = {
        action: selectedCommand,
        params: customParams ? JSON.parse(customParams) : commandOptions.find(c => c.value === selectedCommand)?.params || {}
      };

      await deviceService.controlDevice(deviceId!, commandData);
      setControlModalOpen(false);
      await loadDeviceMessages();
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  };

  const handleDelete = async () => {
    if (!device) return;

    try {
      await deviceService.deleteDevice(deviceId!);
      navigate('/devices');
    } catch (error) {
      console.error('Failed to delete device:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton height={24} className="mb-4" />
        <Skeleton height={16} className="mb-2" />
        <Skeleton height={16} className="mb-6" />
        <Skeleton height={400} />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-6">
        <EmptyState
          title="设备未找到"
          description="该设备可能已被删除或不存在"
          action={
            <Button onClick={() => navigate('/devices')}>
              返回设备列表
            </Button>
          }
        />
      </div>
    );
  }

  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.ONLINE:
        return 'text-green-600';
      case DeviceStatus.OFFLINE:
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.ONLINE:
        return '在线';
      case DeviceStatus.OFFLINE:
        return '离线';
      default:
        return '未知';
    }
  };

  return (
    <div className="p-6">
      {/* 设备基本信息 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{device.name}</h1>
          <div className="flex space-x-2">
            <Button
              variant="primary"
              onClick={handleStatusToggle}
            >
              {device.status === DeviceStatus.ONLINE ? '设为离线' : '设为在线'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setControlModalOpen(true)}
            >
              控制设备
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
            >
              删除设备
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">设备ID</p>
              <p className="font-mono">{device.deviceId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">设备类型</p>
              <p>{device.type === 'xiaozhi' ? '开源小智' : '其他设备'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">设备状态</p>
              <p className={getStatusColor(device.status)}>
                {getStatusText(device.status)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">IP地址</p>
              <p>{device.ipAddress || '未知'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">MAC地址</p>
              <p>{device.macAddress || '未知'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">创建时间</p>
              <p>{device.createdAt.toLocaleString()}</p>
            </div>
          </div>

          {device.description && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">设备描述</p>
              <p>{device.description}</p>
            </div>
          )}

          {device.metadata && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">设备元数据</p>
              <pre className="bg-gray-100 p-2 rounded font-mono text-sm overflow-auto">
                {JSON.stringify(device.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* 设备消息历史 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">消息历史</h2>
        {messagesLoading ? (
          <Skeleton height={400} />
        ) : messages.length === 0 ? (
          <EmptyState
            title="暂无消息"
            description="该设备还没有消息记录"
          />
        ) : (
          <DataTable
            columns={[
              {
                key: 'createdAt',
                title: '时间',
                render: (_, row: DeviceMessage) => row.createdAt.toLocaleString()
              },
              {
                key: 'type',
                title: '类型',
                render: (_, row: DeviceMessage) => {
                  switch (row.type) {
                    case DeviceMessageType.STATUS: return '状态';
                    case DeviceMessageType.COMMAND: return '命令';
                    case DeviceMessageType.EVENT: return '事件';
                    default: return row.type;
                  }
                }
              },
              {
                key: 'direction',
                title: '方向',
                render: (_, row: DeviceMessage) => {
                  return row.direction === 'from_device' ? '来自设备' : '发送到设备';
                }
              },
              {
                key: 'payload',
                title: '内容',
                render: (_, row: DeviceMessage) => JSON.stringify(row.payload)
              },
              {
                key: 'processed',
                title: '状态',
                render: (_, row: DeviceMessage) => {
                  return row.processed ? '已处理' : '未处理';
                }
              }
            ]}
            dataSource={messages}
          />
        )}
      </div>

      {/* 控制设备模态框 */}
      <Modal
        isOpen={controlModalOpen}
        onClose={() => setControlModalOpen(false)}
        title="控制设备"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">选择命令</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedCommand}
              onChange={(e) => setSelectedCommand(e.target.value)}
            >
              <option value="">请选择命令</option>
              {commandOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">命令参数 (JSON格式)</label>
            <Input
              type="textarea"
              rows={4}
              placeholder='{"volume": 50}'
              value={customParams}
              onChange={(e) => setCustomParams(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setControlModalOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleCommandExecute}
              disabled={!selectedCommand}
            >
              执行命令
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeviceDetailPage;