-- Add time fields to tasks table for event support
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS all_day BOOLEAN NOT NULL DEFAULT TRUE;

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_start_time ON tasks(start_time);
CREATE INDEX IF NOT EXISTS idx_tasks_end_time ON tasks(end_time);
