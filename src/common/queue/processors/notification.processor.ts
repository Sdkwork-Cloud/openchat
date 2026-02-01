import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationJobData } from '../queue.service';

/**
 * 通知处理器
 * 处理异步通知推送任务
 */
@Processor('notification', {
  concurrency: 20, // 更高的并发处理通知
  limiter: {
    max: 500, // 每秒最多500个通知
    duration: 1000,
  },
})
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<any> {
    const { name, data, id } = job;

    this.logger.debug(`Processing notification job ${id}: ${name}`);

    switch (name) {
      case 'notify':
        return this.handleNotification(data);
      case 'push':
        return this.handlePushNotification(data);
      default:
        this.logger.warn(`Unknown job type: ${name}`);
        return { success: false, error: 'Unknown job type' };
    }
  }

  /**
   * 处理通知
   */
  private async handleNotification(data: NotificationJobData): Promise<any> {
    const startTime = Date.now();
    const { userIds, event, data: eventData } = data;

    this.logger.debug(`Sending ${event} notification to ${userIds.length} users`);

    // 批量发送通知
    const results = await this.batchSendNotifications(userIds, event, eventData);

    const duration = Date.now() - startTime;
    this.logger.debug(
      `Notification sent to ${results.success}/${userIds.length} users in ${duration}ms`,
    );

    return {
      success: true,
      total: userIds.length,
      successful: results.success,
      failed: results.failed,
      duration,
    };
  }

  /**
   * 处理推送通知（APNs/FCM）
   */
  private async handlePushNotification(data: NotificationJobData): Promise<any> {
    // 推送通知逻辑
    // 集成 APNs (iOS) 或 FCM (Android)
    return {
      success: true,
      type: 'push',
    };
  }

  /**
   * 批量发送通知
   */
  private async batchSendNotifications(
    userIds: string[],
    event: string,
    data: any,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // 分批并发处理
    const batchSize = 50;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      const promises = batch.map(async (userId) => {
        try {
          // 实际项目中调用 WebSocket Gateway 发送通知
          await this.sendNotification(userId, event, data);
          return true;
        } catch (error) {
          this.logger.error(`Failed to notify user ${userId}:`, error);
          return false;
        }
      });

      const results = await Promise.all(promises);
      success += results.filter((r) => r).length;
      failed += results.filter((r) => !r).length;
    }

    return { success, failed };
  }

  /**
   * 发送单条通知（实际项目中实现）
   */
  private async sendNotification(
    userId: string,
    event: string,
    data: any,
  ): Promise<void> {
    // 模拟通知发送
    await new Promise((resolve) => setTimeout(resolve, 1));

    // 实际项目中：
    // 1. 获取用户在线状态
    // 2. 如果在线，通过 WebSocket 发送
    // 3. 如果离线，通过推送服务发送
  }

  // ========================
  // Worker 事件处理
  // ========================

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    const result = job.returnvalue;
    this.logger.debug(
      `Notification job ${job.id} completed: ${result?.successful || 0}/${result?.total || 0} successful`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Notification job ${job.id} failed:`, error);
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error('Notification processor error:', error);
  }
}
