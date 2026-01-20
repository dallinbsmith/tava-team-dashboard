-- Remove indexes added in 000004

DROP INDEX IF EXISTS idx_time_off_reviewer_reviewed_at;
DROP INDEX IF EXISTS idx_tasks_pending_due_date;
DROP INDEX IF EXISTS idx_org_chart_draft_changes_draft_updated;
DROP INDEX IF EXISTS idx_meetings_time_range;
DROP INDEX IF EXISTS idx_invitations_status_expires;
