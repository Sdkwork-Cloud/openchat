-- ============================================
-- OpenChat Server Database Index Optimization
-- 数据库索引优化脚本
-- 版本: 1.1.0
-- ============================================

-- ============================================
-- 1. 消息表索引优化
-- ============================================

-- 复合索引：查询用户会话消息（单聊）
-- 场景：获取两个用户之间的消息历史
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation 
ON chat_messages(from_user_id, to_user_id, created_at DESC);

-- 复合索引：查询群组消息
-- 场景：获取群组消息历史
CREATE INDEX IF NOT EXISTS idx_chat_messages_group_time 
ON chat_messages(group_id, created_at DESC);

-- 复合索引：查询用户发送的消息
-- 场景：获取用户发送的所有消息
CREATE INDEX IF NOT EXISTS idx_chat_messages_from_time 
ON chat_messages(from_user_id, created_at DESC);

-- 复合索引：查询用户接收的消息
-- 场景：获取用户接收的所有消息
CREATE INDEX IF NOT EXISTS idx_chat_messages_to_time 
ON chat_messages(to_user_id, created_at DESC);

-- 复合索引：消息状态查询
-- 场景：查询待发送或失败的消息进行重试
CREATE INDEX IF NOT EXISTS idx_chat_messages_status_time 
ON chat_messages(status, created_at) 
WHERE status IN ('sending', 'failed');

-- 复合索引：消息类型查询
-- 场景：按类型筛选消息（如只查图片）
CREATE INDEX IF NOT EXISTS idx_chat_messages_type_time 
ON chat_messages(type, created_at DESC);

-- 复合索引：客户端序列号去重
-- 场景：消息去重查询
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_seq 
ON chat_messages(from_user_id, client_seq) 
WHERE client_seq IS NOT NULL;

-- ============================================
-- 2. 会话表索引优化
-- ============================================

-- 复合索引：用户会话列表（按置顶和最后消息时间排序）
-- 场景：获取用户的会话列表，置顶会话优先
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_pinned_time 
ON chat_conversations(user_id, is_pinned DESC, last_message_time DESC);

-- 复合索引：用户未读消息统计
-- 场景：统计用户所有未读消息数
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_unread 
ON chat_conversations(user_id, unread_count) 
WHERE unread_count > 0;

-- 复合索引：用户静音会话查询
-- 场景：获取用户静音的会话列表
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_muted 
ON chat_conversations(user_id, is_muted) 
WHERE is_muted = TRUE;

-- ============================================
-- 3. 好友关系表索引优化
-- ============================================

-- 复合索引：用户好友列表（按状态筛选）
-- 场景：获取用户的好友列表
CREATE INDEX IF NOT EXISTS idx_chat_friends_user_status 
ON chat_friends(user_id, status, accepted_at DESC);

-- 复合索引：双向好友关系查询
-- 场景：检查两个用户是否为好友
CREATE INDEX IF NOT EXISTS idx_chat_friends_bidirectional 
ON chat_friends(user_id, friend_id, status);

-- ============================================
-- 4. 好友请求表索引优化
-- ============================================

-- 复合索引：用户发送的请求
-- 场景：获取用户发送的好友请求
CREATE INDEX IF NOT EXISTS idx_chat_friend_requests_from_status 
ON chat_friend_requests(from_user_id, status, created_at DESC);

-- 复合索引：用户接收的请求
-- 场景：获取用户接收的好友请求
CREATE INDEX IF NOT EXISTS idx_chat_friend_requests_to_status 
ON chat_friend_requests(to_user_id, status, created_at DESC);

-- 复合索引：待处理请求查询
-- 场景：获取待处理的好友请求
CREATE INDEX IF NOT EXISTS idx_chat_friend_requests_pending 
ON chat_friend_requests(to_user_id, created_at DESC) 
WHERE status = 'pending';

-- ============================================
-- 5. 群组表索引优化
-- ============================================

-- 复合索引：用户加入的群组
-- 场景：获取用户加入的所有群组
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user_joined 
ON chat_group_members(user_id, joined_at DESC) 
WHERE status = 'joined';

-- 复合索引：群组成员列表
-- 场景：获取群组的成员列表
CREATE INDEX IF NOT EXISTS idx_chat_group_members_group_role 
ON chat_group_members(group_id, role, joined_at DESC);

-- 复合索引：群组管理员查询
-- 场景：获取群组的管理员列表
CREATE INDEX IF NOT EXISTS idx_chat_group_members_admins 
ON chat_group_members(group_id, user_id) 
WHERE role IN ('owner', 'admin');

-- ============================================
-- 6. 联系人表索引优化
-- ============================================

-- 复合索引：用户联系人列表（按收藏和最近联系时间）
-- 场景：获取用户的联系人列表
CREATE INDEX IF NOT EXISTS idx_chat_contacts_user_favorite_time 
ON chat_contacts(user_id, is_favorite DESC, last_contact_time DESC) 
WHERE status = 'active';

-- 复合索引：联系人标签搜索
-- 场景：按标签筛选联系人
CREATE INDEX IF NOT EXISTS idx_chat_contacts_tags 
ON chat_contacts USING GIN(tags) 
WHERE status = 'active';

-- 复合索引：联系人名称搜索
-- 场景：按名称搜索联系人
CREATE INDEX IF NOT EXISTS idx_chat_contacts_name 
ON chat_contacts(user_id, name) 
WHERE status = 'active';

-- ============================================
-- 7. Bot 消息表索引优化
-- ============================================

-- 复合索引：Bot 消息历史
-- 场景：获取用户与 Bot 的对话历史
CREATE INDEX IF NOT EXISTS idx_chat_bot_messages_user_bot_time 
ON chat_bot_messages(user_id, bot_id, created_at DESC);

-- 复合索引：待处理 Bot 消息
-- 场景：获取待处理的 Bot 消息进行异步处理
CREATE INDEX IF NOT EXISTS idx_chat_bot_messages_pending 
ON chat_bot_messages(bot_id, created_at) 
WHERE status = 'pending';

-- ============================================
-- 8. RTC 房间表索引优化
-- ============================================

-- 复合索引：用户创建的活跃房间
-- 场景：获取用户创建的活跃房间
CREATE INDEX IF NOT EXISTS idx_chat_rtc_rooms_creator_active 
ON chat_rtc_rooms(creator_id, started_at DESC) 
WHERE status = 'active';

-- 复合索引：渠道房间查询
-- 场景：获取指定渠道的活跃房间
CREATE INDEX IF NOT EXISTS idx_chat_rtc_rooms_channel_active 
ON chat_rtc_rooms(channel_id, started_at DESC) 
WHERE status = 'active';

-- ============================================
-- 9. 第三方平台消息表索引优化
-- ============================================

-- 复合索引：平台消息查询
-- 场景：获取指定平台的同步消息
CREATE INDEX IF NOT EXISTS idx_chat_third_party_messages_platform_time 
ON chat_third_party_messages(platform, created_at DESC);

-- 复合索引：用户平台消息
-- 场景：获取用户的第三方平台消息
CREATE INDEX IF NOT EXISTS idx_chat_third_party_messages_user_platform 
ON chat_third_party_messages(from_user_id, platform, created_at DESC);

-- ============================================
-- 10. 删除低效的单独索引（已被复合索引覆盖）
-- ============================================

-- 注意：以下索引已被复合索引覆盖，可以考虑删除
-- 但在生产环境请谨慎操作，先验证查询性能

-- DROP INDEX IF EXISTS idx_chat_messages_from;
-- DROP INDEX IF EXISTS idx_chat_messages_to;
-- DROP INDEX IF EXISTS idx_chat_messages_group;

-- ============================================
-- 11. 索引统计信息更新
-- ============================================

-- 更新所有表的统计信息，帮助查询优化器选择最优执行计划
ANALYZE chat_messages;
ANALYZE chat_conversations;
ANALYZE chat_friends;
ANALYZE chat_friend_requests;
ANALYZE chat_group_members;
ANALYZE chat_contacts;
ANALYZE chat_bot_messages;
ANALYZE chat_rtc_rooms;
ANALYZE chat_third_party_messages;

-- ============================================
-- 12. 索引使用情况监控视图
-- ============================================

-- 创建视图用于监控索引使用情况
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ============================================
-- 13. 慢查询监控视图
-- ============================================

-- 创建视图用于监控慢查询
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE query LIKE '%chat_%'
ORDER BY mean_time DESC
LIMIT 50;

-- ============================================
-- 完成
-- ============================================

SELECT 'Database indexes optimized successfully!' AS status;

-- 显示创建的索引统计
SELECT 
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_chat_%'
ORDER BY tablename, indexname;
