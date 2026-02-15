import { DataSource } from 'typeorm';
import { UserEntity } from './modules/user/entities/user.entity';
import { Friend } from './modules/friend/friend.entity';
import { FriendRequest } from './modules/friend/friend-request.entity';
import { Message } from './modules/message/message.entity';
import { Group } from './modules/group/group.entity';
import { GroupMember } from './modules/group/group-member.entity';
import { GroupInvitation } from './modules/group/group-invitation.entity';
import { RTCRoom } from './modules/rtc/rtc-room.entity';
import { RTCToken } from './modules/rtc/rtc-token.entity';
import { RTCChannelEntity } from './modules/rtc/rtc-channel.entity';
import { RTCVideoRecord } from './modules/rtc/rtc-video-record.entity';
import { ThirdPartyMessage } from './modules/third-party/third-party-message.entity';
import { ThirdPartyContact } from './modules/third-party/third-party-contact.entity';
import { AIBotEntity, BotMessageEntity } from './modules/ai-bot/ai-bot.entity';

require('dotenv').config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'openchat',
  password: process.env.DB_PASSWORD || 'openchat_password',
  database: process.env.DB_NAME || 'openchat',
  entities: [
    UserEntity,
    Friend,
    FriendRequest,
    Message,
    Group,
    GroupMember,
    GroupInvitation,
    RTCRoom,
    RTCToken,
    RTCChannelEntity,
    RTCVideoRecord,
    ThirdPartyMessage,
    ThirdPartyContact,
    AIBotEntity,
    BotMessageEntity,
  ],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: [],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
});
