package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	// Configure connection pool for production
	config.MaxConns = 25                      // Maximum connections
	config.MinConns = 5                       // Minimum idle connections
	config.MaxConnLifetime = 1 * time.Hour    // Max lifetime of a connection
	config.MaxConnIdleTime = 30 * time.Minute // Max idle time before closing
	config.HealthCheckPeriod = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return pool, nil
}

func RunMigrations(pool *pgxpool.Pool) error {
	ctx := context.Background()

	// Step 1: Create table if not exists (with supervisor_id for new installations)
	createTable := `
	CREATE TABLE IF NOT EXISTS users (
		id BIGSERIAL PRIMARY KEY,
		auth0_id VARCHAR(255) UNIQUE,
		email VARCHAR(255) NOT NULL UNIQUE,
		first_name VARCHAR(255) NOT NULL,
		last_name VARCHAR(255) NOT NULL,
		role VARCHAR(50) NOT NULL DEFAULT 'employee',
		department VARCHAR(255) NOT NULL DEFAULT '',
		avatar_url TEXT,
		supervisor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
		date_started TIMESTAMP WITH TIME ZONE,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
	);
	`

	_, err := pool.Exec(ctx, createTable)
	if err != nil {
		return fmt.Errorf("failed to create users table: %w", err)
	}

	// Step 2: Migration - rename manager_id to supervisor_id if manager_id exists
	renameColumn := `
	DO $$
	BEGIN
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'manager_id'
		) THEN
			ALTER TABLE users RENAME COLUMN manager_id TO supervisor_id;
		END IF;
	END $$;
	`
	_, err = pool.Exec(ctx, renameColumn)
	if err != nil {
		return fmt.Errorf("failed to rename manager_id column: %w", err)
	}

	// Step 3: Migration - update 'manager' role to 'supervisor'
	updateRole := `
	UPDATE users SET role = 'supervisor' WHERE role = 'manager';
	`
	_, err = pool.Exec(ctx, updateRole)
	if err != nil {
		return fmt.Errorf("failed to update roles: %w", err)
	}

	// Step 4: Create indexes (now that supervisor_id definitely exists)
	createIndexes := `
	CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);
	CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
	CREATE INDEX IF NOT EXISTS idx_users_supervisor_id ON users(supervisor_id);
	CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
	`
	_, err = pool.Exec(ctx, createIndexes)
	if err != nil {
		return fmt.Errorf("failed to create indexes: %w", err)
	}

	// Step 5: Create invitations table
	createInvitationsTable := `
	CREATE TABLE IF NOT EXISTS invitations (
		id BIGSERIAL PRIMARY KEY,
		email VARCHAR(255) NOT NULL,
		role VARCHAR(50) NOT NULL,
		token VARCHAR(64) NOT NULL UNIQUE,
		invited_by_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		status VARCHAR(50) NOT NULL DEFAULT 'pending',
		expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
		accepted_at TIMESTAMP WITH TIME ZONE,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
	);
	`
	_, err = pool.Exec(ctx, createInvitationsTable)
	if err != nil {
		return fmt.Errorf("failed to create invitations table: %w", err)
	}

	// Step 6: Create indexes for invitations
	createInvitationIndexes := `
	CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
	CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
	CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
	CREATE INDEX IF NOT EXISTS idx_invitations_invited_by_id ON invitations(invited_by_id);
	`
	_, err = pool.Exec(ctx, createInvitationIndexes)
	if err != nil {
		return fmt.Errorf("failed to create invitation indexes: %w", err)
	}

	// Step 7: Add Jira integration columns to users
	addJiraColumns := `
	DO $$
	BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'jira_domain'
		) THEN
			ALTER TABLE users ADD COLUMN jira_domain VARCHAR(255);
		END IF;
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'jira_email'
		) THEN
			ALTER TABLE users ADD COLUMN jira_email VARCHAR(255);
		END IF;
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'jira_api_token'
		) THEN
			ALTER TABLE users ADD COLUMN jira_api_token TEXT;
		END IF;
	END $$;
	`
	_, err = pool.Exec(ctx, addJiraColumns)
	if err != nil {
		return fmt.Errorf("failed to add Jira columns: %w", err)
	}

	// Step 7.5: Add title column to users
	addTitleColumn := `
	DO $$
	BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'title'
		) THEN
			ALTER TABLE users ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '';
		END IF;
	END $$;
	`
	_, err = pool.Exec(ctx, addTitleColumn)
	if err != nil {
		return fmt.Errorf("failed to add title column: %w", err)
	}

	// Step 8: Create org_chart_drafts table
	createOrgChartDraftsTable := `
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
	`
	_, err = pool.Exec(ctx, createOrgChartDraftsTable)
	if err != nil {
		return fmt.Errorf("failed to create org_chart_drafts table: %w", err)
	}

	// Step 9: Create org_chart_draft_changes table
	createOrgChartDraftChangesTable := `
	CREATE TABLE IF NOT EXISTS org_chart_draft_changes (
		id BIGSERIAL PRIMARY KEY,
		draft_id BIGINT NOT NULL REFERENCES org_chart_drafts(id) ON DELETE CASCADE,
		user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		original_supervisor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
		original_department VARCHAR(255),
		original_role VARCHAR(50),
		new_supervisor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
		new_department VARCHAR(255),
		new_role VARCHAR(50),
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
		UNIQUE(draft_id, user_id)
	);
	`
	_, err = pool.Exec(ctx, createOrgChartDraftChangesTable)
	if err != nil {
		return fmt.Errorf("failed to create org_chart_draft_changes table: %w", err)
	}

	// Step 10: Create indexes for org chart tables
	createOrgChartIndexes := `
	CREATE INDEX IF NOT EXISTS idx_org_chart_drafts_created_by_id ON org_chart_drafts(created_by_id);
	CREATE INDEX IF NOT EXISTS idx_org_chart_drafts_status ON org_chart_drafts(status);
	CREATE INDEX IF NOT EXISTS idx_org_chart_draft_changes_draft_id ON org_chart_draft_changes(draft_id);
	CREATE INDEX IF NOT EXISTS idx_org_chart_draft_changes_user_id ON org_chart_draft_changes(user_id);
	`
	_, err = pool.Exec(ctx, createOrgChartIndexes)
	if err != nil {
		return fmt.Errorf("failed to create org chart indexes: %w", err)
	}

	// Step 11: Add Jira OAuth columns to users (migrating from API token auth)
	addJiraOAuthColumns := `
	DO $$
	BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'jira_oauth_access_token'
		) THEN
			ALTER TABLE users ADD COLUMN jira_oauth_access_token TEXT;
		END IF;
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'jira_oauth_refresh_token'
		) THEN
			ALTER TABLE users ADD COLUMN jira_oauth_refresh_token TEXT;
		END IF;
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'jira_oauth_token_expires_at'
		) THEN
			ALTER TABLE users ADD COLUMN jira_oauth_token_expires_at TIMESTAMP WITH TIME ZONE;
		END IF;
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'jira_cloud_id'
		) THEN
			ALTER TABLE users ADD COLUMN jira_cloud_id VARCHAR(255);
		END IF;
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'jira_site_url'
		) THEN
			ALTER TABLE users ADD COLUMN jira_site_url VARCHAR(255);
		END IF;
	END $$;
	`
	_, err = pool.Exec(ctx, addJiraOAuthColumns)
	if err != nil {
		return fmt.Errorf("failed to add Jira OAuth columns: %w", err)
	}

	// Step 12: Create org_jira_settings table for organization-wide Jira connection
	createOrgJiraSettingsTable := `
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
	`
	_, err = pool.Exec(ctx, createOrgJiraSettingsTable)
	if err != nil {
		return fmt.Errorf("failed to create org_jira_settings table: %w", err)
	}

	// Step 13: Add jira_account_id column to users for matching to Jira users
	addJiraAccountIdColumn := `
	DO $$
	BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'jira_account_id'
		) THEN
			ALTER TABLE users ADD COLUMN jira_account_id VARCHAR(255);
		END IF;
	END $$;
	`
	_, err = pool.Exec(ctx, addJiraAccountIdColumn)
	if err != nil {
		return fmt.Errorf("failed to add jira_account_id column: %w", err)
	}

	// Step 14: Create index for jira_account_id
	createJiraAccountIdIndex := `
	CREATE INDEX IF NOT EXISTS idx_users_jira_account_id ON users(jira_account_id);
	`
	_, err = pool.Exec(ctx, createJiraAccountIdIndex)
	if err != nil {
		return fmt.Errorf("failed to create jira_account_id index: %w", err)
	}

	// Step 15: Create tasks table for calendar
	createTasksTable := `
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
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
	);
	`
	_, err = pool.Exec(ctx, createTasksTable)
	if err != nil {
		return fmt.Errorf("failed to create tasks table: %w", err)
	}

	// Step 16: Create indexes for tasks
	createTaskIndexes := `
	CREATE INDEX IF NOT EXISTS idx_tasks_created_by_id ON tasks(created_by_id);
	CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user_id ON tasks(assigned_user_id);
	CREATE INDEX IF NOT EXISTS idx_tasks_assigned_supervisor_id ON tasks(assigned_supervisor_id);
	CREATE INDEX IF NOT EXISTS idx_tasks_assigned_department ON tasks(assigned_department);
	CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
	CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
	`
	_, err = pool.Exec(ctx, createTaskIndexes)
	if err != nil {
		return fmt.Errorf("failed to create task indexes: %w", err)
	}

	// Step 17: Create meetings table for calendar
	createMeetingsTable := `
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
	`
	_, err = pool.Exec(ctx, createMeetingsTable)
	if err != nil {
		return fmt.Errorf("failed to create meetings table: %w", err)
	}

	// Step 18: Create meeting_attendees table
	createMeetingAttendeesTable := `
	CREATE TABLE IF NOT EXISTS meeting_attendees (
		id BIGSERIAL PRIMARY KEY,
		meeting_id BIGINT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
		user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		response_status VARCHAR(20) NOT NULL DEFAULT 'pending',
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
		UNIQUE(meeting_id, user_id)
	);
	`
	_, err = pool.Exec(ctx, createMeetingAttendeesTable)
	if err != nil {
		return fmt.Errorf("failed to create meeting_attendees table: %w", err)
	}

	// Step 19: Create indexes for meetings and meeting_attendees
	createMeetingIndexes := `
	CREATE INDEX IF NOT EXISTS idx_meetings_created_by_id ON meetings(created_by_id);
	CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
	CREATE INDEX IF NOT EXISTS idx_meetings_end_time ON meetings(end_time);
	CREATE INDEX IF NOT EXISTS idx_meetings_parent_meeting_id ON meetings(parent_meeting_id);
	CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
	CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON meeting_attendees(user_id);
	`
	_, err = pool.Exec(ctx, createMeetingIndexes)
	if err != nil {
		return fmt.Errorf("failed to create meeting indexes: %w", err)
	}

	// Step 20: Create time_off_requests table
	createTimeOffRequestsTable := `
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
	`
	_, err = pool.Exec(ctx, createTimeOffRequestsTable)
	if err != nil {
		return fmt.Errorf("failed to create time_off_requests table: %w", err)
	}

	// Step 21: Create indexes for time_off_requests
	createTimeOffIndexes := `
	CREATE INDEX IF NOT EXISTS idx_time_off_user_id ON time_off_requests(user_id);
	CREATE INDEX IF NOT EXISTS idx_time_off_status ON time_off_requests(status);
	CREATE INDEX IF NOT EXISTS idx_time_off_dates ON time_off_requests(start_date, end_date);
	CREATE INDEX IF NOT EXISTS idx_time_off_reviewer_id ON time_off_requests(reviewer_id);
	`
	_, err = pool.Exec(ctx, createTimeOffIndexes)
	if err != nil {
		return fmt.Errorf("failed to create time_off_requests indexes: %w", err)
	}

	// Step 22: Add squad column to users
	addSquadColumn := `
	DO $$
	BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'squad'
		) THEN
			ALTER TABLE users ADD COLUMN squad VARCHAR(255) NOT NULL DEFAULT '';
		END IF;
	END $$;
	`
	_, err = pool.Exec(ctx, addSquadColumn)
	if err != nil {
		return fmt.Errorf("failed to add squad column: %w", err)
	}

	// Step 23: Create index for squad column
	createSquadIndex := `
	CREATE INDEX IF NOT EXISTS idx_users_squad ON users(squad);
	`
	_, err = pool.Exec(ctx, createSquadIndex)
	if err != nil {
		return fmt.Errorf("failed to create squad index: %w", err)
	}

	// Step 24: Add squad columns to org_chart_draft_changes
	addSquadToDraftChanges := `
	DO $$
	BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'org_chart_draft_changes' AND column_name = 'original_squad'
		) THEN
			ALTER TABLE org_chart_draft_changes ADD COLUMN original_squad VARCHAR(255);
		END IF;
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'org_chart_draft_changes' AND column_name = 'new_squad'
		) THEN
			ALTER TABLE org_chart_draft_changes ADD COLUMN new_squad VARCHAR(255);
		END IF;
	END $$;
	`
	_, err = pool.Exec(ctx, addSquadToDraftChanges)
	if err != nil {
		return fmt.Errorf("failed to add squad columns to draft changes: %w", err)
	}

	// Step 25: Create squads table for many-to-many relationship
	createSquadsTable := `
	CREATE TABLE IF NOT EXISTS squads (
		id BIGSERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL UNIQUE,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
	);
	`
	_, err = pool.Exec(ctx, createSquadsTable)
	if err != nil {
		return fmt.Errorf("failed to create squads table: %w", err)
	}

	// Step 26: Create user_squads junction table
	createUserSquadsTable := `
	CREATE TABLE IF NOT EXISTS user_squads (
		id BIGSERIAL PRIMARY KEY,
		user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		squad_id BIGINT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
		UNIQUE(user_id, squad_id)
	);
	`
	_, err = pool.Exec(ctx, createUserSquadsTable)
	if err != nil {
		return fmt.Errorf("failed to create user_squads table: %w", err)
	}

	// Step 27: Create indexes for user_squads
	createUserSquadsIndexes := `
	CREATE INDEX IF NOT EXISTS idx_user_squads_user_id ON user_squads(user_id);
	CREATE INDEX IF NOT EXISTS idx_user_squads_squad_id ON user_squads(squad_id);
	`
	_, err = pool.Exec(ctx, createUserSquadsIndexes)
	if err != nil {
		return fmt.Errorf("failed to create user_squads indexes: %w", err)
	}

	// Step 28: Migrate existing squad data from users.squad to new tables
	migrateSquadData := `
	-- Insert unique squad names into squads table
	INSERT INTO squads (name)
	SELECT DISTINCT squad FROM users WHERE squad != '' AND squad IS NOT NULL
	ON CONFLICT (name) DO NOTHING;

	-- Create user_squads entries from existing data
	INSERT INTO user_squads (user_id, squad_id)
	SELECT u.id, s.id FROM users u
	JOIN squads s ON s.name = u.squad
	WHERE u.squad != '' AND u.squad IS NOT NULL
	ON CONFLICT (user_id, squad_id) DO NOTHING;
	`
	_, err = pool.Exec(ctx, migrateSquadData)
	if err != nil {
		return fmt.Errorf("failed to migrate squad data: %w", err)
	}

	// Step 29: Add squad ID arrays to org_chart_draft_changes
	addSquadIdsToDraftChanges := `
	DO $$
	BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'org_chart_draft_changes' AND column_name = 'original_squad_ids'
		) THEN
			ALTER TABLE org_chart_draft_changes ADD COLUMN original_squad_ids BIGINT[];
		END IF;
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'org_chart_draft_changes' AND column_name = 'new_squad_ids'
		) THEN
			ALTER TABLE org_chart_draft_changes ADD COLUMN new_squad_ids BIGINT[];
		END IF;
	END $$;
	`
	_, err = pool.Exec(ctx, addSquadIdsToDraftChanges)
	if err != nil {
		return fmt.Errorf("failed to add squad ID arrays to draft changes: %w", err)
	}

	// Step 30: Add department and squad_ids to invitations table
	addInvitationFields := `
	DO $$
	BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'invitations' AND column_name = 'department'
		) THEN
			ALTER TABLE invitations ADD COLUMN department VARCHAR(255);
		END IF;
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'invitations' AND column_name = 'squad_ids'
		) THEN
			ALTER TABLE invitations ADD COLUMN squad_ids BIGINT[];
		END IF;
	END $$;
	`
	_, err = pool.Exec(ctx, addInvitationFields)
	if err != nil {
		return fmt.Errorf("failed to add department and squad_ids to invitations: %w", err)
	}

	// Step 31: Add assigned_squad_id column to tasks table (fixing column name mismatch)
	addAssignedSquadIdToTasks := `
	DO $$
	BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'tasks' AND column_name = 'assigned_squad_id'
		) THEN
			ALTER TABLE tasks ADD COLUMN assigned_squad_id BIGINT REFERENCES squads(id) ON DELETE SET NULL;
		END IF;
	END $$;
	`
	_, err = pool.Exec(ctx, addAssignedSquadIdToTasks)
	if err != nil {
		return fmt.Errorf("failed to add assigned_squad_id to tasks: %w", err)
	}

	// Step 32: Create index for assigned_squad_id on tasks
	createAssignedSquadIdIndex := `
	CREATE INDEX IF NOT EXISTS idx_tasks_assigned_squad_id ON tasks(assigned_squad_id);
	`
	_, err = pool.Exec(ctx, createAssignedSquadIdIndex)
	if err != nil {
		return fmt.Errorf("failed to create assigned_squad_id index: %w", err)
	}

	return nil
}
