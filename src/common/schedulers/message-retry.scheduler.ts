import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { Message } from '../../modules/message/message.entity';
import { MessageStatus } from '../../modules/message/message.interface';
import { IMProviderService } from '../../modules/im-provider/im-provider.service';
import { IMMessage } from '../../modules/im-provider/im-provider.interface';

@Injectable()
export class MessageRetryService {
  private readonly logger = new Logger(MessageRetryService.name);
  private readonly MAX_RETRY_COUNT = 5;
  private readonly RETRY_BATCH_SIZE = 100;

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private imProviderService: IMProviderService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async retryFailedMessages() {
    this.logger.debug('Starting failed message retry task...');

    try {
      const failedMessages = await this.messageRepository.find({
        where: {
          status: MessageStatus.FAILED,
        },
        order: { createdAt: 'ASC' },
        take: this.RETRY_BATCH_SIZE,
      });

      if (failedMessages.length === 0) {
        return;
      }

      this.logger.log(`Found ${failedMessages.length} failed messages to retry`);

      let successCount = 0;
      let failCount = 0;

      for (const message of failedMessages) {
        if (message.retryCount >= this.MAX_RETRY_COUNT) {
          this.logger.warn(`Message ${message.id} exceeded max retry count, marking as permanently failed`);
          message.retryCount = message.retryCount + 1;
          await this.messageRepository.save(message);
          continue;
        }

        try {
          const imMessage: Omit<IMMessage, 'id' | 'timestamp' | 'status'> = {
            type: message.type,
            content: message.content,
            from: message.fromUserId,
            to: message.toUserId || message.groupId || '',
            roomId: message.groupId,
          };

          await this.imProviderService.sendMessage(imMessage);

          message.status = MessageStatus.SENT;
          await this.messageRepository.save(message);
          successCount++;

          this.logger.log(`Message ${message.id} retry successful`);
        } catch (error: any) {
          message.retryCount = message.retryCount + 1;
          await this.messageRepository.save(message);
          failCount++;

          this.logger.error(`Message ${message.id} retry failed (attempt ${message.retryCount}): ${error.message}`);
        }
      }

      this.logger.log(`Retry task completed: ${successCount} success, ${failCount} failed`);
    } catch (error: any) {
      this.logger.error(`Failed message retry task error: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldFailedMessages() {
    this.logger.debug('Starting old failed messages cleanup...');

    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await this.messageRepository.delete({
        status: MessageStatus.FAILED,
        createdAt: LessThan(oneDayAgo),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} old failed messages`);
      }
    } catch (error: any) {
      this.logger.error(`Failed messages cleanup error: ${error.message}`);
    }
  }

  async getFailedMessagesStats(): Promise<{
    total: number;
    byRetryCount: Record<number, number>;
  }> {
    const failedMessages = await this.messageRepository.find({
      where: { status: MessageStatus.FAILED },
      select: ['id', 'createdAt', 'retryCount'],
    });

    const byRetryCount: Record<number, number> = {};

    for (const message of failedMessages) {
      byRetryCount[message.retryCount] = (byRetryCount[message.retryCount] || 0) + 1;
    }

    return {
      total: failedMessages.length,
      byRetryCount,
    };
  }
}
