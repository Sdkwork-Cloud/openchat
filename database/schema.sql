-- ============================================
-- OpenChat Server Database Schema
-- 数据库: PostgreSQL
-- 版本: 1.0.0
-- 命名规范: snake_case (下划线命名)
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
    user_id VARCHAR(36) NOT NULL,
    friend_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
    accepted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id)
);

CREATE INDEX idx_chat_friends_user_id ON chat_friends(user_id);
CREATE INDEX idx_chat_friends_friend_id ON chat_friends(friend_id);
CREATE INDEX idx_chat_friends_status ON chat_friends(status);

-- 好友请求表
CREATE TABLE IF NOT EXISTS chat_friend_requests (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    from_user_id VARCHAR(36) NOT NULL,
    to_user_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_friend_requests_from ON chat_friend_requests(from_user_id);
CREATE INDEX idx_chat_friend_requests_to ON chat_friend_requests(to_user_id);
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
    owner_id VARCHAR(36) NOT NULL,
    resources JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_groups_owner ON chat_groups(owner_id);

-- 群组成员表
CREATE TABLE IF NOT EXISTS chat_group_members (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    group_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    status VARCHAR(20) NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'pending', 'kicked')),
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_chat_group_members_group ON chat_group_members(group_id);
CREATE INDEX idx_chat_group_members_user ON chat_group_members(user_id);
CREATE INDEX idx_chat_group_members_role ON chat_group_members(role);

-- 群组邀请表
CREATE TABLE IF NOT EXISTS chat_group_invitations (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    group_id VARCHAR(36) NOT NULL,
    inviter_id VARCHAR(36) NOT NULL,
    invitee_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_group_invitations_group ON chat_group_invitations(group_id);
CREATE INDEX idx_chat_group_invitations_invitee ON chat_group_invitations(invitee_id);

-- ============================================
-- 4. 联系人表
-- ============================================

-- 联系人表
CREATE TABLE IF NOT EXISTS chat_contacts (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    user_id VARCHAR(36) NOT NULL,
    contact_id VARCHAR(36) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('user', 'group')),
    source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('friend', 'group', 'manual')),
    name VARCHAR(100) NOT NULL,
    avatar JSONB,
    remark VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'deleted')),
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    tags TEXT[],
    extra_info JSONB,
    last_contact_time TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, contact_id, type)
);

CREATE INDEX idx_chat_contacts_user ON chat_contacts(user_id);
CREATE INDEX idx_chat_contacts_contact ON chat_contacts(contact_id);
CREATE INDEX idx_chat_contacts_type ON chat_contacts(type);
CREATE INDEX idx_chat_contacts_status ON chat_contacts(status);
CREATE INDEX idx_chat_contacts_favorite ON chat_contacts(is_favorite);

-- ============================================
-- 5. 会话表
-- ============================================

-- 会话表
CREATE TABLE IF NOT EXISTS chat_conversations (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('single', 'group')),
    user_id VARCHAR(36) NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    target_name VARCHAR(100),
    target_avatar JSONB,
    last_message_id VARCHAR(36),
    last_message_content TEXT,
    last_message_time TIMESTAMP,
    unread_count INTEGER NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, target_id, type)
);

CREATE INDEX idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_target ON chat_conversations(target_id);
CREATE INDEX idx_chat_conversations_type ON chat_conversations(type);
CREATE INDEX idx_chat_conversations_pinned ON chat_conversations(is_pinned);
CREATE INDEX idx_chat_conversations_last_msg_time ON chat_conversations(last_message_time);

-- ============================================
-- 6. 消息表
-- ============================================

-- 消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'video', 'file', 'card', 'custom', 'system')),
    content JSONB NOT NULL,
    from_user_id VARCHAR(36) NOT NULL,
    to_user_id VARCHAR(36),
    group_id VARCHAR(36),
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
    client_seq BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_from ON chat_messages(from_user_id);
CREATE INDEX idx_chat_messages_to ON chat_messages(to_user_id);
CREATE INDEX idx_chat_messages_group ON chat_messages(group_id);
CREATE INDEX idx_chat_messages_type ON chat_messages(type);
CREATE INDEX idx_chat_messages_status ON chat_messages(status);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_client_seq ON chat_messages(client_seq);

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
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_ai_bots_type ON chat_ai_bots(type);
CREATE INDEX idx_chat_ai_bots_active ON chat_ai_bots(is_active);

-- Bot 消息表
CREATE TABLE IF NOT EXISTS chat_bot_messages (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    bot_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    response TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_bot_messages_bot ON chat_bot_messages(bot_id);
CREATE INDEX idx_chat_bot_messages_user ON chat_bot_messages(user_id);
CREATE INDEX idx_chat_bot_messages_status ON chat_bot_messages(status);

-- ============================================
-- 8. RTC 相关表
-- ============================================

-- RTC 渠道配置表
CREATE TABLE IF NOT EXISTS chat_rtc_channels (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL UNIQUE,
    app_id VARCHAR(100) NOT NULL,
    app_key VARCHAR(100) NOT NULL,
    app_secret VARCHAR(255) NOT NULL,
    region VARCHAR(50),
    endpoint VARCHAR(255),
    extra_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_rtc_channels_provider ON chat_rtc_channels(provider);
CREATE INDEX idx_chat_rtc_channels_active ON chat_rtc_channels(is_active);

-- RTC 房间表
CREATE TABLE IF NOT EXISTS chat_rtc_rooms (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(100),
    type VARCHAR(20) NOT NULL DEFAULT 'p2p' CHECK (type IN ('p2p', 'group')),
    creator_id VARCHAR(36) NOT NULL,
    participants TEXT NOT NULL DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    channel_id VARCHAR(36),
    external_room_id VARCHAR(255),
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_rtc_rooms_creator ON chat_rtc_rooms(creator_id);
CREATE INDEX idx_chat_rtc_rooms_status ON chat_rtc_rooms(status);
CREATE INDEX idx_chat_rtc_rooms_channel ON chat_rtc_rooms(channel_id);

-- RTC Token 表
CREATE TABLE IF NOT EXISTS chat_rtc_tokens (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_rtc_tokens_room ON chat_rtc_tokens(room_id);
CREATE INDEX idx_chat_rtc_tokens_user ON chat_rtc_tokens(user_id);
CREATE INDEX idx_chat_rtc_tokens_expires ON chat_rtc_tokens(expires_at);

-- RTC 视频录制表
CREATE TABLE IF NOT EXISTS chat_rtc_video_records (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT,
    duration INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_rtc_video_records_room ON chat_rtc_video_records(room_id);
CREATE INDEX idx_chat_rtc_video_records_user ON chat_rtc_video_records(user_id);
CREATE INDEX idx_chat_rtc_video_records_status ON chat_rtc_video_records(status);

-- ============================================
-- 9. 第三方平台集成表
-- ============================================

-- 第三方平台联系人表
CREATE TABLE IF NOT EXISTS chat_third_party_contacts (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'telegram', 'wechat', 'signal')),
    user_id VARCHAR(36) NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_third_party_contacts_platform ON chat_third_party_contacts(platform);
CREATE INDEX idx_chat_third_party_contacts_user ON chat_third_party_contacts(user_id);
CREATE INDEX idx_chat_third_party_contacts_platform_user ON chat_third_party_contacts(platform_user_id);

-- 第三方平台消息表
CREATE TABLE IF NOT EXISTS chat_third_party_messages (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'telegram', 'wechat', 'signal')),
    from_user_id VARCHAR(36) NOT NULL,
    to_user_id VARCHAR(36) NOT NULL,
    content JSONB NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'video', 'file', 'card', 'custom')),
    status VARCHAR(20) NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
    platform_message_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_third_party_messages_platform ON chat_third_party_messages(platform);
CREATE INDEX idx_chat_third_party_messages_from ON chat_third_party_messages(from_user_id);
CREATE INDEX idx_chat_third_party_messages_to ON chat_third_party_messages(to_user_id);
CREATE INDEX idx_chat_third_party_messages_status ON chat_third_party_messages(status);

-- ============================================
-- 10. 创建更新时间触发器
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间触发器
DROP TRIGGER IF EXISTS update_chat_users_updated_at ON chat_users;
CREATE TRIGGER update_chat_users_updated_at
    BEFORE UPDATE ON chat_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_friends_updated_at ON chat_friends;
CREATE TRIGGER update_chat_friends_updated_at
    BEFORE UPDATE ON chat_friends
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_friend_requests_updated_at ON chat_friend_requests;
CREATE TRIGGER update_chat_friend_requests_updated_at
    BEFORE UPDATE ON chat_friend_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_groups_updated_at ON chat_groups;
CREATE TRIGGER update_chat_groups_updated_at
    BEFORE UPDATE ON chat_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_group_members_updated_at ON chat_group_members;
CREATE TRIGGER update_chat_group_members_updated_at
    BEFORE UPDATE ON chat_group_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_group_invitations_updated_at ON chat_group_invitations;
CREATE TRIGGER update_chat_group_invitations_updated_at
    BEFORE UPDATE ON chat_group_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_contacts_updated_at ON chat_contacts;
CREATE TRIGGER update_chat_contacts_updated_at
    BEFORE UPDATE ON chat_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER update_chat_conversations_updated_at
    BEFORE UPDATE ON chat_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_ai_bots_updated_at ON chat_ai_bots;
CREATE TRIGGER update_chat_ai_bots_updated_at
    BEFORE UPDATE ON chat_ai_bots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_bot_messages_updated_at ON chat_bot_messages;
CREATE TRIGGER update_chat_bot_messages_updated_at
    BEFORE UPDATE ON chat_bot_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_rtc_channels_updated_at ON chat_rtc_channels;
CREATE TRIGGER update_chat_rtc_channels_updated_at
    BEFORE UPDATE ON chat_rtc_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_rtc_rooms_updated_at ON chat_rtc_rooms;
CREATE TRIGGER update_chat_rtc_rooms_updated_at
    BEFORE UPDATE ON chat_rtc_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_rtc_tokens_updated_at ON chat_rtc_tokens;
CREATE TRIGGER update_chat_rtc_tokens_updated_at
    BEFORE UPDATE ON chat_rtc_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_rtc_video_records_updated_at ON chat_rtc_video_records;
CREATE TRIGGER update_chat_rtc_video_records_updated_at
    BEFORE UPDATE ON chat_rtc_video_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_third_party_contacts_updated_at ON chat_third_party_contacts;
CREATE TRIGGER update_chat_third_party_contacts_updated_at
    BEFORE UPDATE ON chat_third_party_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_third_party_messages_updated_at ON chat_third_party_messages;
CREATE TRIGGER update_chat_third_party_messages_updated_at
    BEFORE UPDATE ON chat_third_party_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完成
-- ============================================

SELECT 'Database schema created successfully!' AS status;
