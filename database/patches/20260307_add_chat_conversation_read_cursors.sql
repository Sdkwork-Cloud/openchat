-- ============================================
-- Patch: add chat_conversation_read_cursors for device-level sync cursor
-- Date: 2026-03-07
-- Notes:
--   - Strict migration for new deployment baseline.
-- ============================================

BEGIN;

CREATE TABLE chat_conversation_read_cursors (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    user_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('single', 'group')),
    last_read_seq BIGINT NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id, target_id, type)
);

CREATE INDEX idx_chat_conv_read_cursors_user_device
    ON chat_conversation_read_cursors(user_id, device_id);

CREATE INDEX idx_chat_conv_read_cursors_user_target
    ON chat_conversation_read_cursors(user_id, type, target_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_conversation_read_cursors_updated_at
    BEFORE UPDATE ON chat_conversation_read_cursors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
