import { AuditLogEntity } from "../entities/audit-log.entity";
import {
  Agent,
  AgentExecution,
  AgentMessage,
  AgentSession,
  AgentSkill,
  AgentTool,
} from "../../modules/agent/agent.entity";
import {
  AgentMemory,
  KnowledgeChunk,
  KnowledgeDocument,
  MemorySummary,
  MemoryVector,
} from "../../modules/agent/memory/memory.entity";
import {
  AIBotEntity,
  BotMessageEntity,
} from "../../modules/ai-bot/ai-bot.entity";
import { BotCommandEntity } from "../../modules/bot-platform/entities/bot-command.entity";
import { BotEntity } from "../../modules/bot-platform/entities/bot.entity";
import { CrawAgent } from "../../modules/craw/entities/craw-agent.entity";
import {
  CrawDmConversation,
  CrawDmMessage,
  CrawDmRequest,
} from "../../modules/craw/entities/craw-dm.entity";
import {
  CrawComment,
  CrawPost,
} from "../../modules/craw/entities/craw-post.entity";
import {
  CrawFollow,
  CrawSubmolt,
  CrawSubmoltModerator,
  CrawSubmoltSubscriber,
  CrawVote,
} from "../../modules/craw/entities/craw-submolt.entity";
import { ContactEntity } from "../../modules/contact/contact.entity";
import { ConversationEntity } from "../../modules/conversation/conversation.entity";
import { ConversationReadCursorEntity } from "../../modules/conversation/conversation-read-cursor.entity";
import { Friend } from "../../modules/friend/friend.entity";
import { FriendRequest } from "../../modules/friend/friend-request.entity";
import { Group } from "../../modules/group/group.entity";
import { GroupInvitation } from "../../modules/group/group-invitation.entity";
import { GroupMember } from "../../modules/group/group-member.entity";
import { DeviceEntity } from "../../modules/iot/entities/device.entity";
import { DeviceMessageEntity } from "../../modules/iot/entities/device-message.entity";
import { Message } from "../../modules/message/message.entity";
import { MessageReaction } from "../../modules/message/message-reaction.entity";
import { MessageReceipt } from "../../modules/message/message-receipt.entity";
import { RTCCallParticipant } from "../../modules/rtc/rtc-call-participant.entity";
import { RTCCallSession } from "../../modules/rtc/rtc-call-session.entity";
import { RTCChannelEntity } from "../../modules/rtc/rtc-channel.entity";
import { RTCRoom } from "../../modules/rtc/rtc-room.entity";
import { RTCToken } from "../../modules/rtc/rtc-token.entity";
import { RTCVideoRecord } from "../../modules/rtc/rtc-video-record.entity";
import { ThirdPartyContact } from "../../modules/third-party/third-party-contact.entity";
import { ThirdPartyMessage } from "../../modules/third-party/third-party-message.entity";
import { TimelineFeedItemEntity } from "../../modules/timeline/entities/timeline-feed-item.entity";
import { TimelinePostLikeEntity } from "../../modules/timeline/entities/timeline-post-like.entity";
import { TimelinePostEntity } from "../../modules/timeline/entities/timeline-post.entity";
import { UserEntity } from "../../modules/user/entities/user.entity";

export const TYPEORM_ENTITIES = [
  UserEntity,
  Friend,
  FriendRequest,
  Message,
  MessageReceipt,
  MessageReaction,
  Group,
  GroupMember,
  GroupInvitation,
  RTCRoom,
  RTCToken,
  RTCChannelEntity,
  RTCVideoRecord,
  RTCCallSession,
  RTCCallParticipant,
  ThirdPartyMessage,
  ThirdPartyContact,
  AIBotEntity,
  BotMessageEntity,
  ConversationEntity,
  ConversationReadCursorEntity,
  ContactEntity,
  BotEntity,
  BotCommandEntity,
  DeviceEntity,
  DeviceMessageEntity,
  Agent,
  AgentSession,
  AgentMessage,
  AgentTool,
  AgentSkill,
  AgentExecution,
  AgentMemory,
  MemorySummary,
  KnowledgeChunk,
  KnowledgeDocument,
  MemoryVector,
  CrawAgent,
  CrawPost,
  CrawComment,
  CrawSubmolt,
  CrawSubmoltSubscriber,
  CrawSubmoltModerator,
  CrawFollow,
  CrawVote,
  CrawDmRequest,
  CrawDmConversation,
  CrawDmMessage,
  AuditLogEntity,
  TimelinePostEntity,
  TimelineFeedItemEntity,
  TimelinePostLikeEntity,
] as const;
