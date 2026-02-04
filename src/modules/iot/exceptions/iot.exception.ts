/**
 * IoT模块异常类
 * 用于统一处理IoT相关的错误
 */

import { HttpException, HttpStatus } from '@nestjs/common';

export enum IoTErrorCode {
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  DEVICE_ALREADY_EXISTS = 'DEVICE_ALREADY_EXISTS',
  INVALID_DEVICE_ID = 'INVALID_DEVICE_ID',
  INVALID_DEVICE_TYPE = 'INVALID_DEVICE_TYPE',
  INVALID_DEVICE_STATUS = 'INVALID_DEVICE_STATUS',
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED',
  DEVICE_CONTROL_FAILED = 'DEVICE_CONTROL_FAILED',
  DEVICE_CONNECTION_FAILED = 'DEVICE_CONNECTION_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class IoTException extends HttpException {
  constructor(
    public readonly errorCode: IoTErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        errorCode,
        message,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }

  /**
   * 设备不存在异常
   */
  static deviceNotFound(deviceId: string): IoTException {
    return new IoTException(
      IoTErrorCode.DEVICE_NOT_FOUND,
      `Device with ID ${deviceId} not found`,
      HttpStatus.NOT_FOUND,
    );
  }

  /**
   * 设备已存在异常
   */
  static deviceAlreadyExists(deviceId: string): IoTException {
    return new IoTException(
      IoTErrorCode.DEVICE_ALREADY_EXISTS,
      `Device with ID ${deviceId} already exists`,
      HttpStatus.CONFLICT,
    );
  }

  /**
   * 无效的设备ID异常
   */
  static invalidDeviceId(deviceId: string): IoTException {
    return new IoTException(
      IoTErrorCode.INVALID_DEVICE_ID,
      `Invalid device ID: ${deviceId}`,
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * 消息发送失败异常
   */
  static messageSendFailed(deviceId: string, reason: string): IoTException {
    return new IoTException(
      IoTErrorCode.MESSAGE_SEND_FAILED,
      `Failed to send message to device ${deviceId}: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * 设备控制失败异常
   */
  static deviceControlFailed(deviceId: string, reason: string): IoTException {
    return new IoTException(
      IoTErrorCode.DEVICE_CONTROL_FAILED,
      `Failed to control device ${deviceId}: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * 设备连接失败异常
   */
  static deviceConnectionFailed(deviceId: string, reason: string): IoTException {
    return new IoTException(
      IoTErrorCode.DEVICE_CONNECTION_FAILED,
      `Failed to connect to device ${deviceId}: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * 未授权访问异常
   */
  static unauthorizedAccess(): IoTException {
    return new IoTException(
      IoTErrorCode.UNAUTHORIZED_ACCESS,
      'Unauthorized access to IoT resources',
      HttpStatus.UNAUTHORIZED,
    );
  }

  /**
   * 内部错误异常
   */
  static internalError(message: string): IoTException {
    return new IoTException(
      IoTErrorCode.INTERNAL_ERROR,
      `Internal IoT error: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
