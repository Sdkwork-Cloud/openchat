-- ============================================
-- OpenChat Server Database Seed Data
-- 数据库: PostgreSQL
-- 版本: 1.0.0
-- 命名规范: snake_case (下划线命名)
-- ============================================

-- 插入测试用户（使用 uuid_generate_v4() 生成 UUID）
INSERT INTO chat_users (uuid, username, nickname, password, avatar, status) VALUES
(uuid_generate_v4(), 'admin', '管理员', '$2b$10$YourHashedPasswordHere', '{"url": "https://example.com/avatar/admin.jpg"}', 'online'),
(uuid_generate_v4(), 'user1', '张三', '$2b$10$YourHashedPasswordHere', '{"url": "https://example.com/avatar/user1.jpg"}', 'online'),
(uuid_generate_v4(), 'user2', '李四', '$2b$10$YourHashedPasswordHere', '{"url": "https://example.com/avatar/user2.jpg"}', 'offline'),
(uuid_generate_v4(), 'user3', '王五', '$2b$10$YourHashedPasswordHere', '{"url": "https://example.com/avatar/user3.jpg"}', 'busy');

-- 插入好友关系
INSERT INTO chat_friends (uuid, user_id, friend_id, status, accepted_at) VALUES
(uuid_generate_v4(), (SELECT uuid FROM chat_users WHERE username = 'user1'), (SELECT uuid FROM chat_users WHERE username = 'user2'), 'accepted', NOW()),
(uuid_generate_v4(), (SELECT uuid FROM chat_users WHERE username = 'user2'), (SELECT uuid FROM chat_users WHERE username = 'user1'), 'accepted', NOW()),
(uuid_generate_v4(), (SELECT uuid FROM chat_users WHERE username = 'user1'), (SELECT uuid FROM chat_users WHERE username = 'user3'), 'accepted', NOW()),
(uuid_generate_v4(), (SELECT uuid FROM chat_users WHERE username = 'user3'), (SELECT uuid FROM chat_users WHERE username = 'user1'), 'accepted', NOW());

-- 插入联系人
INSERT INTO chat_contacts (uuid, user_id, contact_id, type, source, name, avatar, remark, status, is_favorite, tags) VALUES
(uuid_generate_v4(), (SELECT uuid FROM chat_users WHERE username = 'user1'), (SELECT uuid FROM chat_users WHERE username = 'user2'), 'user', 'friend', '李四', '{"url": "https://example.com/avatar/user2.jpg"}', '小李', 'active', true, ARRAY['同事', '好友']),
(uuid_generate_v4(), (SELECT uuid FROM chat_users WHERE username = 'user1'), (SELECT uuid FROM chat_users WHERE username = 'user3'), 'user', 'friend', '王五', '{"url": "https://example.com/avatar/user3.jpg"}', '老王', 'active', false, ARRAY['朋友']),
(uuid_generate_v4(), (SELECT uuid FROM chat_users WHERE username = 'user2'), (SELECT uuid FROM chat_users WHERE username = 'user1'), 'user', 'friend', '张三', '{"url": "https://example.com/avatar/user1.jpg"}', '小张', 'active', true, ARRAY['同事']),
(uuid_generate_v4(), (SELECT uuid FROM chat_users WHERE username = 'user3'), (SELECT uuid FROM chat_users WHERE username = 'user1'), 'user', 'friend', '张三', '{"url": "https://example.com/avatar/user1.jpg"}', '张三', 'active', false, ARRAY['朋友']);

-- 插入群组
INSERT INTO chat_groups (uuid, name, description, avatar, owner_id) VALUES
(uuid_generate_v4(), '技术交流群', '技术讨论和交流', '{"url": "https://example.com/avatar/tech.jpg"}', (SELECT uuid FROM chat_users WHERE username = 'user1')),
(uuid_generate_v4(), '产品讨论组', '产品需求讨论', '{"url": "https://example.com/avatar/product.jpg"}', (SELECT uuid FROM chat_users WHERE username = 'user2'));

-- 插入群组成员
INSERT INTO chat_group_members (uuid, group_id, user_id, role, status) VALUES
(uuid_generate_v4(), (SELECT uuid FROM chat_groups WHERE name = '技术交流群'), (SELECT uuid FROM chat_users WHERE username = 'user1'), 'owner', 'joined'),
(uuid_generate_v4(), (SELECT uuid FROM chat_groups WHERE name = '技术交流群'), (SELECT uuid FROM chat_users WHERE username = 'user2'), 'member', 'joined'),
(uuid_generate_v4(), (SELECT uuid FROM chat_groups WHERE name = '技术交流群'), (SELECT uuid FROM chat_users WHERE username = 'user3'), 'member', 'joined'),
(uuid_generate_v4(), (SELECT uuid FROM chat_groups WHERE name = '产品讨论组'), (SELECT uuid FROM chat_users WHERE username = 'user2'), 'owner', 'joined'),
(uuid_generate_v4(), (SELECT uuid FROM chat_groups WHERE name = '产品讨论组'), (SELECT uuid FROM chat_users WHERE username = 'user1'), 'member', 'joined');

-- 插入群组联系人
INSERT INTO chat_contacts (uuid, user_id, contact_id, type, source, name, avatar, status) VALUES
(uuid_generate_v4(), (SELECT uuid FROM chat_users WHERE username = 'user1'), (SELECT uuid FROM chat_groups WHERE name = '技术交流群'), 'group', 'group', '技术交流群', '{"url": "https://example.com/avatar/tech.jpg"}', 'active'),
(uuid_generate_v4(), (SELECT uuid FROM chat_users WHERE username = 'user2'), (SELECT uuid FROM chat_groups WHERE name = '技术交流群'), 'group', 'group', '技术交流群', '{"url": "https://example.com/avatar/tech.jpg"}', 'active'),
(uuid_generate_v4(), (SELECT uuid FROM chat_users WHERE username = 'user3'), (SELECT uuid FROM chat_groups WHERE name = '技术交流群'), 'group', 'group', '技术交流群', '{"url": "https://example.com/avatar/tech.jpg"}', 'active'),
(uuid_generate_v4(), (SELECT uuid FROM chat_users WHERE username = 'user1'), (SELECT uuid FROM chat_groups WHERE name = '产品讨论组'), 'group', 'group', '产品讨论组', '{"url": "https://example.com/avatar/product.jpg"}', 'active'),
(uuid_generate_v4(), (SELECT uuid FROM chat_users WHERE username = 'user2'), (SELECT uuid FROM chat_groups WHERE name = '产品讨论组'), 'group', 'group', '产品讨论组', '{"url": "https://example.com/avatar/product.jpg"}', 'active');

-- 插入会话
INSERT INTO chat_conversations (uuid, type, user_id, target_id, target_name, target_avatar, unread_count, is_pinned, is_muted) VALUES
(uuid_generate_v4(), 'single', (SELECT uuid FROM chat_users WHERE username = 'user1'), (SELECT uuid FROM chat_users WHERE username = 'user2'), '李四', '{"url": "https://example.com/avatar/user2.jpg"}', 0, true, false),
(uuid_generate_v4(), 'single', (SELECT uuid FROM chat_users WHERE username = 'user1'), (SELECT uuid FROM chat_users WHERE username = 'user3'), '王五', '{"url": "https://example.com/avatar/user3.jpg"}', 2, false, false),
(uuid_generate_v4(), 'group', (SELECT uuid FROM chat_users WHERE username = 'user1'), (SELECT uuid FROM chat_groups WHERE name = '技术交流群'), '技术交流群', '{"url": "https://example.com/avatar/tech.jpg"}', 5, true, false),
(uuid_generate_v4(), 'single', (SELECT uuid FROM chat_users WHERE username = 'user2'), (SELECT uuid FROM chat_users WHERE username = 'user1'), '张三', '{"url": "https://example.com/avatar/user1.jpg"}', 0, false, false);

-- 插入消息
INSERT INTO chat_messages (uuid, type, content, from_user_id, to_user_id, status) VALUES
(uuid_generate_v4(), 'text', '{"text": "你好，李四！"}', (SELECT uuid FROM chat_users WHERE username = 'user1'), (SELECT uuid FROM chat_users WHERE username = 'user2'), 'read'),
(uuid_generate_v4(), 'text', '{"text": "你好，张三！最近怎么样？"}', (SELECT uuid FROM chat_users WHERE username = 'user2'), (SELECT uuid FROM chat_users WHERE username = 'user1'), 'read'),
(uuid_generate_v4(), 'text', '{"text": "还不错，最近在忙一个新项目。"}', (SELECT uuid FROM chat_users WHERE username = 'user1'), (SELECT uuid FROM chat_users WHERE username = 'user2'), 'read'),
(uuid_generate_v4(), 'image', '{"url": "https://example.com/images/project.jpg", "width": 1920, "height": 1080}', (SELECT uuid FROM chat_users WHERE username = 'user1'), (SELECT uuid FROM chat_users WHERE username = 'user2'), 'delivered');

-- 插入群组消息
INSERT INTO chat_messages (uuid, type, content, from_user_id, group_id, status) VALUES
(uuid_generate_v4(), 'text', '{"text": "大家早上好！"}', (SELECT uuid FROM chat_users WHERE username = 'user1'), (SELECT uuid FROM chat_groups WHERE name = '技术交流群'), 'read'),
(uuid_generate_v4(), 'text', '{"text": "早上好！"}', (SELECT uuid FROM chat_users WHERE username = 'user2'), (SELECT uuid FROM chat_groups WHERE name = '技术交流群'), 'read'),
(uuid_generate_v4(), 'text', '{"text": "今天有什么安排？"}', (SELECT uuid FROM chat_users WHERE username = 'user3'), (SELECT uuid FROM chat_groups WHERE name = '技术交流群'), 'delivered');

-- 插入 AI Bot
INSERT INTO chat_ai_bots (uuid, name, description, type, config, is_active) VALUES
(uuid_generate_v4(), 'AI助手', '智能问答助手', 'chatbot', '{"model": "gpt-3.5-turbo", "temperature": 0.7}', true),
(uuid_generate_v4(), '代码助手', '编程辅助AI', 'code-assistant', '{"model": "gpt-4", "temperature": 0.3}', true);

-- 插入 RTC 渠道配置（示例）
INSERT INTO chat_rtc_channels (uuid, provider, app_id, app_key, app_secret, region, is_active) VALUES
(uuid_generate_v4(), 'volcengine', 'your-app-id', 'your-app-key', 'your-app-secret', 'cn-north-1', true),
(uuid_generate_v4(), 'tencent', 'your-tencent-app-id', 'your-tencent-app-key', 'your-tencent-app-secret', 'ap-guangzhou', false);

-- ============================================
-- 完成
-- ============================================

SELECT 'Seed data inserted successfully!' AS status;
