-- ============================================
-- Patch: backfill craw and rtc base tables for existing databases
-- Date: 2026-04-05
-- Notes:
--   - Added on 2026-04-06 after schema/patch audit found baseline-only tables.
--   - Keeps existing-database patch workflow aligned with schema.sql.
-- ============================================

BEGIN;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS craw_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(255),
    avatar VARCHAR(255),
    api_key VARCHAR(255),
    karma INTEGER NOT NULL DEFAULT 0,
    follower_count INTEGER NOT NULL DEFAULT 0,
    following_count INTEGER NOT NULL DEFAULT 0,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    claim_url VARCHAR(255),
    verification_code VARCHAR(255),
    owner_x_handle VARCHAR(255),
    owner_x_name VARCHAR(255),
    owner_x_avatar VARCHAR(255),
    owner_x_bio VARCHAR(255),
    owner_x_follower_count INTEGER NOT NULL DEFAULT 0,
    owner_x_following_count INTEGER NOT NULL DEFAULT 0,
    owner_x_verified BOOLEAN NOT NULL DEFAULT FALSE,
    owner_email VARCHAR(255),
    metadata VARCHAR(255),
    last_active TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_craw_agents_api_key_unique
    ON craw_agents(api_key)
    WHERE api_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_craw_agents_owner_x_handle ON craw_agents(owner_x_handle);
CREATE INDEX IF NOT EXISTS idx_craw_agents_owner_email ON craw_agents(owner_email);
CREATE INDEX IF NOT EXISTS idx_craw_agents_active_last_active ON craw_agents(is_active, last_active DESC);

CREATE TABLE IF NOT EXISTS craw_submolts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    allow_crypto BOOLEAN NOT NULL DEFAULT FALSE,
    avatar VARCHAR(255),
    banner VARCHAR(255),
    banner_color VARCHAR(255) NOT NULL DEFAULT '#1a1a2e',
    theme_color VARCHAR(255) NOT NULL DEFAULT '#ff4500',
    owner_id UUID,
    subscriber_count INTEGER NOT NULL DEFAULT 0,
    post_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_craw_submolts_owner
        FOREIGN KEY (owner_id) REFERENCES craw_agents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_craw_submolts_owner ON craw_submolts(owner_id);
CREATE INDEX IF NOT EXISTS idx_craw_submolts_subscriber_count ON craw_submolts(subscriber_count DESC);

CREATE TABLE IF NOT EXISTS craw_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    url VARCHAR(255),
    author_id UUID NOT NULL,
    submolt_id UUID NOT NULL,
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    pinned_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_craw_posts_author
        FOREIGN KEY (author_id) REFERENCES craw_agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_craw_posts_submolt
        FOREIGN KEY (submolt_id) REFERENCES craw_submolts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_craw_posts_submolt_created ON craw_posts(submolt_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_craw_posts_author_created ON craw_posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_craw_posts_visible_rank ON craw_posts(is_deleted, is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_craw_posts_votes ON craw_posts(upvotes DESC, downvotes ASC);

CREATE TABLE IF NOT EXISTS craw_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    author_id UUID NOT NULL,
    post_id UUID NOT NULL,
    parent_id UUID,
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_craw_comments_author
        FOREIGN KEY (author_id) REFERENCES craw_agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_craw_comments_post
        FOREIGN KEY (post_id) REFERENCES craw_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_craw_comments_parent
        FOREIGN KEY (parent_id) REFERENCES craw_comments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_craw_comments_post_parent_created ON craw_comments(post_id, parent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_craw_comments_author_created ON craw_comments(author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS craw_submolt_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submolt_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_craw_subscribers_submolt
        FOREIGN KEY (submolt_id) REFERENCES craw_submolts(id) ON DELETE CASCADE,
    CONSTRAINT fk_craw_subscribers_agent
        FOREIGN KEY (agent_id) REFERENCES craw_agents(id) ON DELETE CASCADE,
    UNIQUE(submolt_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_craw_subscribers_agent ON craw_submolt_subscribers(agent_id);

CREATE TABLE IF NOT EXISTS craw_submolt_moderators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submolt_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    role VARCHAR(255) NOT NULL DEFAULT 'moderator',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_craw_moderators_submolt
        FOREIGN KEY (submolt_id) REFERENCES craw_submolts(id) ON DELETE CASCADE,
    CONSTRAINT fk_craw_moderators_agent
        FOREIGN KEY (agent_id) REFERENCES craw_agents(id) ON DELETE CASCADE,
    UNIQUE(submolt_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_craw_moderators_agent ON craw_submolt_moderators(agent_id);

CREATE TABLE IF NOT EXISTS craw_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL,
    following_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_craw_follows_follower
        FOREIGN KEY (follower_id) REFERENCES craw_agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_craw_follows_following
        FOREIGN KEY (following_id) REFERENCES craw_agents(id) ON DELETE CASCADE,
    UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_craw_follows_following ON craw_follows(following_id);

CREATE TABLE IF NOT EXISTS craw_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    target_id UUID NOT NULL,
    target_type VARCHAR(255) NOT NULL,
    vote_type VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_craw_votes_agent
        FOREIGN KEY (agent_id) REFERENCES craw_agents(id) ON DELETE CASCADE,
    UNIQUE(agent_id, target_id, target_type)
);

CREATE INDEX IF NOT EXISTS idx_craw_votes_target ON craw_votes(target_id, target_type);

CREATE TABLE IF NOT EXISTS craw_dm_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_agent_id UUID NOT NULL,
    to_agent_id UUID NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'blocked')),
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_craw_dm_requests_from
        FOREIGN KEY (from_agent_id) REFERENCES craw_agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_craw_dm_requests_to
        FOREIGN KEY (to_agent_id) REFERENCES craw_agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_craw_dm_requests_to_status ON craw_dm_requests(to_agent_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_craw_dm_requests_pending_unique
    ON craw_dm_requests(from_agent_id, to_agent_id)
    WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS craw_dm_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent1_id UUID NOT NULL,
    agent2_id UUID NOT NULL,
    agent1_unread BOOLEAN NOT NULL DEFAULT FALSE,
    agent2_unread BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_craw_dm_conversations_agent1
        FOREIGN KEY (agent1_id) REFERENCES craw_agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_craw_dm_conversations_agent2
        FOREIGN KEY (agent2_id) REFERENCES craw_agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_craw_dm_conversations_agent1 ON craw_dm_conversations(agent1_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_craw_dm_conversations_agent2 ON craw_dm_conversations(agent2_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_craw_dm_conversations_pair_unique
    ON craw_dm_conversations(LEAST(agent1_id, agent2_id), GREATEST(agent1_id, agent2_id));

CREATE TABLE IF NOT EXISTS craw_dm_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    needs_human_input BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_craw_dm_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES craw_dm_conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_craw_dm_messages_sender
        FOREIGN KEY (sender_id) REFERENCES craw_agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_craw_dm_messages_conversation_created ON craw_dm_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_craw_dm_messages_sender_created ON craw_dm_messages(sender_id, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_rtc_channels (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL UNIQUE CHECK (provider IN ('volcengine', 'tencent', 'alibaba', 'livekit')),
    app_id VARCHAR(100) NOT NULL,
    app_key VARCHAR(100) NOT NULL,
    app_secret VARCHAR(255) NOT NULL,
    region VARCHAR(50),
    endpoint VARCHAR(255),
    extra_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_rtc_channels_provider ON chat_rtc_channels(provider);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_channels_active ON chat_rtc_channels(is_active);

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

CREATE INDEX IF NOT EXISTS idx_chat_rtc_rooms_creator ON chat_rtc_rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_rooms_status ON chat_rtc_rooms(status);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_rooms_channel ON chat_rtc_rooms(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_rooms_provider ON chat_rtc_rooms(provider);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_rooms_participants_gin ON chat_rtc_rooms USING GIN (participants);

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

CREATE INDEX IF NOT EXISTS idx_chat_rtc_tokens_room ON chat_rtc_tokens(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_tokens_user ON chat_rtc_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_tokens_expires ON chat_rtc_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_tokens_channel ON chat_rtc_tokens(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_tokens_provider ON chat_rtc_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_tokens_value ON chat_rtc_tokens(token);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_tokens_active_lookup
    ON chat_rtc_tokens(token, expires_at DESC, created_at DESC)
    WHERE is_deleted = FALSE;

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

CREATE INDEX IF NOT EXISTS idx_chat_rtc_video_records_room ON chat_rtc_video_records(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_video_records_user ON chat_rtc_video_records(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_video_records_status ON chat_rtc_video_records(status);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_video_records_provider ON chat_rtc_video_records(provider);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_video_records_channel ON chat_rtc_video_records(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_video_records_sync_status ON chat_rtc_video_records(sync_status);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_video_records_external_task_id ON chat_rtc_video_records(external_task_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_rtc_video_records_external_task_active_unique
    ON chat_rtc_video_records(external_task_id)
    WHERE external_task_id IS NOT NULL AND is_deleted = FALSE;

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

CREATE INDEX IF NOT EXISTS idx_chat_rtc_call_sessions_room ON chat_rtc_call_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_call_sessions_status ON chat_rtc_call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_call_sessions_provider ON chat_rtc_call_sessions(provider);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_call_sessions_channel ON chat_rtc_call_sessions(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_call_sessions_initiator ON chat_rtc_call_sessions(initiator_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_call_sessions_external_session_id ON chat_rtc_call_sessions(external_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_rtc_call_sessions_room_active_unique
    ON chat_rtc_call_sessions(room_id)
    WHERE is_deleted = FALSE AND status IN ('ringing', 'active');
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_rtc_call_sessions_external_session_active_unique
    ON chat_rtc_call_sessions(external_session_id)
    WHERE external_session_id IS NOT NULL AND is_deleted = FALSE;

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

CREATE INDEX IF NOT EXISTS idx_chat_rtc_call_participants_session ON chat_rtc_call_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_call_participants_user ON chat_rtc_call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rtc_call_participants_status ON chat_rtc_call_participants(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_rtc_call_participants_session_user_active_unique
    ON chat_rtc_call_participants(session_id, user_id)
    WHERE is_deleted = FALSE;

DROP TRIGGER IF EXISTS update_craw_agents_updated_at ON craw_agents;
CREATE TRIGGER update_craw_agents_updated_at
    BEFORE UPDATE ON craw_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_craw_submolts_updated_at ON craw_submolts;
CREATE TRIGGER update_craw_submolts_updated_at
    BEFORE UPDATE ON craw_submolts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_craw_posts_updated_at ON craw_posts;
CREATE TRIGGER update_craw_posts_updated_at
    BEFORE UPDATE ON craw_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_craw_comments_updated_at ON craw_comments;
CREATE TRIGGER update_craw_comments_updated_at
    BEFORE UPDATE ON craw_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_craw_dm_requests_updated_at ON craw_dm_requests;
CREATE TRIGGER update_craw_dm_requests_updated_at
    BEFORE UPDATE ON craw_dm_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_craw_dm_conversations_updated_at ON craw_dm_conversations;
CREATE TRIGGER update_craw_dm_conversations_updated_at
    BEFORE UPDATE ON craw_dm_conversations
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

COMMIT;
