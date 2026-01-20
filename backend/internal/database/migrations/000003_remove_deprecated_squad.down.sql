-- Restore deprecated squad column (for rollback purposes only)
-- Note: This will not restore any data that was in the column

ALTER TABLE users ADD COLUMN IF NOT EXISTS squad VARCHAR(255) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_users_squad ON users(squad);
