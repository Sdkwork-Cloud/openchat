import { Injectable, Logger, Optional } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrometheusService } from '../../common/metrics/prometheus.service';
import { normalizeIdentifier } from '../utils/ws-payload-validator.util';
import { WsGroupAuthorizationService } from './ws-group-authorization.service';
import { WsMessageEventEmitterService } from './ws-message-event-emitter.service';

export interface WsTypingIndicatorCommand {
  server: Server;
  client: Socket;
  authenticatedUserId: string;
  target: {
    toUserId?: string;
    groupId?: string;
  };
  isTyping: boolean;
}

@Injectable()
export class WsTypingIndicatorService {
  private readonly logger = new Logger(WsTypingIndicatorService.name);

  constructor(
    private readonly wsGroupAuthorizationService: WsGroupAuthorizationService,
    private readonly wsMessageEventEmitter: WsMessageEventEmitterService,
    @Optional() private readonly prometheusService?: PrometheusService,
  ) {}

  async dispatchTyping(command: WsTypingIndicatorCommand): Promise<Record<string, unknown>> {
    const authenticatedUserId = normalizeIdentifier(command.authenticatedUserId);
    const toUserId = normalizeIdentifier(command.target.toUserId);
    const groupId = normalizeIdentifier(command.target.groupId);

    if (!authenticatedUserId) {
      this.recordValidationFailure('invalid_authenticated_user');
      return { success: false, error: 'Invalid authenticated user' };
    }

    const targetCount = Number(!!toUserId) + Number(!!groupId);
    if (targetCount !== 1) {
      this.recordValidationFailure('invalid_target');
      return { success: false, error: 'Exactly one of toUserId or groupId is required' };
    }

    if (typeof command.isTyping !== 'boolean') {
      this.recordValidationFailure('invalid_typing_state');
      return { success: false, error: 'isTyping must be a boolean' };
    }

    if (toUserId) {
      this.wsMessageEventEmitter.emitToUser(command.server, toUserId, 'typingStatusChanged', {
        conversationType: 'single',
        fromUserId: authenticatedUserId,
        toUserId,
        isTyping: command.isTyping,
      });
      return { success: true };
    }

    const isMember = await this.wsGroupAuthorizationService.isUserGroupMember(authenticatedUserId, groupId!);
    if (!isMember) {
      this.recordValidationFailure('group_not_member');
      return { success: false, error: 'You are not a member of this group' };
    }

    this.wsMessageEventEmitter.emitToRoomExceptClient(
      command.client,
      `group:${groupId!}`,
      'typingStatusChanged',
      {
        conversationType: 'group',
        fromUserId: authenticatedUserId,
        groupId: groupId!,
        isTyping: command.isTyping,
      },
    );

    this.logger.debug(`Typing state ${command.isTyping ? 'started' : 'stopped'} for ${authenticatedUserId}`);
    return { success: true };
  }

  private recordValidationFailure(errorCode: string): void {
    this.prometheusService?.incrementWsValidationFailure('command', 'typing_indicator', errorCode);
  }
}
