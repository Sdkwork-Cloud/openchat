/**
 * 设备实体类型定义
 */

/**
 * 设备类型
 */
export enum DeviceType {
  XIAOZHI = 'xiaozhi',  // 开源小智设备
  OTHER = 'other',      // 其他IoT设备
}

/**
 * 设备状态
 */
export enum DeviceStatus {
  ONLINE = 'online',     // 在线
  OFFLINE = 'offline',   // 离线
  UNKNOWN = 'unknown',   // 未知
}

/**
 * 设备消息类型
 */
export enum DeviceMessageType {
  COMMAND = 'command',  // 命令消息
  STATUS = 'status',    // 状态消息
  EVENT = 'event',      // 事件消息
  ERROR = 'error',      // 错误消息
}

/**
 * 设备消息方向
 */
export enum DeviceMessageDirection {
  TO_DEVICE = 'to_device',    // 发送到设备
  FROM_DEVICE = 'from_device', // 来自设备
}

/**
 * 设备信息接口
 */
export interface Device {
  id: string;              // 设备唯一标识
  deviceId: string;        // 设备ID
  type: DeviceType;         // 设备类型
  name: string;            // 设备名称
  description?: string;     // 设备描述
  status: DeviceStatus;     // 设备状态
  ipAddress?: string;       // 设备IP地址
  macAddress?: string;      // 设备MAC地址
  metadata?: any;           // 设备元数据
  userId?: string;          // 关联的用户ID
  createdAt: Date;          // 创建时间
  updatedAt: Date;          // 更新时间
}

/**
 * 设备消息接口
 */
export interface DeviceMessage {
  id: string;                  // 消息唯一标识
  deviceId: string;             // 设备ID
  type: DeviceMessageType;       // 消息类型
  direction: DeviceMessageDirection; // 消息方向
  payload: any;                 // 消息内容
  topic?: string;               // 消息主题
  processed: boolean;           // 消息是否已处理
  error?: string;               // 处理错误信息
  createdAt: Date;              // 创建时间
}

/**
 * 设备控制命令接口
 */
export interface DeviceCommand {
  action: string;              // 命令动作
  params?: any;                 // 命令参数
}

/**
 * 设备筛选器接口
 */
export interface DeviceFilter {
  type?: DeviceType;             // 按设备类型筛选
  status?: DeviceStatus;         // 按设备状态筛选
  keyword?: string;              // 关键词搜索
}
