-- ============================================
-- 消息全文搜索支持
-- PostgreSQL 全文搜索配置
-- ============================================

-- 1. 添加搜索向量列到消息表
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. 创建 GIN 索引（用于快速全文搜索）
CREATE INDEX IF NOT EXISTS idx_messages_search_vector
ON chat_messages USING GIN (search_vector);

-- 3. 创建触发器函数：自动更新搜索向量
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- 从 JSONB 内容中提取文本并转换为搜索向量
    NEW.search_vector := 
        setweight(to_tsvector('chinese', COALESCE(NEW.content->>'text', '')), 'A') ||
        setweight(to_tsvector('chinese', COALESCE(NEW.content->>'title', '')), 'B') ||
        setweight(to_tsvector('chinese', COALESCE(NEW.content->>'description', '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建触发器
DROP TRIGGER IF EXISTS trigger_update_message_search_vector ON chat_messages;
CREATE TRIGGER trigger_update_message_search_vector
    BEFORE INSERT OR UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_search_vector();

-- 5. 为现有数据填充搜索向量
UPDATE chat_messages
SET search_vector = 
    setweight(to_tsvector('chinese', COALESCE(content->>'text', '')), 'A') ||
    setweight(to_tsvector('chinese', COALESCE(content->>'title', '')), 'B') ||
    setweight(to_tsvector('chinese', COALESCE(content->>'description', '')), 'C')
WHERE search_vector IS NULL;

-- ============================================
-- 使用示例
-- ============================================

-- 全文搜索示例
-- SELECT * FROM chat_messages
-- WHERE search_vector @@ to_tsquery('chinese', '关键词1 & 关键词2')
-- ORDER BY ts_rank(search_vector, to_tsquery('chinese', '关键词1 & 关键词2')) DESC;

-- 注意：中文分词需要安装额外的扩展
-- 对于 PostgreSQL 12+，可以使用以下方式启用中文支持：
-- 1. 安装 zhparser 扩展（需要编译安装）
-- 2. 或者使用 pg_jieba 扩展
-- 3. 或者使用简单的字符分割策略

-- ============================================
-- 回滚脚本（如果需要）
-- ============================================
-- DROP TRIGGER IF EXISTS trigger_update_message_search_vector ON chat_messages;
-- DROP FUNCTION IF EXISTS update_message_search_vector();
-- DROP INDEX IF EXISTS idx_messages_search_vector;
-- ALTER TABLE chat_messages DROP COLUMN IF EXISTS search_vector;
