-- Add is_active field to users table for soft delete functionality
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add index for filtering active users
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
