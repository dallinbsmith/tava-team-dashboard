-- Add missing indexes for common query patterns

-- Composite index for time off requests reviewed by a specific reviewer at a specific time
CREATE INDEX IF NOT EXISTS idx_time_off_reviewer_reviewed_at
    ON time_off_requests(reviewer_id, reviewed_at)
    WHERE reviewer_id IS NOT NULL;

-- Partial index for incomplete tasks ordered by due date (common query pattern)
CREATE INDEX IF NOT EXISTS idx_tasks_pending_due_date
    ON tasks(due_date)
    WHERE status != 'completed';

-- Composite index for org chart draft changes sorted by update time
CREATE INDEX IF NOT EXISTS idx_org_chart_draft_changes_draft_updated
    ON org_chart_draft_changes(draft_id, updated_at DESC);

-- Composite index for meetings in a time range (calendar queries)
CREATE INDEX IF NOT EXISTS idx_meetings_time_range
    ON meetings(start_time, end_time);

-- Index for invitations by status and expiry (for cleanup queries)
CREATE INDEX IF NOT EXISTS idx_invitations_status_expires
    ON invitations(status, expires_at)
    WHERE status = 'pending';
