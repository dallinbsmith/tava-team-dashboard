-- Remove deprecated squad column from users table
-- This column was replaced by the user_squads junction table for many-to-many relationships

-- Drop the index first
DROP INDEX IF EXISTS idx_users_squad;

-- Drop the deprecated column
ALTER TABLE users DROP COLUMN IF EXISTS squad;
