CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id BIGINT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  message_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  emoji VARCHAR(32) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_message_reactions_message_user_emoji
  ON chat_message_reactions (message_id, user_id, emoji);

CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_message_emoji
  ON chat_message_reactions (message_id, emoji);

CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_message
  ON chat_message_reactions (message_id);
