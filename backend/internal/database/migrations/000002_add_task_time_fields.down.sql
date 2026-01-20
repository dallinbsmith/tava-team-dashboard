-- Remove time fields from tasks table
DROP INDEX IF EXISTS idx_tasks_start_time;
DROP INDEX IF EXISTS idx_tasks_end_time;

ALTER TABLE tasks
    DROP COLUMN IF EXISTS start_time,
    DROP COLUMN IF EXISTS end_time,
    DROP COLUMN IF EXISTS all_day;
