-- Initial schema migration
-- This is a squashed migration containing the complete database schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    auth0_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    title VARCHAR(255) NOT NULL DEFAULT '',
    department VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url TEXT,
    supervisor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    date_started TIMESTAMP WITH TIME ZONE,
    -- Legacy squad column (kept for compatibility, use user_squads table instead)
    squad VARCHAR(255) NOT NULL DEFAULT '',
    -- Jira integration fields
    jira_domain VARCHAR(255),
    jira_email VARCHAR(255),
    jira_api_token TEXT,
    jira_account_id VARCHAR(255),
    -- Jira OAuth fields
    jira_oauth_access_token TEXT,
    jira_oauth_refresh_token TEXT,
    jira_oauth_token_expires_at TIMESTAMP WITH TIME ZONE,
    jira_cloud_id VARCHAR(255),
    jira_site_url VARCHAR(255),
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_supervisor_id ON users(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_squad ON users(squad);
CREATE INDEX IF NOT EXISTS idx_users_jira_account_id ON users(jira_account_id);

-- Squads table (for many-to-many relationship)
CREATE TABLE IF NOT EXISTS squads (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User-Squads junction table
CREATE TABLE IF NOT EXISTS user_squads (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    squad_id BIGINT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, squad_id)
);

CREATE INDEX IF NOT EXISTS idx_user_squads_user_id ON user_squads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_squads_squad_id ON user_squads(squad_id);

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    invited_by_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    department VARCHAR(255),
    squad_ids BIGINT[],
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by_id ON invitations(invited_by_id);

-- Org chart drafts table
CREATE TABLE IF NOT EXISTS org_chart_drafts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_chart_drafts_created_by_id ON org_chart_drafts(created_by_id);
CREATE INDEX IF NOT EXISTS idx_org_chart_drafts_status ON org_chart_drafts(status);

-- Org chart draft changes table
CREATE TABLE IF NOT EXISTS org_chart_draft_changes (
    id BIGSERIAL PRIMARY KEY,
    draft_id BIGINT NOT NULL REFERENCES org_chart_drafts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_supervisor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    original_department VARCHAR(255),
    original_role VARCHAR(50),
    original_squad VARCHAR(255),
    original_squad_ids BIGINT[],
    new_supervisor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    new_department VARCHAR(255),
    new_role VARCHAR(50),
    new_squad VARCHAR(255),
    new_squad_ids BIGINT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(draft_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_chart_draft_changes_draft_id ON org_chart_draft_changes(draft_id);
CREATE INDEX IF NOT EXISTS idx_org_chart_draft_changes_user_id ON org_chart_draft_changes(user_id);

-- Organization Jira settings table
CREATE TABLE IF NOT EXISTS org_jira_settings (
    id BIGSERIAL PRIMARY KEY,
    oauth_access_token TEXT NOT NULL,
    oauth_refresh_token TEXT NOT NULL,
    oauth_token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cloud_id VARCHAR(255) NOT NULL,
    site_url VARCHAR(255) NOT NULL,
    site_name VARCHAR(255),
    configured_by_id BIGINT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_type VARCHAR(20) NOT NULL DEFAULT 'user',
    assigned_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    assigned_supervisor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    assigned_department VARCHAR(255),
    assigned_squad_id BIGINT REFERENCES squads(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_created_by_id ON tasks(created_by_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user_id ON tasks(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_supervisor_id ON tasks(assigned_supervisor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_department ON tasks(assigned_department);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_squad_id ON tasks(assigned_squad_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recurrence_type VARCHAR(20),
    recurrence_interval INT DEFAULT 1,
    recurrence_end_date TIMESTAMP WITH TIME ZONE,
    recurrence_days_of_week INT[],
    recurrence_day_of_month INT,
    parent_meeting_id BIGINT REFERENCES meetings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_created_by_id ON meetings(created_by_id);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_end_time ON meetings(end_time);
CREATE INDEX IF NOT EXISTS idx_meetings_parent_meeting_id ON meetings(parent_meeting_id);

-- Meeting attendees table
CREATE TABLE IF NOT EXISTS meeting_attendees (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON meeting_attendees(user_id);

-- Time off requests table
CREATE TABLE IF NOT EXISTS time_off_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewer_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_off_user_id ON time_off_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_time_off_status ON time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_time_off_dates ON time_off_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_time_off_reviewer_id ON time_off_requests(reviewer_id);

-- OAuth state store table (for Jira OAuth flow)
CREATE TABLE IF NOT EXISTS oauth_states (
    id BIGSERIAL PRIMARY KEY,
    state VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
