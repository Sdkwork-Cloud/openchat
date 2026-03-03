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
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) UNIQUE,
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
CREATE INDEX idx_chat_users_email ON chat_users(email);
CREATE INDEX idx_chat_users_phone ON chat_users(phone);
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
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id)
);

CREATE INDEX idx_chat_friends_user_id ON chat_friends(user_id);
CREATE INDEX idx_chat_friends_friend_id ON chat_friends(friend_id);
CREATE INDEX idx_chat_friends_status ON chat_friends(status);
CREATE INDEX IF NOT EXISTS idx_chat_friends_user_friend_active
    ON chat_friends(user_id, friend_id)
    WHERE status = 'accepted' AND is_deleted = FALSE;

-- 好友请求表
CREATE TABLE IF NOT EXISTS chat_friend_requests (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    from_user_id VARCHAR(36) NOT NULL,
    to_user_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    message TEXT,
    expires_at TIMESTAMP,
    responded_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
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
    max_members INTEGER NOT NULL DEFAULT 500,
    announcement TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'banned')),
    join_type VARCHAR(20) NOT NULL DEFAULT 'approval' CHECK (join_type IN ('free', 'approval', 'forbidden')),
    mute_all BOOLEAN NOT NULL DEFAULT FALSE,
    resources JSONB,
    dismissed_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_groups_owner ON chat_groups(owner_id);
CREATE INDEX idx_chat_groups_status ON chat_groups(status);

-- 群组成员表
CREATE TABLE IF NOT EXISTS chat_group_members (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    group_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    status VARCHAR(20) NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'pending', 'kicked', 'quit')),
    mute_until TIMESTAMP,
    last_read_seq BIGINT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
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
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    message TEXT,
    expires_at TIMESTAMP,
    responded_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
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
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
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
    draft TEXT,
    draft_updated_at TIMESTAMP,
    last_read_seq BIGINT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
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
    type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'video', 'file', 'location', 'card', 'custom', 'system', 'music', 'document', 'code', 'ppt', 'character', 'model_3d')),
    content JSONB NOT NULL,
    from_user_id VARCHAR(36) NOT NULL,
    to_user_id VARCHAR(36),
    group_id VARCHAR(36),
    reply_to_id VARCHAR(36),
    forward_from_id VARCHAR(36),
    seq BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed', 'recalled')),
    client_seq BIGINT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    extra JSONB,
    need_read_receipt BOOLEAN NOT NULL DEFAULT TRUE,
    recalled_at TIMESTAMP,
    edited_at TIMESTAMP,
    search_vector tsvector,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
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
CREATE INDEX idx_chat_messages_from_client_seq ON chat_messages(from_user_id, client_seq);
CREATE INDEX idx_messages_search_vector ON chat_messages USING GIN (search_vector);

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
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
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
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
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
    provider VARCHAR(50) NOT NULL UNIQUE CHECK (provider IN ('volcengine', 'tencent', 'alibaba', 'livekit')),
    app_id VARCHAR(100) NOT NULL,
    app_key VARCHAR(100) NOT NULL,
    app_secret VARCHAR(255) NOT NULL,
    region VARCHAR(50),
    endpoint VARCHAR(255),
    extra_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
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
    participants JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    channel_id BIGINT,
    provider VARCHAR(50),
    external_room_id VARCHAR(255),
    ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ai_metadata JSONB,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_chat_rtc_rooms_provider
        CHECK (provider IS NULL OR provider IN ('volcengine', 'tencent', 'alibaba', 'livekit')),
    CONSTRAINT fk_chat_rtc_rooms_channel
        FOREIGN KEY (channel_id) REFERENCES chat_rtc_channels(id) ON DELETE SET NULL
);

CREATE INDEX idx_chat_rtc_rooms_creator ON chat_rtc_rooms(creator_id);
CREATE INDEX idx_chat_rtc_rooms_status ON chat_rtc_rooms(status);
CREATE INDEX idx_chat_rtc_rooms_channel ON chat_rtc_rooms(channel_id);
CREATE INDEX idx_chat_rtc_rooms_provider ON chat_rtc_rooms(provider);
CREATE INDEX idx_chat_rtc_rooms_participants_gin ON chat_rtc_rooms USING GIN (participants);

-- RTC Token 表
CREATE TABLE IF NOT EXISTS chat_rtc_tokens (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    room_id BIGINT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    channel_id BIGINT,
    provider VARCHAR(50),
    token TEXT NOT NULL,
    role VARCHAR(32),
    metadata JSONB,
    expires_at TIMESTAMP NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_chat_rtc_tokens_provider
        CHECK (provider IS NULL OR provider IN ('volcengine', 'tencent', 'alibaba', 'livekit')),
    CONSTRAINT fk_chat_rtc_tokens_room
        FOREIGN KEY (room_id) REFERENCES chat_rtc_rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_rtc_tokens_channel
        FOREIGN KEY (channel_id) REFERENCES chat_rtc_channels(id) ON DELETE SET NULL
);

CREATE INDEX idx_chat_rtc_tokens_room ON chat_rtc_tokens(room_id);
CREATE INDEX idx_chat_rtc_tokens_user ON chat_rtc_tokens(user_id);
CREATE INDEX idx_chat_rtc_tokens_expires ON chat_rtc_tokens(expires_at);
CREATE INDEX idx_chat_rtc_tokens_channel ON chat_rtc_tokens(channel_id);
CREATE INDEX idx_chat_rtc_tokens_provider ON chat_rtc_tokens(provider);
CREATE INDEX idx_chat_rtc_tokens_value ON chat_rtc_tokens(token);
CREATE INDEX idx_chat_rtc_tokens_active_lookup ON chat_rtc_tokens(token, expires_at DESC, created_at DESC) WHERE is_deleted = FALSE;

-- RTC 视频录制表
CREATE TABLE IF NOT EXISTS chat_rtc_video_records (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    room_id BIGINT NOT NULL,
    channel_id BIGINT,
    provider VARCHAR(50),
    external_task_id VARCHAR(128),
    user_id VARCHAR(36),
    file_name VARCHAR(255),
    file_path VARCHAR(1024),
    file_type VARCHAR(50),
    file_size BIGINT CHECK (file_size IS NULL OR file_size >= 0),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('recording', 'processing', 'completed', 'failed')),
    sync_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    last_synced_at TIMESTAMP,
    metadata JSONB,
    error_message TEXT,
    sync_error TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_chat_rtc_video_records_time CHECK (end_time IS NULL OR end_time > start_time),
    CONSTRAINT chk_chat_rtc_video_records_provider
        CHECK (provider IS NULL OR provider IN ('volcengine', 'tencent', 'alibaba', 'livekit')),
    CONSTRAINT fk_chat_rtc_video_records_room
        FOREIGN KEY (room_id) REFERENCES chat_rtc_rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_rtc_video_records_channel
        FOREIGN KEY (channel_id) REFERENCES chat_rtc_channels(id) ON DELETE SET NULL
);

CREATE INDEX idx_chat_rtc_video_records_room ON chat_rtc_video_records(room_id);
CREATE INDEX idx_chat_rtc_video_records_user ON chat_rtc_video_records(user_id);
CREATE INDEX idx_chat_rtc_video_records_status ON chat_rtc_video_records(status);
CREATE INDEX idx_chat_rtc_video_records_provider ON chat_rtc_video_records(provider);
CREATE INDEX idx_chat_rtc_video_records_channel ON chat_rtc_video_records(channel_id);
CREATE INDEX idx_chat_rtc_video_records_sync_status ON chat_rtc_video_records(sync_status);
CREATE INDEX idx_chat_rtc_video_records_external_task_id ON chat_rtc_video_records(external_task_id);
CREATE UNIQUE INDEX idx_chat_rtc_video_records_external_task_active_unique
    ON chat_rtc_video_records(external_task_id) WHERE external_task_id IS NOT NULL AND is_deleted = FALSE;

-- RTC Call Session table (CDR Session)
CREATE TABLE IF NOT EXISTS chat_rtc_call_sessions (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    room_id BIGINT NOT NULL,
    channel_id BIGINT,
    provider VARCHAR(50),
    initiator_user_id VARCHAR(36) NOT NULL,
    external_session_id VARCHAR(128),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('ringing', 'active', 'ended', 'failed', 'cancelled', 'timeout')),
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    end_reason VARCHAR(50),
    metadata JSONB,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_chat_rtc_call_sessions_time
        CHECK (end_time IS NULL OR end_time > start_time),
    CONSTRAINT chk_chat_rtc_call_sessions_provider
        CHECK (provider IS NULL OR provider IN ('volcengine', 'tencent', 'alibaba', 'livekit')),
    CONSTRAINT fk_chat_rtc_call_sessions_room
        FOREIGN KEY (room_id) REFERENCES chat_rtc_rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_rtc_call_sessions_channel
        FOREIGN KEY (channel_id) REFERENCES chat_rtc_channels(id) ON DELETE SET NULL
);

CREATE INDEX idx_chat_rtc_call_sessions_room ON chat_rtc_call_sessions(room_id);
CREATE INDEX idx_chat_rtc_call_sessions_status ON chat_rtc_call_sessions(status);
CREATE INDEX idx_chat_rtc_call_sessions_provider ON chat_rtc_call_sessions(provider);
CREATE INDEX idx_chat_rtc_call_sessions_channel ON chat_rtc_call_sessions(channel_id);
CREATE INDEX idx_chat_rtc_call_sessions_initiator ON chat_rtc_call_sessions(initiator_user_id);
CREATE INDEX idx_chat_rtc_call_sessions_external_session_id ON chat_rtc_call_sessions(external_session_id);
CREATE UNIQUE INDEX idx_chat_rtc_call_sessions_room_active_unique
    ON chat_rtc_call_sessions(room_id)
    WHERE is_deleted = FALSE AND status IN ('ringing', 'active');
CREATE UNIQUE INDEX idx_chat_rtc_call_sessions_external_session_active_unique
    ON chat_rtc_call_sessions(external_session_id)
    WHERE external_session_id IS NOT NULL AND is_deleted = FALSE;

-- RTC Call Participant table
CREATE TABLE IF NOT EXISTS chat_rtc_call_participants (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    session_id BIGINT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'participant' CHECK (role IN ('caller', 'callee', 'participant', 'host', 'observer', 'ai')),
    status VARCHAR(20) NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'joined', 'left', 'rejected', 'kicked', 'timeout')),
    join_time TIMESTAMP,
    leave_time TIMESTAMP,
    leave_reason VARCHAR(50),
    metadata JSONB,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_chat_rtc_call_participants_time
        CHECK (leave_time IS NULL OR join_time IS NULL OR leave_time >= join_time),
    CONSTRAINT fk_chat_rtc_call_participants_session
        FOREIGN KEY (session_id) REFERENCES chat_rtc_call_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_rtc_call_participants_session ON chat_rtc_call_participants(session_id);
CREATE INDEX idx_chat_rtc_call_participants_user ON chat_rtc_call_participants(user_id);
CREATE INDEX idx_chat_rtc_call_participants_status ON chat_rtc_call_participants(status);
CREATE UNIQUE INDEX idx_chat_rtc_call_participants_session_user_active_unique
    ON chat_rtc_call_participants(session_id, user_id)
    WHERE is_deleted = FALSE;

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
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
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
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
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

CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('chinese', COALESCE(NEW.content->'text'->>'text', NEW.content->>'text', '')), 'A') ||
        setweight(to_tsvector('chinese', COALESCE(NEW.content->>'title', '')), 'B') ||
        setweight(to_tsvector('chinese', COALESCE(NEW.content->>'description', '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

DROP TRIGGER IF EXISTS trigger_update_message_search_vector ON chat_messages;
CREATE TRIGGER trigger_update_message_search_vector
    BEFORE INSERT OR UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_search_vector();

UPDATE chat_messages
SET search_vector =
    setweight(to_tsvector('chinese', COALESCE(content->'text'->>'text', content->>'text', '')), 'A') ||
    setweight(to_tsvector('chinese', COALESCE(content->>'title', '')), 'B') ||
    setweight(to_tsvector('chinese', COALESCE(content->>'description', '')), 'C')
WHERE search_vector IS NULL;

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

DROP TRIGGER IF EXISTS update_chat_rtc_call_sessions_updated_at ON chat_rtc_call_sessions;
CREATE TRIGGER update_chat_rtc_call_sessions_updated_at
    BEFORE UPDATE ON chat_rtc_call_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_rtc_call_participants_updated_at ON chat_rtc_call_participants;
CREATE TRIGGER update_chat_rtc_call_participants_updated_at
    BEFORE UPDATE ON chat_rtc_call_participants
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


-- ============================================
-- 11. Timeline (Moments Feed)
-- ============================================

CREATE TABLE IF NOT EXISTS chat_timeline_posts (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    author_id VARCHAR(36) NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'private', 'custom')),
    distribution_mode VARCHAR(20) NOT NULL DEFAULT 'push' CHECK (distribution_mode IN ('push', 'pull', 'hybrid')),
    text TEXT,
    media JSONB,
    custom_audience_ids TEXT[],
    extra JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
    like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
    comment_count INTEGER NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
    share_count INTEGER NOT NULL DEFAULT 0 CHECK (share_count >= 0),
    published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_timeline_posts_custom_audience
        CHECK (
            visibility <> 'custom'
            OR (
                custom_audience_ids IS NOT NULL
                AND array_length(custom_audience_ids, 1) > 0
            )
        ),
    CONSTRAINT chk_timeline_posts_delete_consistency
        CHECK (
            (status = 'active' AND is_deleted = FALSE AND deleted_at IS NULL)
            OR (status = 'deleted' AND is_deleted = TRUE AND deleted_at IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_timeline_posts_author_time ON chat_timeline_posts(author_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_posts_visibility_time ON chat_timeline_posts(visibility, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_posts_status_time ON chat_timeline_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_posts_distribution_time ON chat_timeline_posts(distribution_mode, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_posts_active_published ON chat_timeline_posts(published_at DESC, id DESC) WHERE status = 'active' AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_timeline_posts_custom_audience_gin ON chat_timeline_posts USING GIN (custom_audience_ids);
CREATE INDEX IF NOT EXISTS idx_timeline_posts_pull_hybrid_active_published
    ON chat_timeline_posts(published_at DESC, id DESC)
    WHERE status = 'active' AND is_deleted = FALSE AND distribution_mode IN ('pull', 'hybrid');

CREATE TABLE IF NOT EXISTS chat_timeline_feed_items (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    user_id VARCHAR(36) NOT NULL,
    post_id BIGINT NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'private', 'custom')),
    sort_score BIGINT NOT NULL CHECK (sort_score >= 0),
    published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_timeline_feed_items_delete_consistency
        CHECK (
            (status = 'active' AND is_deleted = FALSE)
            OR (status = 'removed' AND is_deleted = TRUE)
        ),
    CONSTRAINT fk_timeline_feed_items_post
        FOREIGN KEY (post_id) REFERENCES chat_timeline_posts(id) ON DELETE CASCADE,
    UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_timeline_feed_user_score ON chat_timeline_feed_items(user_id, sort_score DESC, post_id DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_feed_post ON chat_timeline_feed_items(post_id);
CREATE INDEX IF NOT EXISTS idx_timeline_feed_author_score ON chat_timeline_feed_items(author_id, sort_score DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_feed_active_user_score ON chat_timeline_feed_items(user_id, sort_score DESC, post_id DESC) WHERE status = 'active' AND is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS chat_timeline_post_likes (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    post_id BIGINT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_timeline_post_likes_cancel_consistency
        CHECK (
            (is_deleted = FALSE AND canceled_at IS NULL)
            OR (is_deleted = TRUE AND canceled_at IS NOT NULL)
        ),
    CONSTRAINT fk_timeline_post_likes_post
        FOREIGN KEY (post_id) REFERENCES chat_timeline_posts(id) ON DELETE CASCADE,
    UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_timeline_likes_user_time ON chat_timeline_post_likes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_likes_post ON chat_timeline_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_timeline_likes_post_active ON chat_timeline_post_likes(post_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_timeline_likes_user_post_active
    ON chat_timeline_post_likes(user_id, post_id)
    WHERE is_deleted = FALSE;

DROP TRIGGER IF EXISTS update_chat_timeline_posts_updated_at ON chat_timeline_posts;
CREATE TRIGGER update_chat_timeline_posts_updated_at
    BEFORE UPDATE ON chat_timeline_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_timeline_feed_items_updated_at ON chat_timeline_feed_items;
CREATE TRIGGER update_chat_timeline_feed_items_updated_at
    BEFORE UPDATE ON chat_timeline_feed_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_timeline_post_likes_updated_at ON chat_timeline_post_likes;
CREATE TRIGGER update_chat_timeline_post_likes_updated_at
    BEFORE UPDATE ON chat_timeline_post_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
SELECT 'Database schema created successfully!' AS status;
