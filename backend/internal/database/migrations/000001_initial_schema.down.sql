-- Drop all tables in reverse dependency order

DROP TABLE IF EXISTS oauth_states;
DROP TABLE IF EXISTS time_off_requests;
DROP TABLE IF EXISTS meeting_attendees;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS org_jira_settings;
DROP TABLE IF EXISTS org_chart_draft_changes;
DROP TABLE IF EXISTS org_chart_drafts;
DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS user_squads;
DROP TABLE IF EXISTS squads;
DROP TABLE IF EXISTS users;
