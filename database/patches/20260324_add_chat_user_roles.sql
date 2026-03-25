ALTER TABLE chat_users
  ADD COLUMN IF NOT EXISTS roles JSONB NOT NULL DEFAULT '["user"]'::jsonb;

UPDATE chat_users
SET roles = '["admin"]'::jsonb
WHERE username = 'admin'
  AND (
    roles IS NULL
    OR jsonb_typeof(roles) <> 'array'
    OR NOT (roles ? 'admin')
  );

UPDATE chat_users
SET roles = '["user"]'::jsonb
WHERE roles IS NULL
   OR jsonb_typeof(roles) <> 'array'
   OR jsonb_array_length(roles) = 0;
