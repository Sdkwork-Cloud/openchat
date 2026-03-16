-- ============================================
-- Patch: add chat_messages IM identifier indexes
-- Date: 2026-03-06
-- Notes:
--   - Strict migration for new deployment baseline.
-- ============================================

BEGIN;

CREATE INDEX idx_chat_messages_im_message_id
    ON chat_messages ((extra->>'imMessageId'))
    WHERE extra ? 'imMessageId';

CREATE INDEX idx_chat_messages_im_client_msg_no
    ON chat_messages ((extra->>'imClientMsgNo'))
    WHERE extra ? 'imClientMsgNo';

COMMIT;
