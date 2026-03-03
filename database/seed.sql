-- ============================================
-- OpenChat Server Database Seed Data (Idempotent)
-- ============================================

BEGIN;

SET TIME ZONE 'UTC';

-- Unified test password (bcrypt for OpenChat@123)
-- Hash: $2b$10$POhQ6iz4.bQpIdSLR/vLvOBivQQllu8g.2HBhUtjzd0p/Lyuea4kK

INSERT INTO chat_users (uuid, username, nickname, password, avatar, status, resources, last_login_at, last_login_ip)
VALUES
('10000000-0000-0000-0000-000000000001', 'admin', '系统管理员', '$2b$10$POhQ6iz4.bQpIdSLR/vLvOBivQQllu8g.2HBhUtjzd0p/Lyuea4kK', '{"url":"https://static.openchat.local/avatar/admin.png"}', 'online', '{"theme":"system"}', NOW(), '127.0.0.1'),
('10000000-0000-0000-0000-000000000002', 'alice', 'Alice', '$2b$10$POhQ6iz4.bQpIdSLR/vLvOBivQQllu8g.2HBhUtjzd0p/Lyuea4kK', '{"url":"https://static.openchat.local/avatar/alice.png"}', 'online', '{"locale":"zh-CN"}', NOW() - INTERVAL '5 minutes', '10.0.0.2'),
('10000000-0000-0000-0000-000000000003', 'bob', 'Bob', '$2b$10$POhQ6iz4.bQpIdSLR/vLvOBivQQllu8g.2HBhUtjzd0p/Lyuea4kK', '{"url":"https://static.openchat.local/avatar/bob.png"}', 'offline', '{"locale":"en-US"}', NOW() - INTERVAL '1 day', '10.0.0.3'),
('10000000-0000-0000-0000-000000000004', 'carol', 'Carol', '$2b$10$POhQ6iz4.bQpIdSLR/vLvOBivQQllu8g.2HBhUtjzd0p/Lyuea4kK', '{"url":"https://static.openchat.local/avatar/carol.png"}', 'busy', '{"locale":"zh-CN"}', NOW() - INTERVAL '2 hours', '10.0.0.4'),
('10000000-0000-0000-0000-000000000005', 'dave', 'Dave', '$2b$10$POhQ6iz4.bQpIdSLR/vLvOBivQQllu8g.2HBhUtjzd0p/Lyuea4kK', '{"url":"https://static.openchat.local/avatar/dave.png"}', 'online', '{"locale":"zh-CN"}', NOW() - INTERVAL '20 minutes', '10.0.0.5')
ON CONFLICT (username) DO UPDATE
SET
    nickname = EXCLUDED.nickname,
    password = EXCLUDED.password,
    avatar = EXCLUDED.avatar,
    status = EXCLUDED.status,
    resources = EXCLUDED.resources,
    last_login_at = EXCLUDED.last_login_at,
    last_login_ip = EXCLUDED.last_login_ip,
    is_deleted = FALSE,
    deleted_at = NULL,
    updated_at = CURRENT_TIMESTAMP;

DO $$
DECLARE
    admin_uuid VARCHAR(36);
    alice_uuid VARCHAR(36);
    bob_uuid VARCHAR(36);
    carol_uuid VARCHAR(36);
    dave_uuid VARCHAR(36);
    eng_group_uuid VARCHAR(36) := '20000000-0000-0000-0000-000000000001';
    prod_group_uuid VARCHAR(36) := '20000000-0000-0000-0000-000000000002';
    msg_a1_uuid VARCHAR(36) := '30000000-0000-0000-0000-000000000001';
    msg_a2_uuid VARCHAR(36) := '30000000-0000-0000-0000-000000000002';
    msg_a3_uuid VARCHAR(36) := '30000000-0000-0000-0000-000000000003';
    msg_a4_uuid VARCHAR(36) := '30000000-0000-0000-0000-000000000004';
    msg_g1_uuid VARCHAR(36) := '30000000-0000-0000-0000-000000000011';
    msg_g2_uuid VARCHAR(36) := '30000000-0000-0000-0000-000000000012';
    msg_g3_uuid VARCHAR(36) := '30000000-0000-0000-0000-000000000013';
    timeline_post_1_uuid VARCHAR(36) := '40000000-0000-0000-0000-000000000001';
    timeline_post_2_uuid VARCHAR(36) := '40000000-0000-0000-0000-000000000002';
    timeline_post_3_uuid VARCHAR(36) := '40000000-0000-0000-0000-000000000003';
    timeline_post_4_uuid VARCHAR(36) := '40000000-0000-0000-0000-000000000004';
    timeline_post_1_id BIGINT;
    timeline_post_2_id BIGINT;
    timeline_post_3_id BIGINT;
    timeline_post_4_id BIGINT;
BEGIN
    SELECT uuid INTO admin_uuid FROM chat_users WHERE username = 'admin';
    SELECT uuid INTO alice_uuid FROM chat_users WHERE username = 'alice';
    SELECT uuid INTO bob_uuid FROM chat_users WHERE username = 'bob';
    SELECT uuid INTO carol_uuid FROM chat_users WHERE username = 'carol';
    SELECT uuid INTO dave_uuid FROM chat_users WHERE username = 'dave';

    INSERT INTO chat_friends (uuid, user_id, friend_id, status, accepted_at)
    VALUES
    (uuid_generate_v4(), alice_uuid, bob_uuid, 'accepted', NOW()),
    (uuid_generate_v4(), bob_uuid, alice_uuid, 'accepted', NOW()),
    (uuid_generate_v4(), alice_uuid, carol_uuid, 'accepted', NOW()),
    (uuid_generate_v4(), carol_uuid, alice_uuid, 'accepted', NOW()),
    (uuid_generate_v4(), alice_uuid, dave_uuid, 'accepted', NOW()),
    (uuid_generate_v4(), dave_uuid, alice_uuid, 'accepted', NOW())
    ON CONFLICT (user_id, friend_id) DO UPDATE
    SET
        status = EXCLUDED.status,
        accepted_at = EXCLUDED.accepted_at,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO chat_groups (uuid, name, description, avatar, owner_id, resources)
    VALUES
    (eng_group_uuid, 'OpenChat Engineering', '工程研发协作群', '{"url":"https://static.openchat.local/group/engineering.png"}', alice_uuid, '{"category":"engineering"}'),
    (prod_group_uuid, 'OpenChat Product', '产品和运营协同群', '{"url":"https://static.openchat.local/group/product.png"}', bob_uuid, '{"category":"product"}')
    ON CONFLICT (uuid) DO UPDATE
    SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        avatar = EXCLUDED.avatar,
        owner_id = EXCLUDED.owner_id,
        resources = EXCLUDED.resources,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO chat_group_members (uuid, group_id, user_id, role, status)
    VALUES
    (uuid_generate_v4(), eng_group_uuid, alice_uuid, 'owner', 'joined'),
    (uuid_generate_v4(), eng_group_uuid, bob_uuid, 'admin', 'joined'),
    (uuid_generate_v4(), eng_group_uuid, carol_uuid, 'member', 'joined'),
    (uuid_generate_v4(), eng_group_uuid, dave_uuid, 'member', 'joined'),
    (uuid_generate_v4(), prod_group_uuid, bob_uuid, 'owner', 'joined'),
    (uuid_generate_v4(), prod_group_uuid, alice_uuid, 'member', 'joined'),
    (uuid_generate_v4(), prod_group_uuid, carol_uuid, 'member', 'joined')
    ON CONFLICT (group_id, user_id) DO UPDATE
    SET
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO chat_contacts (uuid, user_id, contact_id, type, source, name, avatar, remark, status, is_favorite, tags, extra_info)
    VALUES
    (uuid_generate_v4(), alice_uuid, bob_uuid, 'user', 'friend', 'Bob', '{"url":"https://static.openchat.local/avatar/bob.png"}', '项目搭档', 'active', TRUE, ARRAY['team','backend'], '{"priority":"high"}'),
    (uuid_generate_v4(), alice_uuid, carol_uuid, 'user', 'friend', 'Carol', '{"url":"https://static.openchat.local/avatar/carol.png"}', '设计同学', 'active', FALSE, ARRAY['design'], '{"priority":"medium"}'),
    (uuid_generate_v4(), alice_uuid, dave_uuid, 'user', 'friend', 'Dave', '{"url":"https://static.openchat.local/avatar/dave.png"}', '测试同学', 'active', FALSE, ARRAY['qa'], '{"priority":"medium"}'),
    (uuid_generate_v4(), alice_uuid, eng_group_uuid, 'group', 'group', 'OpenChat Engineering', '{"url":"https://static.openchat.local/group/engineering.png"}', NULL, 'active', TRUE, ARRAY['work'], '{"mute":false}'),
    (uuid_generate_v4(), bob_uuid, eng_group_uuid, 'group', 'group', 'OpenChat Engineering', '{"url":"https://static.openchat.local/group/engineering.png"}', NULL, 'active', FALSE, ARRAY['work'], '{"mute":false}')
    ON CONFLICT (user_id, contact_id, type) DO UPDATE
    SET
        source = EXCLUDED.source,
        name = EXCLUDED.name,
        avatar = EXCLUDED.avatar,
        remark = EXCLUDED.remark,
        status = EXCLUDED.status,
        is_favorite = EXCLUDED.is_favorite,
        tags = EXCLUDED.tags,
        extra_info = EXCLUDED.extra_info,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO chat_messages (uuid, type, content, from_user_id, to_user_id, group_id, status, client_seq, created_at)
    VALUES
    (msg_a1_uuid, 'text', '{"text":"早上好，Bob，今天先对齐 IM webhook 安全改造。"}', alice_uuid, bob_uuid, NULL, 'read', 1001, NOW() - INTERVAL '2 hours'),
    (msg_a2_uuid, 'text', '{"text":"收到，我先做回执链路验证。"}', bob_uuid, alice_uuid, NULL, 'read', 1002, NOW() - INTERVAL '1 hour 58 minutes'),
    (msg_a3_uuid, 'text', '{"text":"我这边把 timeline 混合分发也一起上。"}', alice_uuid, bob_uuid, NULL, 'delivered', 1003, NOW() - INTERVAL '1 hour 56 minutes'),
    (msg_a4_uuid, 'image', '{"url":"https://static.openchat.local/media/timeline-arch.png","width":1280,"height":720}', alice_uuid, bob_uuid, NULL, 'sent', 1004, NOW() - INTERVAL '1 hour 55 minutes'),
    (msg_g1_uuid, 'text', '{"text":"各位，今天发布窗口 20:00 UTC。"}', alice_uuid, NULL, eng_group_uuid, 'read', 2001, NOW() - INTERVAL '90 minutes'),
    (msg_g2_uuid, 'text', '{"text":"收到，性能回归我来盯。"}', dave_uuid, NULL, eng_group_uuid, 'read', 2002, NOW() - INTERVAL '88 minutes'),
    (msg_g3_uuid, 'text', '{"text":"我会同步前端验收结果。"}', carol_uuid, NULL, eng_group_uuid, 'delivered', 2003, NOW() - INTERVAL '86 minutes')
    ON CONFLICT (uuid) DO UPDATE
    SET
        type = EXCLUDED.type,
        content = EXCLUDED.content,
        from_user_id = EXCLUDED.from_user_id,
        to_user_id = EXCLUDED.to_user_id,
        group_id = EXCLUDED.group_id,
        status = EXCLUDED.status,
        client_seq = EXCLUDED.client_seq,
        created_at = EXCLUDED.created_at,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO chat_conversations (
        uuid,
        type,
        user_id,
        target_id,
        target_name,
        target_avatar,
        last_message_id,
        last_message_content,
        last_message_time,
        unread_count,
        is_pinned,
        is_muted
    )
    VALUES
    (uuid_generate_v4(), 'single', alice_uuid, bob_uuid, 'Bob', '{"url":"https://static.openchat.local/avatar/bob.png"}', msg_a4_uuid, '我这边把 timeline 混合分发也一起上。', NOW() - INTERVAL '1 hour 55 minutes', 0, TRUE, FALSE),
    (uuid_generate_v4(), 'single', bob_uuid, alice_uuid, 'Alice', '{"url":"https://static.openchat.local/avatar/alice.png"}', msg_a4_uuid, '我这边把 timeline 混合分发也一起上。', NOW() - INTERVAL '1 hour 55 minutes', 1, FALSE, FALSE),
    (uuid_generate_v4(), 'group', alice_uuid, eng_group_uuid, 'OpenChat Engineering', '{"url":"https://static.openchat.local/group/engineering.png"}', msg_g3_uuid, '我会同步前端验收结果。', NOW() - INTERVAL '86 minutes', 0, TRUE, FALSE),
    (uuid_generate_v4(), 'group', bob_uuid, eng_group_uuid, 'OpenChat Engineering', '{"url":"https://static.openchat.local/group/engineering.png"}', msg_g3_uuid, '我会同步前端验收结果。', NOW() - INTERVAL '86 minutes', 0, FALSE, FALSE)
    ON CONFLICT (user_id, target_id, type) DO UPDATE
    SET
        target_name = EXCLUDED.target_name,
        target_avatar = EXCLUDED.target_avatar,
        last_message_id = EXCLUDED.last_message_id,
        last_message_content = EXCLUDED.last_message_content,
        last_message_time = EXCLUDED.last_message_time,
        unread_count = EXCLUDED.unread_count,
        is_pinned = EXCLUDED.is_pinned,
        is_muted = EXCLUDED.is_muted,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO chat_ai_bots (uuid, name, description, type, config, is_active)
    VALUES
    ('50000000-0000-0000-0000-000000000001', 'OpenChat Assistant', '通用智能问答助手', 'chatbot', '{"model":"gpt-4o-mini","temperature":0.7}', TRUE),
    ('50000000-0000-0000-0000-000000000002', 'OpenChat Code Copilot', '研发辅助机器人', 'code-assistant', '{"model":"gpt-4.1","temperature":0.2}', TRUE)
    ON CONFLICT (uuid) DO UPDATE
    SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        config = EXCLUDED.config,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO chat_rtc_channels (uuid, provider, app_id, app_key, app_secret, region, endpoint, extra_config, is_active)
    VALUES
    ('60000000-0000-0000-0000-000000000001', 'volcengine', 'openchat-volc-app', 'openchat-volc-key', 'openchat-volc-secret', 'cn-north-1', 'https://rtc.volcengineapi.com', '{"codec":"vp9"}', TRUE),
    ('60000000-0000-0000-0000-000000000002', 'tencent', '1400000001', 'openchat-trtc-key', 'openchat-trtc-secret', 'ap-guangzhou', 'https://trtc.tencentcloudapi.com', '{"codec":"h264"}', FALSE),
    ('60000000-0000-0000-0000-000000000003', 'alibaba', 'openchat-artc-app', 'openchat-artc-key', 'openchat-artc-secret', 'cn-shanghai', 'https://rtc.aliyuncs.com', '{"codec":"h264"}', FALSE)
    ON CONFLICT (provider) DO UPDATE
    SET
        app_id = EXCLUDED.app_id,
        app_key = EXCLUDED.app_key,
        app_secret = EXCLUDED.app_secret,
        region = EXCLUDED.region,
        endpoint = EXCLUDED.endpoint,
        extra_config = EXCLUDED.extra_config,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO chat_timeline_posts (
        uuid,
        author_id,
        visibility,
        distribution_mode,
        text,
        media,
        custom_audience_ids,
        extra,
        status,
        like_count,
        comment_count,
        share_count,
        published_at,
        is_deleted
    )
    VALUES
    (timeline_post_1_uuid, alice_uuid, 'friends', 'push', '今天把 IM 服务端链路再优化了一轮，延迟稳定在 40ms 内。', '[{"type":"image","url":"https://static.openchat.local/timeline/post-1.png","width":1280,"height":720}]'::jsonb, NULL, '{"topic":"im"}'::jsonb, 'active', 2, 0, 0, NOW() - INTERVAL '3 hours', FALSE),
    (timeline_post_2_uuid, bob_uuid, 'public', 'hybrid', '发布一份 timeline 架构图，欢迎评审。', '[{"type":"image","url":"https://static.openchat.local/timeline/post-2.png","width":1920,"height":1080}]'::jsonb, NULL, '{"topic":"timeline"}'::jsonb, 'active', 1, 0, 0, NOW() - INTERVAL '2 hours', FALSE),
    (timeline_post_3_uuid, carol_uuid, 'custom', 'push', '本周设计稿已更新，先同步给核心同学。', NULL, ARRAY[alice_uuid, bob_uuid], '{"topic":"design-sync"}'::jsonb, 'active', 1, 0, 0, NOW() - INTERVAL '70 minutes', FALSE),
    (timeline_post_4_uuid, dave_uuid, 'private', 'push', '压测记录：峰值 TPS 2200，P99 140ms。', NULL, NULL, '{"topic":"internal-benchmark"}'::jsonb, 'active', 0, 0, 0, NOW() - INTERVAL '40 minutes', FALSE)
    ON CONFLICT (uuid) DO UPDATE
    SET
        author_id = EXCLUDED.author_id,
        visibility = EXCLUDED.visibility,
        distribution_mode = EXCLUDED.distribution_mode,
        text = EXCLUDED.text,
        media = EXCLUDED.media,
        custom_audience_ids = EXCLUDED.custom_audience_ids,
        extra = EXCLUDED.extra,
        status = EXCLUDED.status,
        like_count = EXCLUDED.like_count,
        comment_count = EXCLUDED.comment_count,
        share_count = EXCLUDED.share_count,
        published_at = EXCLUDED.published_at,
        is_deleted = EXCLUDED.is_deleted,
        deleted_at = NULL,
        updated_at = CURRENT_TIMESTAMP;

    SELECT id INTO timeline_post_1_id FROM chat_timeline_posts WHERE uuid = timeline_post_1_uuid;
    SELECT id INTO timeline_post_2_id FROM chat_timeline_posts WHERE uuid = timeline_post_2_uuid;
    SELECT id INTO timeline_post_3_id FROM chat_timeline_posts WHERE uuid = timeline_post_3_uuid;
    SELECT id INTO timeline_post_4_id FROM chat_timeline_posts WHERE uuid = timeline_post_4_uuid;

    INSERT INTO chat_timeline_feed_items (
        uuid,
        user_id,
        post_id,
        author_id,
        visibility,
        sort_score,
        published_at,
        status,
        is_deleted
    )
    VALUES
    (uuid_generate_v4(), alice_uuid, timeline_post_1_id, alice_uuid, 'friends', EXTRACT(EPOCH FROM (NOW() - INTERVAL '3 hours'))::BIGINT * 1000, NOW() - INTERVAL '3 hours', 'active', FALSE),
    (uuid_generate_v4(), bob_uuid, timeline_post_1_id, alice_uuid, 'friends', EXTRACT(EPOCH FROM (NOW() - INTERVAL '3 hours'))::BIGINT * 1000, NOW() - INTERVAL '3 hours', 'active', FALSE),
    (uuid_generate_v4(), carol_uuid, timeline_post_1_id, alice_uuid, 'friends', EXTRACT(EPOCH FROM (NOW() - INTERVAL '3 hours'))::BIGINT * 1000, NOW() - INTERVAL '3 hours', 'active', FALSE),
    (uuid_generate_v4(), dave_uuid, timeline_post_1_id, alice_uuid, 'friends', EXTRACT(EPOCH FROM (NOW() - INTERVAL '3 hours'))::BIGINT * 1000, NOW() - INTERVAL '3 hours', 'active', FALSE),
    (uuid_generate_v4(), alice_uuid, timeline_post_2_id, bob_uuid, 'public', EXTRACT(EPOCH FROM (NOW() - INTERVAL '2 hours'))::BIGINT * 1000, NOW() - INTERVAL '2 hours', 'active', FALSE),
    (uuid_generate_v4(), bob_uuid, timeline_post_2_id, bob_uuid, 'public', EXTRACT(EPOCH FROM (NOW() - INTERVAL '2 hours'))::BIGINT * 1000, NOW() - INTERVAL '2 hours', 'active', FALSE),
    (uuid_generate_v4(), carol_uuid, timeline_post_2_id, bob_uuid, 'public', EXTRACT(EPOCH FROM (NOW() - INTERVAL '2 hours'))::BIGINT * 1000, NOW() - INTERVAL '2 hours', 'active', FALSE),
    (uuid_generate_v4(), alice_uuid, timeline_post_3_id, carol_uuid, 'custom', EXTRACT(EPOCH FROM (NOW() - INTERVAL '70 minutes'))::BIGINT * 1000, NOW() - INTERVAL '70 minutes', 'active', FALSE),
    (uuid_generate_v4(), bob_uuid, timeline_post_3_id, carol_uuid, 'custom', EXTRACT(EPOCH FROM (NOW() - INTERVAL '70 minutes'))::BIGINT * 1000, NOW() - INTERVAL '70 minutes', 'active', FALSE),
    (uuid_generate_v4(), dave_uuid, timeline_post_4_id, dave_uuid, 'private', EXTRACT(EPOCH FROM (NOW() - INTERVAL '40 minutes'))::BIGINT * 1000, NOW() - INTERVAL '40 minutes', 'active', FALSE)
    ON CONFLICT (user_id, post_id) DO UPDATE
    SET
        author_id = EXCLUDED.author_id,
        visibility = EXCLUDED.visibility,
        sort_score = EXCLUDED.sort_score,
        published_at = EXCLUDED.published_at,
        status = EXCLUDED.status,
        is_deleted = EXCLUDED.is_deleted,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO chat_timeline_post_likes (uuid, post_id, user_id, is_deleted, canceled_at)
    VALUES
    (uuid_generate_v4(), timeline_post_1_id, bob_uuid, FALSE, NULL),
    (uuid_generate_v4(), timeline_post_1_id, carol_uuid, FALSE, NULL),
    (uuid_generate_v4(), timeline_post_2_id, alice_uuid, FALSE, NULL),
    (uuid_generate_v4(), timeline_post_3_id, bob_uuid, FALSE, NULL)
    ON CONFLICT (post_id, user_id) DO UPDATE
    SET
        is_deleted = EXCLUDED.is_deleted,
        canceled_at = EXCLUDED.canceled_at,
        updated_at = CURRENT_TIMESTAMP;
END $$;

COMMIT;

SELECT 'Seed data inserted successfully (idempotent)!' AS status;
