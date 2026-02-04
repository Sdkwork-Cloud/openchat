/**
 * 小智协议类型定义
 */

import * as WebSocket from 'ws';
import * as mqtt from 'mqtt';
import * as dgram from 'dgram';

/**
 * 通信传输类型
 */
export enum TransportType {
  WEBSOCKET = 'websocket',
  MQTT = 'mqtt',
  UDP = 'udp',
}

/**
 * 小智协议版本
 */
export enum XiaoZhiProtocolVersion {
  V1 = 1,
  V2 = 2,
  V3 = 3,
}

/**
 * 二进制协议版本
 */
export enum BinaryProtocolVersion {
  V1 = 1,
  V2 = 2,
  V3 = 3,
}

/**
 * 设备状态
 */
export enum DeviceState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  LISTENING = 'listening',
  SPEAKING = 'speaking',
}

/**
 * 连接状态
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  MQTT_CONNECTING = 'mqtt_connecting',
  MQTT_CONNECTED = 'mqtt_connected',
  REQUESTING_CHANNEL = 'requesting_channel',
  CHANNEL_OPENED = 'channel_opened',
  UDP_CONNECTED = 'udp_connected',
  AUDIO_STREAMING = 'audio_streaming',
}

/**
 * 二进制协议V2结构
 */
export interface BinaryProtocol2 {
  version: number;
  type: number;
  reserved: number;
  timestamp: number;
  payload_size: number;
  payload: Buffer;
}

/**
 * 二进制协议V3结构
 */
export interface BinaryProtocol3 {
  type: number;
  reserved: number;
  payload_size: number;
  payload: Buffer;
}

/**
 * 设备连接信息
 */
export interface DeviceConnection {
  // WebSocket连接
  websocket?: WebSocket;
  // MQTT连接
  mqttClient?: any;
  // UDP连接
  udpSocket?: dgram.Socket;
  // 传输类型
  transport: TransportType;
  // 协议版本
  protocolVersion: XiaoZhiProtocolVersion;
  // 二进制协议版本
  binaryProtocolVersion: BinaryProtocolVersion;
  // 会话ID
  sessionId: string;
  // 设备状态
  deviceState: DeviceState;
  // 连接状态
  connectionState: ConnectionState;
  // 最后活动时间
  lastActivity: number;
  // 音频参数
  audioParams: {
    format: string;
    sample_rate: number;
    channels: number;
    frame_duration: number;
  };
  // UDP加密信息
  udpInfo?: {
    server: string;
    port: number;
    key: string;
    nonce: string;
  };
  // MQTT主题
  mqttTopics?: {
    publish: string;
    subscribe: string;
  };
  // 设备类型
  deviceType?: string;
  // 固件版本
  firmwareVersion?: string;
  // 硬件版本
  hardwareVersion?: string;
  // 设备名称
  deviceName?: string;
}
