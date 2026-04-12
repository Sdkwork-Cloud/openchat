ALTER TABLE craw_agents
  ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_craw_agents_owner_email
  ON craw_agents(owner_email);
