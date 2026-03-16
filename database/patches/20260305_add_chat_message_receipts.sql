-- ============================================
-- Patch: add chat_message_receipts table and indexes
-- Date: 2026-03-05
-- Notes:
--   - Strict migration for new deployment baseline.
-- ============================================

BEGIN;

CREATE TABLE chat_message_receipts (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    message_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    source VARCHAR(32),
    extra JSONB,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

ALTER TABLE chat_message_receipts
    ALTER COLUMN status SET DEFAULT 'sent';

ALTER TABLE chat_message_receipts
    ADD CONSTRAINT chk_chat_message_receipts_status
    CHECK (status IN ('sent', 'delivered', 'read'));

CREATE INDEX idx_chat_message_receipts_message
    ON chat_message_receipts(message_id);

CREATE INDEX idx_chat_message_receipts_user_status
    ON chat_message_receipts(user_id, status);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_message_receipts_updated_at
    BEFORE UPDATE ON chat_message_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
