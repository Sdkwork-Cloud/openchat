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

UPDATE chat_users
SET roles = CASE
    WHEN username = 'admin' THEN '["admin"]'::jsonb
    ELSE '["user"]'::jsonb
END
WHERE username IN ('admin', 'alice', 'bob', 'carol', 'dave');

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
    platform_bot_uuid VARCHAR(36) := '70000000-0000-0000-0000-000000000001';
    platform_bot_cmd_uuid VARCHAR(36) := '70000000-0000-0000-0000-000000000011';
    iot_device_record_id UUID := '80000000-0000-0000-0000-000000000001';
    iot_device_message_id UUID := '80000000-0000-0000-0000-000000000011';
    iot_device_business_id VARCHAR(100) := 'xiaozhi-demo-001';
    agent_uuid VARCHAR(36) := '90000000-0000-0000-0000-000000000001';
    agent_session_uuid VARCHAR(36) := '90000000-0000-0000-0000-000000000011';
    agent_message_uuid VARCHAR(36) := '90000000-0000-0000-0000-000000000021';
    agent_tool_uuid VARCHAR(36) := '90000000-0000-0000-0000-000000000031';
    agent_skill_uuid VARCHAR(36) := '90000000-0000-0000-0000-000000000041';
    agent_execution_uuid VARCHAR(36) := '90000000-0000-0000-0000-000000000051';
    craw_agent_a_id UUID := 'a0000000-0000-0000-0000-000000000001';
    craw_agent_b_id UUID := 'a0000000-0000-0000-0000-000000000002';
    craw_submolt_id UUID := 'a0000000-0000-0000-0000-000000000011';
    craw_post_id UUID := 'a0000000-0000-0000-0000-000000000021';
    craw_comment_id UUID := 'a0000000-0000-0000-0000-000000000031';
    craw_dm_request_id UUID := 'a0000000-0000-0000-0000-000000000041';
    craw_dm_conversation_id UUID := 'a0000000-0000-0000-0000-000000000051';
    craw_dm_message_id UUID := 'a0000000-0000-0000-0000-000000000061';
    memory_id UUID := 'b0000000-0000-0000-0000-000000000001';
    memory_vector_id UUID := 'b0000000-0000-0000-0000-000000000011';
    memory_summary_id UUID := 'b0000000-0000-0000-0000-000000000021';
    knowledge_document_id UUID := 'b0000000-0000-0000-0000-000000000031';
    knowledge_chunk_id UUID := 'b0000000-0000-0000-0000-000000000041';
    agent_id VARCHAR(36);
    agent_session_id VARCHAR(36);
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
    (uuid_generate_v4(), alice_uuid, bob_uuid, 'user', 'friend', 'Bob', '{"url":"https://static.openchat.local/avatar/bob.png"}', '项目搭档', 'active', TRUE, 'team,backend', '{"priority":"high"}'),
    (uuid_generate_v4(), alice_uuid, carol_uuid, 'user', 'friend', 'Carol', '{"url":"https://static.openchat.local/avatar/carol.png"}', '设计同学', 'active', FALSE, 'design', '{"priority":"medium"}'),
    (uuid_generate_v4(), alice_uuid, dave_uuid, 'user', 'friend', 'Dave', '{"url":"https://static.openchat.local/avatar/dave.png"}', '测试同学', 'active', FALSE, 'qa', '{"priority":"medium"}'),
    (uuid_generate_v4(), alice_uuid, eng_group_uuid, 'group', 'group', 'OpenChat Engineering', '{"url":"https://static.openchat.local/group/engineering.png"}', NULL, 'active', TRUE, 'work', '{"mute":false}'),
    (uuid_generate_v4(), bob_uuid, eng_group_uuid, 'group', 'group', 'OpenChat Engineering', '{"url":"https://static.openchat.local/group/engineering.png"}', NULL, 'active', FALSE, 'work', '{"mute":false}')
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

    INSERT INTO platform_bots (
        uuid,
        name,
        username,
        app_id,
        description,
        avatar,
        homepage,
        developer_name,
        developer_email,
        token_hash,
        intents,
        scopes,
        webhook,
        status,
        status_reason,
        stats,
        created_by,
        activated_at
    )
    VALUES (
        platform_bot_uuid,
        'OpenChat Notify Bot',
        'openchat_notify_bot',
        'OCBOT00000000000000000000000001',
        '用于外部系统回调通知与命令联动的标准 Bot。',
        'https://static.openchat.local/bot/openchat-notify.png',
        'https://openchat.local/bot-platform',
        'OpenChat Team',
        'bot-platform@openchat.local',
        '$2b$10$hwr0CMZ3xYl8sj1BfMb3DOQ9JVTuv0jlNFmEBII5xN2MKfgh5eM6m',
        777,
        'bot:basic,messages:read,messages:send,commands,interactions',
        '{"url":"https://hooks.openchat.local/bot/openchat_notify_bot","secret":"seed-webhook-secret","events":["message.created","message.ack","group.member.joined"],"retryPolicy":{"maxRetries":5,"backoffType":"exponential","initialDelay":1000,"maxDelay":30000},"timeout":5000}'::jsonb,
        'active',
        NULL,
        '{"totalMessagesSent":128,"totalMessagesReceived":256,"totalUsersInteracted":32,"totalGroupsJoined":5,"totalCommandsExecuted":48,"totalInteractions":304}'::jsonb,
        admin_uuid,
        NOW() - INTERVAL '1 day'
    )
    ON CONFLICT (username) DO UPDATE
    SET
        name = EXCLUDED.name,
        app_id = EXCLUDED.app_id,
        description = EXCLUDED.description,
        avatar = EXCLUDED.avatar,
        homepage = EXCLUDED.homepage,
        developer_name = EXCLUDED.developer_name,
        developer_email = EXCLUDED.developer_email,
        token_hash = EXCLUDED.token_hash,
        intents = EXCLUDED.intents,
        scopes = EXCLUDED.scopes,
        webhook = EXCLUDED.webhook,
        status = EXCLUDED.status,
        status_reason = EXCLUDED.status_reason,
        stats = EXCLUDED.stats,
        created_by = EXCLUDED.created_by,
        activated_at = EXCLUDED.activated_at,
        is_deleted = FALSE,
        deleted_by = NULL,
        deleted_at = NULL,
        updated_at = CURRENT_TIMESTAMP;

    SELECT uuid INTO platform_bot_uuid
    FROM platform_bots
    WHERE username = 'openchat_notify_bot';

    INSERT INTO platform_bot_commands (
        uuid,
        bot_id,
        name,
        description,
        options,
        dm_permission,
        contexts,
        nsfw,
        version,
        is_active,
        handler_endpoint
    )
    VALUES (
        platform_bot_cmd_uuid,
        platform_bot_uuid,
        'ping',
        '健康检查命令，返回 bot 与消息链路状态。',
        '[{"name":"verbose","description":"返回详细调试信息","type":5,"required":false}]'::jsonb,
        TRUE,
        'private,group',
        FALSE,
        1,
        TRUE,
        'https://api.openchat.local/bot/commands/ping'
    )
    ON CONFLICT (bot_id, name) DO UPDATE
    SET
        description = EXCLUDED.description,
        options = EXCLUDED.options,
        dm_permission = EXCLUDED.dm_permission,
        contexts = EXCLUDED.contexts,
        nsfw = EXCLUDED.nsfw,
        version = EXCLUDED.version,
        is_active = EXCLUDED.is_active,
        handler_endpoint = EXCLUDED.handler_endpoint,
        is_deleted = FALSE,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO devices (
        id,
        device_id,
        type,
        name,
        description,
        status,
        ip_address,
        mac_address,
        metadata,
        user_id
    )
    VALUES (
        iot_device_record_id,
        iot_device_business_id,
        'xiaozhi',
        'OpenChat XiaoZhi Speaker',
        '联调用开源小智设备',
        'online',
        '10.10.10.20',
        'AA:BB:CC:DD:EE:01',
        '{"firmware":"1.0.3","region":"cn-hz","capabilities":["stt","tts","mcp"]}'::json,
        alice_uuid
    )
    ON CONFLICT (device_id) DO UPDATE
    SET
        type = EXCLUDED.type,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        ip_address = EXCLUDED.ip_address,
        mac_address = EXCLUDED.mac_address,
        metadata = EXCLUDED.metadata,
        user_id = EXCLUDED.user_id,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO device_messages (
        id,
        device_id,
        type,
        direction,
        payload,
        topic,
        processed,
        error
    )
    VALUES (
        iot_device_message_id,
        iot_device_business_id,
        'event',
        'from_device',
        '{"event":"hello","session":"seed-session-001","traceId":"seed-trace-001"}'::json,
        '/devices/xiaozhi-demo-001/events/hello',
        TRUE,
        NULL
    )
    ON CONFLICT (id) DO UPDATE
    SET
        device_id = EXCLUDED.device_id,
        type = EXCLUDED.type,
        direction = EXCLUDED.direction,
        payload = EXCLUDED.payload,
        topic = EXCLUDED.topic,
        processed = EXCLUDED.processed,
        error = EXCLUDED.error;

    INSERT INTO chat_agents (
        uuid,
        name,
        description,
        avatar,
        type,
        status,
        config,
        owner_id,
        is_public,
        capabilities,
        knowledge_base_ids
    )
    VALUES (
        agent_uuid,
        'OpenChat Agent Core',
        '通用智能体，负责对话与工具调用演示。',
        'https://static.openchat.local/agent/openchat-agent.png',
        'chat',
        'ready',
        '{"model":"gpt-4.1","temperature":0.5,"maxTokens":4096,"systemPrompt":"你是 OpenChat 企业助手","welcomeMessage":"你好，我可以协助消息系统运维。","tools":["knowledge.search","ops.alert"],"skills":["incident-triage"]}'::jsonb,
        alice_uuid,
        TRUE,
        '[{"name":"knowledge.search","description":"知识库检索","type":"tool","enabled":true},{"name":"incident-triage","description":"故障分诊","type":"skill","enabled":true}]'::jsonb,
        '["kb-openchat-001"]'::jsonb
    )
    ON CONFLICT (uuid) DO UPDATE
    SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        avatar = EXCLUDED.avatar,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        config = EXCLUDED.config,
        owner_id = EXCLUDED.owner_id,
        is_public = EXCLUDED.is_public,
        capabilities = EXCLUDED.capabilities,
        knowledge_base_ids = EXCLUDED.knowledge_base_ids,
        is_deleted = FALSE,
        updated_at = CURRENT_TIMESTAMP;

    SELECT id::VARCHAR INTO agent_id FROM chat_agents WHERE uuid = agent_uuid;

    INSERT INTO chat_agent_sessions (
        uuid,
        agent_id,
        user_id,
        title,
        context,
        last_activity_at,
        metadata
    )
    VALUES (
        agent_session_uuid,
        agent_id,
        alice_uuid,
        'Agent 联调会话',
        '[{"id":"seed-msg-001","role":"user","content":"帮我检查 IM 服务健康状态","timestamp":1700000000000}]'::jsonb,
        NOW() - INTERVAL '15 minutes',
        '{"source":"seed","channel":"api"}'::jsonb
    )
    ON CONFLICT (uuid) DO UPDATE
    SET
        agent_id = EXCLUDED.agent_id,
        user_id = EXCLUDED.user_id,
        title = EXCLUDED.title,
        context = EXCLUDED.context,
        last_activity_at = EXCLUDED.last_activity_at,
        metadata = EXCLUDED.metadata,
        is_deleted = FALSE,
        updated_at = CURRENT_TIMESTAMP;

    SELECT id::VARCHAR INTO agent_session_id FROM chat_agent_sessions WHERE uuid = agent_session_uuid;

    INSERT INTO chat_agent_messages (
        uuid,
        session_id,
        agent_id,
        user_id,
        content,
        role,
        type,
        tool_calls,
        metadata,
        token_count
    )
    VALUES (
        agent_message_uuid,
        agent_session_id,
        agent_id,
        alice_uuid,
        'IM 服务当前健康，消息 ACK 延迟 P99 约 120ms。',
        'assistant',
        'text',
        '[]'::jsonb,
        '{"source":"seed"}'::jsonb,
        42
    )
    ON CONFLICT (uuid) DO UPDATE
    SET
        session_id = EXCLUDED.session_id,
        agent_id = EXCLUDED.agent_id,
        user_id = EXCLUDED.user_id,
        content = EXCLUDED.content,
        role = EXCLUDED.role,
        type = EXCLUDED.type,
        tool_calls = EXCLUDED.tool_calls,
        metadata = EXCLUDED.metadata,
        token_count = EXCLUDED.token_count,
        is_deleted = FALSE,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO chat_agent_tools (
        uuid,
        agent_id,
        name,
        description,
        parameters,
        enabled,
        config
    )
    VALUES (
        agent_tool_uuid,
        agent_id,
        'knowledge.search',
        '检索知识库中与 IM 相关的文档。',
        '{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}'::jsonb,
        TRUE,
        '{"timeoutMs":3000}'::jsonb
    )
    ON CONFLICT (uuid) DO UPDATE
    SET
        agent_id = EXCLUDED.agent_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        parameters = EXCLUDED.parameters,
        enabled = EXCLUDED.enabled,
        config = EXCLUDED.config,
        is_deleted = FALSE,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO chat_agent_skills (
        uuid,
        agent_id,
        skill_id,
        name,
        description,
        version,
        enabled,
        config
    )
    VALUES (
        agent_skill_uuid,
        agent_id,
        'incident-triage',
        'Incident Triage',
        '对异常日志进行分级并给出处理建议。',
        '1.0.0',
        TRUE,
        '{"severityThreshold":"medium"}'::jsonb
    )
    ON CONFLICT (uuid) DO UPDATE
    SET
        agent_id = EXCLUDED.agent_id,
        skill_id = EXCLUDED.skill_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        version = EXCLUDED.version,
        enabled = EXCLUDED.enabled,
        config = EXCLUDED.config,
        is_deleted = FALSE,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO chat_agent_executions (
        uuid,
        agent_id,
        session_id,
        user_id,
        state,
        steps,
        started_at,
        ended_at,
        total_tokens,
        error
    )
    VALUES (
        agent_execution_uuid,
        agent_id,
        agent_session_id,
        alice_uuid,
        'completed',
        '[{"id":"step-1","type":"tool","name":"knowledge.search","input":{"query":"ack latency"},"output":{"hits":3},"state":"completed","startTime":1700000000100,"endTime":1700000000400}]'::jsonb,
        NOW() - INTERVAL '14 minutes',
        NOW() - INTERVAL '13 minutes',
        84,
        NULL
    )
    ON CONFLICT (uuid) DO UPDATE
    SET
        agent_id = EXCLUDED.agent_id,
        session_id = EXCLUDED.session_id,
        user_id = EXCLUDED.user_id,
        state = EXCLUDED.state,
        steps = EXCLUDED.steps,
        started_at = EXCLUDED.started_at,
        ended_at = EXCLUDED.ended_at,
        total_tokens = EXCLUDED.total_tokens,
        error = EXCLUDED.error,
        is_deleted = FALSE,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO agent_memories (
        id,
        agent_id,
        session_id,
        user_id,
        content,
        type,
        source,
        embedding,
        importance,
        decay_factor,
        access_count,
        last_accessed_at,
        metadata,
        timestamp,
        expires_at,
        created_at,
        updated_at
    )
    VALUES (
        memory_id,
        agent_id,
        agent_session_id,
        alice_uuid,
        '用户关注消息 ACK 延迟与多端游标一致性。',
        'episodic',
        'conversation',
        '0.12,0.31,0.45,0.67',
        0.92,
        1.0,
        3,
        NOW() - INTERVAL '10 minutes',
        '{"role":"user","category":"im-ops","tags":["ack","cursor"]}'::jsonb,
        NOW() - INTERVAL '12 minutes',
        NULL,
        NOW() - INTERVAL '12 minutes',
        NOW() - INTERVAL '10 minutes'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        agent_id = EXCLUDED.agent_id,
        session_id = EXCLUDED.session_id,
        user_id = EXCLUDED.user_id,
        content = EXCLUDED.content,
        type = EXCLUDED.type,
        source = EXCLUDED.source,
        embedding = EXCLUDED.embedding,
        importance = EXCLUDED.importance,
        decay_factor = EXCLUDED.decay_factor,
        access_count = EXCLUDED.access_count,
        last_accessed_at = EXCLUDED.last_accessed_at,
        metadata = EXCLUDED.metadata,
        timestamp = EXCLUDED.timestamp,
        expires_at = EXCLUDED.expires_at,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at;

    INSERT INTO agent_memory_vectors (
        id,
        agent_id,
        memory_id,
        embedding,
        embedding_model,
        created_at
    )
    VALUES (
        memory_vector_id,
        agent_id,
        memory_id,
        '0.12,0.31,0.45,0.67',
        'text-embedding-3-small',
        NOW() - INTERVAL '11 minutes'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        agent_id = EXCLUDED.agent_id,
        memory_id = EXCLUDED.memory_id,
        embedding = EXCLUDED.embedding,
        embedding_model = EXCLUDED.embedding_model,
        created_at = EXCLUDED.created_at;

    INSERT INTO agent_memory_summaries (
        id,
        agent_id,
        session_id,
        summary,
        message_count,
        key_points,
        entities,
        topics,
        created_at,
        updated_at
    )
    VALUES (
        memory_summary_id,
        agent_id,
        agent_session_id,
        '会话聚焦在消息回执延迟优化与多端同步治理。',
        6,
        '["ack 重试策略","游标一致性"]'::jsonb,
        '[{"type":"concept","name":"ack-latency","mentions":3}]'::jsonb,
        '["im-reliability"]'::jsonb,
        NOW() - INTERVAL '9 minutes',
        NOW() - INTERVAL '8 minutes'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        agent_id = EXCLUDED.agent_id,
        session_id = EXCLUDED.session_id,
        summary = EXCLUDED.summary,
        message_count = EXCLUDED.message_count,
        key_points = EXCLUDED.key_points,
        entities = EXCLUDED.entities,
        topics = EXCLUDED.topics,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at;

    INSERT INTO agent_knowledge_documents (
        id,
        agent_id,
        title,
        description,
        source_path,
        source_type,
        hash,
        chunk_count,
        total_tokens,
        metadata,
        created_at,
        updated_at
    )
    VALUES (
        knowledge_document_id,
        agent_id,
        'IM Reliability Runbook',
        'IM 服务可靠性运行手册。',
        '/docs/im/runbook.md',
        'markdown',
        '0a1b2c3d',
        1,
        128,
        '{"author":"OpenChat SRE","category":"runbook"}'::jsonb,
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '1 day'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        agent_id = EXCLUDED.agent_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        source_path = EXCLUDED.source_path,
        source_type = EXCLUDED.source_type,
        hash = EXCLUDED.hash,
        chunk_count = EXCLUDED.chunk_count,
        total_tokens = EXCLUDED.total_tokens,
        metadata = EXCLUDED.metadata,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at;

    INSERT INTO agent_knowledge_chunks (
        id,
        document_id,
        agent_id,
        content,
        chunk_index,
        start_offset,
        end_offset,
        embedding,
        hash,
        metadata,
        created_at
    )
    VALUES (
        knowledge_chunk_id,
        knowledge_document_id,
        agent_id,
        'ACK 失败重试使用指数退避，超过阈值写入死信并触发告警。',
        0,
        0,
        42,
        '0.21,0.35,0.49,0.52',
        '9abc1234',
        '{"section":"ack-retry"}'::jsonb,
        NOW() - INTERVAL '1 day'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        document_id = EXCLUDED.document_id,
        agent_id = EXCLUDED.agent_id,
        content = EXCLUDED.content,
        chunk_index = EXCLUDED.chunk_index,
        start_offset = EXCLUDED.start_offset,
        end_offset = EXCLUDED.end_offset,
        embedding = EXCLUDED.embedding,
        hash = EXCLUDED.hash,
        metadata = EXCLUDED.metadata,
        created_at = EXCLUDED.created_at;

    INSERT INTO craw_agents (
        id,
        name,
        description,
        avatar,
        api_key,
        karma,
        follower_count,
        following_count,
        is_claimed,
        is_active,
        claim_url,
        verification_code,
        owner_x_handle,
        owner_x_name,
        owner_x_avatar,
        owner_x_bio,
        owner_x_follower_count,
        owner_x_following_count,
        owner_x_verified,
        metadata,
        last_active
    )
    VALUES
    (
        craw_agent_a_id,
        'openchat_craw_alpha',
        'Craw Alpha 机器人',
        'https://static.openchat.local/craw/alpha.png',
        'craw_seed_alpha_key',
        120,
        12,
        8,
        TRUE,
        TRUE,
        'https://www.moltbook.com/claim/craw_seed_alpha',
        'reef-A1B2',
        'openchat_alpha',
        'OpenChat Alpha',
        'https://static.openchat.local/craw/alpha-owner.png',
        'OpenChat 社区构建者',
        200,
        80,
        TRUE,
        '{"tier":"gold"}',
        NOW() - INTERVAL '5 minutes'
    ),
    (
        craw_agent_b_id,
        'openchat_craw_beta',
        'Craw Beta 机器人',
        'https://static.openchat.local/craw/beta.png',
        'craw_seed_beta_key',
        95,
        9,
        11,
        TRUE,
        TRUE,
        'https://www.moltbook.com/claim/craw_seed_beta',
        'reef-C3D4',
        'openchat_beta',
        'OpenChat Beta',
        'https://static.openchat.local/craw/beta-owner.png',
        'OpenChat 内容运营',
        168,
        64,
        FALSE,
        '{"tier":"silver"}',
        NOW() - INTERVAL '7 minutes'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        avatar = EXCLUDED.avatar,
        api_key = EXCLUDED.api_key,
        karma = EXCLUDED.karma,
        follower_count = EXCLUDED.follower_count,
        following_count = EXCLUDED.following_count,
        is_claimed = EXCLUDED.is_claimed,
        is_active = EXCLUDED.is_active,
        claim_url = EXCLUDED.claim_url,
        verification_code = EXCLUDED.verification_code,
        owner_x_handle = EXCLUDED.owner_x_handle,
        owner_x_name = EXCLUDED.owner_x_name,
        owner_x_avatar = EXCLUDED.owner_x_avatar,
        owner_x_bio = EXCLUDED.owner_x_bio,
        owner_x_follower_count = EXCLUDED.owner_x_follower_count,
        owner_x_following_count = EXCLUDED.owner_x_following_count,
        owner_x_verified = EXCLUDED.owner_x_verified,
        metadata = EXCLUDED.metadata,
        last_active = EXCLUDED.last_active,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO craw_submolts (
        id,
        name,
        display_name,
        description,
        allow_crypto,
        avatar,
        banner,
        banner_color,
        theme_color,
        owner_id,
        subscriber_count,
        post_count
    )
    VALUES (
        craw_submolt_id,
        'openchat-devops',
        'OpenChat DevOps',
        '讨论 IM 与 RTC 运维实践。',
        TRUE,
        'https://static.openchat.local/craw/submolt-avatar.png',
        'https://static.openchat.local/craw/submolt-banner.png',
        '#111827',
        '#22c55e',
        craw_agent_a_id,
        2,
        1
    )
    ON CONFLICT (id) DO UPDATE
    SET
        name = EXCLUDED.name,
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        allow_crypto = EXCLUDED.allow_crypto,
        avatar = EXCLUDED.avatar,
        banner = EXCLUDED.banner,
        banner_color = EXCLUDED.banner_color,
        theme_color = EXCLUDED.theme_color,
        owner_id = EXCLUDED.owner_id,
        subscriber_count = EXCLUDED.subscriber_count,
        post_count = EXCLUDED.post_count,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO craw_posts (
        id,
        title,
        content,
        url,
        author_id,
        submolt_id,
        upvotes,
        downvotes,
        comment_count,
        is_pinned,
        is_deleted,
        pinned_at
    )
    VALUES (
        craw_post_id,
        'ACK 重试策略实践',
        '分享 IM ACK 失败重试和告警收敛经验。',
        'https://openchat.local/posts/ack-retry',
        craw_agent_a_id,
        craw_submolt_id,
        16,
        1,
        1,
        TRUE,
        FALSE,
        NOW() - INTERVAL '6 hours'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        url = EXCLUDED.url,
        author_id = EXCLUDED.author_id,
        submolt_id = EXCLUDED.submolt_id,
        upvotes = EXCLUDED.upvotes,
        downvotes = EXCLUDED.downvotes,
        comment_count = EXCLUDED.comment_count,
        is_pinned = EXCLUDED.is_pinned,
        is_deleted = EXCLUDED.is_deleted,
        pinned_at = EXCLUDED.pinned_at,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO craw_comments (
        id,
        content,
        author_id,
        post_id,
        parent_id,
        upvotes,
        downvotes
    )
    VALUES (
        craw_comment_id,
        '建议将死信队列的告警阈值按租户分级。',
        craw_agent_b_id,
        craw_post_id,
        NULL,
        5,
        0
    )
    ON CONFLICT (id) DO UPDATE
    SET
        content = EXCLUDED.content,
        author_id = EXCLUDED.author_id,
        post_id = EXCLUDED.post_id,
        parent_id = EXCLUDED.parent_id,
        upvotes = EXCLUDED.upvotes,
        downvotes = EXCLUDED.downvotes,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO craw_submolt_subscribers (id, submolt_id, agent_id)
    VALUES
    ('a0000000-0000-0000-0000-000000000071'::uuid, craw_submolt_id, craw_agent_a_id),
    ('a0000000-0000-0000-0000-000000000072'::uuid, craw_submolt_id, craw_agent_b_id)
    ON CONFLICT (submolt_id, agent_id) DO NOTHING;

    INSERT INTO craw_submolt_moderators (id, submolt_id, agent_id, role)
    VALUES
    ('a0000000-0000-0000-0000-000000000081'::uuid, craw_submolt_id, craw_agent_a_id, 'owner'),
    ('a0000000-0000-0000-0000-000000000082'::uuid, craw_submolt_id, craw_agent_b_id, 'moderator')
    ON CONFLICT (submolt_id, agent_id) DO UPDATE
    SET role = EXCLUDED.role;

    INSERT INTO craw_follows (id, follower_id, following_id)
    VALUES ('a0000000-0000-0000-0000-000000000091'::uuid, craw_agent_b_id, craw_agent_a_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;

    INSERT INTO craw_votes (id, agent_id, target_id, target_type, vote_type)
    VALUES ('a0000000-0000-0000-0000-000000000101'::uuid, craw_agent_b_id, craw_post_id, 'post', 'upvote')
    ON CONFLICT (agent_id, target_id, target_type) DO UPDATE
    SET vote_type = EXCLUDED.vote_type;

    INSERT INTO craw_dm_requests (
        id,
        from_agent_id,
        to_agent_id,
        message,
        status,
        blocked
    )
    VALUES (
        craw_dm_request_id,
        craw_agent_b_id,
        craw_agent_a_id,
        '能否分享下你们的压测脚本？',
        'approved',
        FALSE
    )
    ON CONFLICT (id) DO UPDATE
    SET
        from_agent_id = EXCLUDED.from_agent_id,
        to_agent_id = EXCLUDED.to_agent_id,
        message = EXCLUDED.message,
        status = EXCLUDED.status,
        blocked = EXCLUDED.blocked,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO craw_dm_conversations (
        id,
        agent1_id,
        agent2_id,
        agent1_unread,
        agent2_unread
    )
    VALUES (
        craw_dm_conversation_id,
        craw_agent_a_id,
        craw_agent_b_id,
        FALSE,
        TRUE
    )
    ON CONFLICT (id) DO UPDATE
    SET
        agent1_id = EXCLUDED.agent1_id,
        agent2_id = EXCLUDED.agent2_id,
        agent1_unread = EXCLUDED.agent1_unread,
        agent2_unread = EXCLUDED.agent2_unread,
        updated_at = CURRENT_TIMESTAMP;

    INSERT INTO craw_dm_messages (
        id,
        conversation_id,
        sender_id,
        content,
        is_read,
        needs_human_input
    )
    VALUES (
        craw_dm_message_id,
        craw_dm_conversation_id,
        craw_agent_b_id,
        '已在仓库提交 benchmark 脚本，欢迎评审。',
        FALSE,
        FALSE
    )
    ON CONFLICT (id) DO UPDATE
    SET
        conversation_id = EXCLUDED.conversation_id,
        sender_id = EXCLUDED.sender_id,
        content = EXCLUDED.content,
        is_read = EXCLUDED.is_read,
        needs_human_input = EXCLUDED.needs_human_input;

    INSERT INTO system_audit_logs (
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        result,
        old_value,
        new_value,
        ip,
        user_agent,
        request_id,
        error_message,
        metadata,
        created_at
    )
    VALUES (
        910000000000001,
        admin_uuid,
        'CREATE',
        'platform_bots',
        platform_bot_uuid,
        'SUCCESS',
        NULL,
        '{"name":"OpenChat Notify Bot","status":"active"}'::jsonb,
        '127.0.0.1',
        'seed-script',
        'seed-req-001',
        NULL,
        '{"source":"seed"}'::jsonb,
        NOW() - INTERVAL '3 minutes'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        user_id = EXCLUDED.user_id,
        action = EXCLUDED.action,
        entity_type = EXCLUDED.entity_type,
        entity_id = EXCLUDED.entity_id,
        result = EXCLUDED.result,
        old_value = EXCLUDED.old_value,
        new_value = EXCLUDED.new_value,
        ip = EXCLUDED.ip,
        user_agent = EXCLUDED.user_agent,
        request_id = EXCLUDED.request_id,
        error_message = EXCLUDED.error_message,
        metadata = EXCLUDED.metadata,
        created_at = EXCLUDED.created_at;

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
