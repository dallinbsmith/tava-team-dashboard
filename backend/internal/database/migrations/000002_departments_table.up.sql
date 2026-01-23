-- Create departments table for standalone department management
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

-- Migrate existing departments from users table
INSERT INTO departments (name)
SELECT DISTINCT department
FROM users
WHERE department IS NOT NULL AND department != ''
ON CONFLICT (name) DO NOTHING;
