import { Injectable, Logger, Optional } from '@nestjs/common';
import { Socket } from 'socket.io';
import { PrometheusService } from '../../common/metrics/prometheus.service';
import { RedisService } from '../../common/redis/redis.service';
import { WsGroupAuthorizationService } from './ws-group-authorization.service';
import { normalizeIdentifier } from '../utils/ws-payload-validator.util';

export interface WsJoinGroupCommand {
  client: Socket;
  userId: string;
  groupId: string;
}

export interface WsLeaveGroupCommand {
  client: Socket;
  userId: string;
  groupId: string;
}

@Injectable()
export class WsGroupSessionCommandService {
  private readonly logger = new Logger(WsGroupSessionCommandService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly wsGroupAuthorizationService: WsGroupAuthorizationService,
    @Optional() private readonly prometheusService?: PrometheusService,
  ) {}

  async joinGroup(command: WsJoinGroupCommand): Promise<Record<string, unknown>> {
    const { client, userId, groupId } = command;
    const normalizedUserId = normalizeIdentifier(userId);
    const normalizedGroupId = normalizeIdentifier(groupId);

    if (!normalizedUserId) {
      this.recordValidationFailure('group_session', 'invalid_authenticated_user');
      return { success: false, error: 'Invalid authenticated user' };
    }
    if (!normalizedGroupId) {
      this.recordValidationFailure('group_session', 'invalid_group_id');
      return { success: false, error: 'GroupId is required' };
    }

    const isMember = await this.wsGroupAuthorizationService.isUserGroupMember(normalizedUserId, normalizedGroupId);
    if (!isMember) {
      this.recordValidationFailure('group_session', 'group_not_member');
      return { success: false, error: 'You are not a member of this group' };
    }

    await client.join(`group:${normalizedGroupId}`);
    await this.redisService.joinRoom(normalizedGroupId, normalizedUserId);

    this.logger.log(`User ${normalizedUserId} joined group ${normalizedGroupId}`);
    return { success: true };
  }

  async leaveGroup(command: WsLeaveGroupCommand): Promise<Record<string, unknown>> {
    const { client, userId, groupId } = command;
    const normalizedUserId = normalizeIdentifier(userId);
    const normalizedGroupId = normalizeIdentifier(groupId);

    if (!normalizedUserId) {
      this.recordValidationFailure('group_session', 'invalid_authenticated_user');
      return { success: false, error: 'Invalid authenticated user' };
    }
    if (!normalizedGroupId) {
      this.recordValidationFailure('group_session', 'invalid_group_id');
      return { success: false, error: 'GroupId is required' };
    }

    await client.leave(`group:${normalizedGroupId}`);
    await this.redisService.leaveRoom(normalizedGroupId, normalizedUserId);

    this.logger.log(`User ${normalizedUserId} left group ${normalizedGroupId}`);
    return { success: true };
  }

  private recordValidationFailure(domain: string, errorCode: string): void {
    this.prometheusService?.incrementWsValidationFailure('command', domain, errorCode);
  }
}
