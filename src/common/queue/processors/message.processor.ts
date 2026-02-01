import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MessageJobData } from '../queue.service';

/**
 * 消息处理器
 * 处理异步消息发送任务
 */
@Processor('message', {
  concurrency: 10, // 并发处理数
  limiter: {
    max: 100, // 每秒最多100个任务
    duration: 1000,
  },
})
export class MessageProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageProcessor.name);

  async process(job: Job<MessageJobData>): Promise<any> {
    const { name, data, id } = job;

    this.logger.debug(`Processing message job ${id}: ${name}`);

    switch (name) {
      case 'send':
        return this.handleSendMessage(data);
      case 'broadcast':
        return this.handleBroadcast(data);
      default:
        this.logger.warn(`Unknown job type: ${name}`);
        return { success: false, error: 'Unknown job type' };
    }
  }

  /**
   * 处理单条消息发送
   */
  private async handleSendMessage(data: MessageJobData): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Sending message ${data.messageId} from ${data.fromUserId} to ${data.toUserId || data.groupId}`,
      );

      // 模拟消息发送逻辑
      // 实际项目中这里应该调用 IMProviderService
      await this.simulateMessageSend(data);

      const duration = Date.now() - startTime;
      this.logger.debug(`Message ${data.messageId} sent in ${duration}ms`);

      return {
        success: true,
        messageId: data.messageId,
        duration,
      };
    } catch (error) {
      this.logger.error(`Failed to send message ${data.messageId}:`, error);
      throw error; // 抛出错误让 BullMQ 处理重试
    }
  }

  /**
   * 处理广播消息
   */
  private async handleBroadcast(data: MessageJobData): Promise<any> {
    this.logger.debug(`Broadcasting message ${data.messageId}`);

    // 广播逻辑
    return {
      success: true,
      messageId: data.messageId,
      type: 'broadcast',
    };
  }

  /**
   * 模拟消息发送（实际项目中替换为真实逻辑）
   */
  private async simulateMessageSend(data: MessageJobData): Promise<void> {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 实际项目中这里应该：
    // 1. 调用 IMProviderService.sendMessage()
    // 2. 更新消息状态
    // 3. 推送通知给接收者
  }

  // ========================
  // Worker 事件处理
  // ========================

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Message job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Message job ${job.id} failed:`, error);
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error('Message processor error:', error);
  }
}
