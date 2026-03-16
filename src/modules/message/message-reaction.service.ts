import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageReaction } from './message-reaction.entity';
import { MessageService } from './message.service';

export interface MessageReactionSummaryItem {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface MessageReactionSummaryResult {
  messageId: string;
  totalReactions: number;
  items: MessageReactionSummaryItem[];
}

@Injectable()
export class MessageReactionService {
  constructor(
    @InjectRepository(MessageReaction)
    private readonly reactionRepository: Repository<MessageReaction>,
    private readonly messageService: MessageService,
  ) {}

  async setReaction(
    messageId: string,
    userId: string,
    emoji: string,
    active: boolean = true,
  ): Promise<MessageReactionSummaryResult> {
    const normalizedEmoji = this.normalizeEmoji(emoji);
    await this.ensureReactionAccess(messageId, userId);

    const existingReaction = await this.reactionRepository.findOne({
      where: {
        messageId,
        userId,
        emoji: normalizedEmoji,
      },
      select: ['id'],
    });

    if (active) {
      if (!existingReaction) {
        const reaction = this.reactionRepository.create({
          messageId,
          userId,
          emoji: normalizedEmoji,
        }) || {
          messageId,
          userId,
          emoji: normalizedEmoji,
        };
        await this.reactionRepository.save(reaction);
      }
    } else if (existingReaction) {
      await this.reactionRepository.delete({
        messageId,
        userId,
        emoji: normalizedEmoji,
      });
    }

    return this.getReactionSummary(messageId, userId);
  }

  async getReactionSummary(
    messageId: string,
    userId: string,
  ): Promise<MessageReactionSummaryResult> {
    await this.ensureReactionAccess(messageId, userId);

    const reactions = await this.reactionRepository.find({
      where: {
        messageId,
        isDeleted: false,
      },
      select: ['emoji', 'userId'],
      order: {
        createdAt: 'DESC',
      },
    });

    const grouped = new Map<string, { count: number; reacted: boolean }>();
    reactions.forEach((reaction) => {
      const current = grouped.get(reaction.emoji) || {
        count: 0,
        reacted: false,
      };
      current.count += 1;
      if (reaction.userId === userId) {
        current.reacted = true;
      }
      grouped.set(reaction.emoji, current);
    });

    const items = [...grouped.entries()]
      .map(([reactionEmoji, value]) => ({
        emoji: reactionEmoji,
        count: value.count,
        reacted: value.reacted,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }
        return left.emoji.localeCompare(right.emoji);
      });

    return {
      messageId,
      totalReactions: reactions.length,
      items,
    };
  }

  private async ensureReactionAccess(messageId: string, userId: string): Promise<void> {
    const message = await this.messageService.getMessageById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const canAccess = await this.messageService.canUserAccessMessage(userId, messageId);
    if (!canAccess) {
      throw new ForbiddenException('Cannot access message reactions');
    }
  }

  private normalizeEmoji(value: string): string {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized || normalized.length > 32) {
      throw new BadRequestException('emoji is required');
    }
    return normalized;
  }
}
