-- ============================================
-- OpenChat Server Database Schema
-- 数据库: PostgreSQL
-- 版本: 1.0.0
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 用户相关表
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS chat_users (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    nickname VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    avatar JSONB,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy')),
    resources JSONB,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_users_username ON chat_users(username);
CREATE INDEX idx_chat_users_status ON chat_users(status);

-- ============================================
-- 2. 好友关系表
-- ============================================

-- 好友关系表
CREATE TABLE IF NOT EXISTS chat_friends (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    userId VARCHAR(36) NOT NULL,
    friendId VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
    acceptedAt TIMESTAMP,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, friendId)
);

CREATE INDEX idx_chat_friends_user_id ON chat_friends(userId);
CREATE INDEX idx_chat_friends_friend_id ON chat_friends(friendId);
CREATE INDEX idx_chat_friends_status ON chat_friends(status);

-- 好友请求表
CREATE TABLE IF NOT EXISTS chat_friend_requests (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    fromUserId VARCHAR(36) NOT NULL,
    toUserId VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_friend_requests_from ON chat_friend_requests(fromUserId);
CREATE INDEX idx_chat_friend_requests_to ON chat_friend_requests(toUserId);
CREATE INDEX idx_chat_friend_requests_status ON chat_friend_requests(status);

-- ============================================
-- 3. 群组相关表
-- ============================================

-- 群组表
CREATE TABLE IF NOT EXISTS chat_groups (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar JSONB,
    ownerId VARCHAR(36) NOT NULL,
    resources JSONB,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_groups_owner ON chat_groups(ownerId);

-- 群组成员表
CREATE TABLE IF NOT EXISTS chat_group_members (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    groupId VARCHAR(36) NOT NULL,
    userId VARCHAR(36) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    status VARCHAR(20) NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'pending', 'kicked')),
    joinedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(groupId, userId)
);

CREATE INDEX idx_chat_group_members_group ON chat_group_members(groupId);
CREATE INDEX idx_chat_group_members_user ON chat_group_members(userId);
CREATE INDEX idx_chat_group_members_role ON chat_group_members(role);

-- 群组邀请表
CREATE TABLE IF NOT EXISTS chat_group_invitations (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    groupId VARCHAR(36) NOT NULL,
    inviterId VARCHAR(36) NOT NULL,
    inviteeId VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_group_invitations_group ON chat_group_invitations(groupId);
CREATE INDEX idx_chat_group_invitations_invitee ON chat_group_invitations(inviteeId);

-- ============================================
-- 4. 联系人表
-- ============================================

-- 联系人表
CREATE TABLE IF NOT EXISTS chat_contacts (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    userId VARCHAR(36) NOT NULL,
    contactId VARCHAR(36) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('user', 'group')),
    source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('friend', 'group', 'manual')),
    name VARCHAR(100) NOT NULL,
    avatar JSONB,
    remark VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'deleted')),
    isFavorite BOOLEAN NOT NULL DEFAULT FALSE,
    tags TEXT[],
    extraInfo JSONB,
    lastContactTime TIMESTAMP,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, contactId, type)
);

CREATE INDEX idx_chat_contacts_user ON chat_contacts(userId);
CREATE INDEX idx_chat_contacts_contact ON chat_contacts(contactId);
CREATE INDEX idx_chat_contacts_type ON chat_contacts(type);
CREATE INDEX idx_chat_contacts_status ON chat_contacts(status);
CREATE INDEX idx_chat_contacts_favorite ON chat_contacts(isFavorite);

-- ============================================
-- 5. 会话表
-- ============================================

-- 会话表
CREATE TABLE IF NOT EXISTS chat_conversations (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('single', 'group')),
    userId VARCHAR(36) NOT NULL,
    targetId VARCHAR(36) NOT NULL,
    targetName VARCHAR(100),
    targetAvatar JSONB,
    lastMessageId VARCHAR(36),
    lastMessageContent TEXT,
    lastMessageTime TIMESTAMP,
    unreadCount INTEGER NOT NULL DEFAULT 0,
    isPinned BOOLEAN NOT NULL DEFAULT FALSE,
    isMuted BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, targetId, type)
);

CREATE INDEX idx_chat_conversations_user ON chat_conversations(userId);
CREATE INDEX idx_chat_conversations_target ON chat_conversations(targetId);
CREATE INDEX idx_chat_conversations_type ON chat_conversations(type);
CREATE INDEX idx_chat_conversations_pinned ON chat_conversations(isPinned);
CREATE INDEX idx_chat_conversations_last_msg_time ON chat_conversations(lastMessageTime);

-- ============================================
-- 6. 消息表
-- ============================================

-- 消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'video', 'file', 'card', 'custom', 'system')),
    content JSONB NOT NULL,
    fromUserId VARCHAR(36) NOT NULL,
    toUserId VARCHAR(36),
    groupId VARCHAR(36),
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
    clientSeq BIGINT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_from ON chat_messages(fromUserId);
CREATE INDEX idx_chat_messages_to ON chat_messages(toUserId);
CREATE INDEX idx_chat_messages_group ON chat_messages(groupId);
CREATE INDEX idx_chat_messages_type ON chat_messages(type);
CREATE INDEX idx_chat_messages_status ON chat_messages(status);
CREATE INDEX idx_chat_messages_created ON chat_messages(createdAt);
CREATE INDEX idx_chat_messages_client_seq ON chat_messages(clientSeq);

-- ============================================
-- 7. AI Bot 表
-- ============================================

-- AI Bot 表
CREATE TABLE IF NOT EXISTS chat_ai_bots (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_ai_bots_type ON chat_ai_bots(type);
CREATE INDEX idx_chat_ai_bots_active ON chat_ai_bots(isActive);

-- Bot 消息表
CREATE TABLE IF NOT EXISTS chat_bot_messages (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    botId VARCHAR(36) NOT NULL,
    userId VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    response TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_bot_messages_bot ON chat_bot_messages(botId);
CREATE INDEX idx_chat_bot_messages_user ON chat_bot_messages(userId);
CREATE INDEX idx_chat_bot_messages_status ON chat_bot_messages(status);

-- ============================================
-- 8. RTC 相关表
-- ============================================

-- RTC 渠道配置表
CREATE TABLE IF NOT EXISTS chat_rtc_channels (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL UNIQUE,
    appId VARCHAR(100) NOT NULL,
    appKey VARCHAR(100) NOT NULL,
    appSecret VARCHAR(255) NOT NULL,
    region VARCHAR(50),
    endpoint VARCHAR(255),
    extraConfig JSONB NOT NULL DEFAULT '{}',
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_rtc_channels_provider ON chat_rtc_channels(provider);
CREATE INDEX idx_chat_rtc_channels_active ON chat_rtc_channels(isActive);

-- RTC 房间表
CREATE TABLE IF NOT EXISTS chat_rtc_rooms (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(100),
    type VARCHAR(20) NOT NULL DEFAULT 'p2p' CHECK (type IN ('p2p', 'group')),
    creatorId VARCHAR(36) NOT NULL,
    participants TEXT NOT NULL DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    channelId VARCHAR(36),
    externalRoomId VARCHAR(255),
    startedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    endedAt TIMESTAMP,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_rtc_rooms_creator ON chat_rtc_rooms(creatorId);
CREATE INDEX idx_chat_rtc_rooms_status ON chat_rtc_rooms(status);
CREATE INDEX idx_chat_rtc_rooms_channel ON chat_rtc_rooms(channelId);

-- ============================================
-- 9. 第三方平台集成表
-- ============================================

-- 第三方平台联系人表
CREATE TABLE IF NOT EXISTS chat_third_party_contacts (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'telegram', 'wechat', 'signal')),
    userId VARCHAR(36) NOT NULL,
    platformUserId VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar JSONB,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_third_party_contacts_platform ON chat_third_party_contacts(platform);
CREATE INDEX idx_chat_third_party_contacts_user ON chat_third_party_contacts(userId);
CREATE INDEX idx_chat_third_party_contacts_platform_user ON chat_third_party_contacts(platformUserId);

-- 第三方平台消息表
CREATE TABLE IF NOT EXISTS chat_third_party_messages (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'telegram', 'wechat', 'signal')),
    fromUserId VARCHAR(36) NOT NULL,
    toUserId VARCHAR(36) NOT NULL,
    content JSONB NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'video', 'file', 'card', 'custom')),
    status VARCHAR(20) NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
    platformMessageId VARCHAR(255),
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_third_party_messages_platform ON chat_third_party_messages(platform);
CREATE INDEX idx_chat_third_party_messages_from ON chat_third_party_messages(fromUserId);
CREATE INDEX idx_chat_third_party_messages_to ON chat_third_party_messages(toUserId);
CREATE INDEX idx_chat_third_party_messages_status ON chat_third_party_messages(status);

-- ============================================
-- 10. 创建更新时间触发器
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间触发器
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'chat_users',
        'chat_friends',
        'chat_friend_requests',
        'chat_groups',
        'chat_group_members',
        'chat_group_invitations',
        'chat_contacts',
        'chat_conversations',
        'chat_messages',
        'chat_ai_bots',
        'chat_bot_messages',
        'chat_rtc_channels',
        'chat_rtc_rooms',
        'chat_third_party_contacts',
        'chat_third_party_messages'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s', tbl, tbl);
        EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl, tbl);
    END LOOP;
END $$;

-- ============================================
-- 完成
-- ============================================

SELECT 'Database schema created successfully!' AS status;
