import { Logger } from '@nestjs/common';
import { WukongIMChannelType } from './wukongim.constants';

export interface WukongIMMessagePayload {
  channel_id: string;
  channel_type: number;
  from_uid: string;
  payload: string;
  client_msg_no?: string;
}

export interface WukongIMMessageContent {
  type: string;
  content: any;
}

export class WukongIMUtils {
  private static readonly logger = new Logger(WukongIMUtils.name);

  static generatePersonalChannelId(userId1: string, userId2: string): string {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }

  static generateGroupChannelId(groupId: string): string {
    return groupId;
  }

  static encodePayload(content: any): string {
    try {
      return Buffer.from(JSON.stringify(content)).toString('base64');
    } catch (error) {
      this.logger.error('Failed to encode payload:', error);
      return '';
    }
  }

  static decodePayload(payload: string): any {
    try {
      return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch (error) {
      this.logger.error('Failed to decode payload:', error);
      return null;
    }
  }

  static createMessagePayload(
    channelId: string,
    channelType: WukongIMChannelType,
    fromUid: string,
    content: WukongIMMessageContent,
    clientMsgNo?: string,
  ): WukongIMMessagePayload {
    return {
      channel_id: channelId,
      channel_type: channelType,
      from_uid: fromUid,
      payload: this.encodePayload(content),
      client_msg_no: clientMsgNo || `${fromUid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  static generateClientMsgNo(fromUid: string): string {
    return `${fromUid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static parseChannelId(channelId: string): { type: 'personal' | 'group'; ids: string[] } {
    if (channelId.includes('_')) {
      const ids = channelId.split('_');
      return { type: 'personal', ids };
    }
    return { type: 'group', ids: [channelId] };
  }

  static formatErrorResponse(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'Unknown error';
  }
}
