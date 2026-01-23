package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// Column lists for consistent SELECT statements
// Note: squad column is deprecated - squads are now loaded via user_squads junction table
const (
	userColumns = `id, COALESCE(auth0_id, ''), email, first_name, last_name, role, title, department,
		avatar_url, supervisor_id, date_started, is_active, created_at, updated_at, jira_account_id`
	userColumnsWithJira = userColumns + `, jira_domain, jira_email, jira_api_token,
		jira_oauth_access_token, jira_oauth_refresh_token, jira_oauth_token_expires_at,
		jira_cloud_id, jira_site_url`
)

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

// scanUser scans a row into a User struct
// Note: Squads are loaded separately via SquadRepository
func scanUser(row pgx.Row) (*models.User, error) {
	var user models.User
	err := row.Scan(
		&user.ID, &user.Auth0ID, &user.Email, &user.FirstName, &user.LastName,
		&user.Role, &user.Title, &user.Department, &user.AvatarURL, &user.SupervisorID,
		&user.DateStarted, &user.IsActive, &user.CreatedAt, &user.UpdatedAt, &user.JiraAccountID,
	)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// scanUserWithJira scans a row into a User struct including Jira fields
// Note: Squads are loaded separately via SquadRepository
func scanUserWithJira(row pgx.Row) (*models.User, error) {
	var user models.User
	err := row.Scan(
		&user.ID, &user.Auth0ID, &user.Email, &user.FirstName, &user.LastName,
		&user.Role, &user.Title, &user.Department, &user.AvatarURL, &user.SupervisorID,
		&user.DateStarted, &user.IsActive, &user.CreatedAt, &user.UpdatedAt, &user.JiraAccountID,
		&user.JiraDomain, &user.JiraEmail, &user.JiraAPIToken,
		&user.JiraOAuthAccessToken, &user.JiraOAuthRefreshToken, &user.JiraOAuthTokenExpires,
		&user.JiraCloudID, &user.JiraSiteURL,
	)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// scanUsers scans multiple rows into a slice of Users
// Note: Squads are loaded separately via SquadRepository
func scanUsers(rows pgx.Rows) ([]models.User, error) {
	var users []models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID, &user.Auth0ID, &user.Email, &user.FirstName, &user.LastName,
			&user.Role, &user.Title, &user.Department, &user.AvatarURL, &user.SupervisorID,
			&user.DateStarted, &user.IsActive, &user.CreatedAt, &user.UpdatedAt, &user.JiraAccountID,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, nil
}

func (r *UserRepository) GetByID(ctx context.Context, id int64) (*models.User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE id = $1`
	user, err := scanUser(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}
	return user, nil
}

// GetByIDs retrieves multiple users by their IDs in a single query (batch loading)
// This is used by dataloaders to prevent N+1 query problems
func (r *UserRepository) GetByIDs(ctx context.Context, ids []int64) ([]models.User, error) {
	if len(ids) == 0 {
		return []models.User{}, nil
	}

	query := `SELECT ` + userColumns + ` FROM users WHERE id = ANY($1)`
	rows, err := r.pool.Query(ctx, query, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to get users by IDs: %w", err)
	}
	defer rows.Close()

	users, err := scanUsers(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan users: %w", err)
	}
	return users, nil
}

func (r *UserRepository) GetByAuth0ID(ctx context.Context, auth0ID string) (*models.User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE auth0_id = $1`
	user, err := scanUser(r.pool.QueryRow(ctx, query, auth0ID))
	if err != nil {
		return nil, fmt.Errorf("failed to get user by Auth0 ID: %w", err)
	}
	return user, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE email = $1`
	user, err := scanUser(r.pool.QueryRow(ctx, query, email))
	if err != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	return user, nil
}

func (r *UserRepository) GetDirectReportsBySupervisorID(ctx context.Context, supervisorID int64) ([]models.User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE supervisor_id = $1 AND is_active = true ORDER BY last_name, first_name`
	rows, err := r.pool.Query(ctx, query, supervisorID)
	if err != nil {
		return nil, fmt.Errorf("failed to get direct reports by supervisor ID: %w", err)
	}
	defer rows.Close()

	users, err := scanUsers(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan direct report: %w", err)
	}
	return users, nil
}

func (r *UserRepository) GetAllSupervisors(ctx context.Context) ([]models.User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE role = 'supervisor' AND is_active = true ORDER BY last_name, first_name`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get supervisors: %w", err)
	}
	defer rows.Close()

	users, err := scanUsers(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan supervisor: %w", err)
	}
	return users, nil
}

func (r *UserRepository) GetAll(ctx context.Context) ([]models.User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE is_active = true ORDER BY role DESC, last_name, first_name`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get all users: %w", err)
	}
	defer rows.Close()

	users, err := scanUsers(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan user: %w", err)
	}
	return users, nil
}

func (r *UserRepository) Create(ctx context.Context, req *models.CreateUserRequest, auth0ID string) (*models.User, error) {
	// Note: Squad is now handled separately via SquadRepository.SetUserSquads
	query := `
		INSERT INTO users (auth0_id, email, first_name, last_name, role, title, department, avatar_url, supervisor_id, date_started)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, NOW()))
		RETURNING ` + userColumns

	user, err := scanUser(r.pool.QueryRow(ctx, query,
		auth0ID, req.Email, req.FirstName, req.LastName, req.Role,
		req.Title, req.Department, req.AvatarURL, req.SupervisorID, req.DateStarted,
	))
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	return user, nil
}

func (r *UserRepository) CreateOrUpdate(ctx context.Context, auth0ID, email, firstName, lastName string) (*models.User, error) {
	// First, check if user exists by email (handles invitation-created users)
	existingByEmail, _ := r.GetByEmail(ctx, email)
	if existingByEmail != nil {
		// User exists with this email - update their auth0_id and name if needed
		query := `
			UPDATE users SET
				auth0_id = $2,
				first_name = CASE WHEN first_name = '' THEN $3 ELSE first_name END,
				last_name = CASE WHEN last_name = '' THEN $4 ELSE last_name END,
				updated_at = NOW()
			WHERE id = $1
			RETURNING ` + userColumns
		user, err := scanUser(r.pool.QueryRow(ctx, query, existingByEmail.ID, auth0ID, firstName, lastName))
		if err != nil {
			return nil, fmt.Errorf("failed to update existing user: %w", err)
		}
		return user, nil
	}

	// No existing user by email, try insert with ON CONFLICT for auth0_id
	query := `
		INSERT INTO users (auth0_id, email, first_name, last_name, role, title, department)
		VALUES ($1, $2, $3, $4, 'employee', '', '')
		ON CONFLICT (auth0_id) DO UPDATE SET
			email = EXCLUDED.email,
			first_name = EXCLUDED.first_name,
			last_name = EXCLUDED.last_name,
			updated_at = NOW()
		RETURNING ` + userColumns

	user, err := scanUser(r.pool.QueryRow(ctx, query, auth0ID, email, firstName, lastName))
	if err != nil {
		return nil, fmt.Errorf("failed to create or update user: %w", err)
	}
	return user, nil
}

func (r *UserRepository) Update(ctx context.Context, id int64, req *models.UpdateUserRequest) (*models.User, error) {
	// Note: Squad is now handled separately via SquadRepository.SetUserSquads
	query := `
		UPDATE users SET
			first_name = COALESCE($2, first_name),
			last_name = COALESCE($3, last_name),
			title = COALESCE($4, title),
			department = COALESCE($5, department),
			supervisor_id = COALESCE($6, supervisor_id),
			avatar_url = COALESCE($7, avatar_url),
			updated_at = NOW()
		WHERE id = $1
		RETURNING ` + userColumns

	user, err := scanUser(r.pool.QueryRow(ctx, query,
		id, req.FirstName, req.LastName, req.Title, req.Department,
		req.SupervisorID, req.AvatarURL,
	))
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	return user, nil
}

func (r *UserRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	return nil
}

// GetWithJiraCredentials returns a user with their Jira credentials
func (r *UserRepository) GetWithJiraCredentials(ctx context.Context, id int64) (*models.User, error) {
	query := `SELECT ` + userColumnsWithJira + ` FROM users WHERE id = $1`
	user, err := scanUserWithJira(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, fmt.Errorf("failed to get user with Jira credentials: %w", err)
	}
	return user, nil
}

// UpdateJiraSettings updates the Jira integration settings for a user
func (r *UserRepository) UpdateJiraSettings(ctx context.Context, id int64, req *models.UpdateJiraSettingsRequest) error {
	query := `
		UPDATE users SET
			jira_domain = $2,
			jira_email = $3,
			jira_api_token = $4,
			updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, id, req.JiraDomain, req.JiraEmail, req.JiraAPIToken)
	if err != nil {
		return fmt.Errorf("failed to update Jira settings: %w", err)
	}
	return nil
}

// ClearJiraSettings removes Jira credentials for a user (both legacy and OAuth)
func (r *UserRepository) ClearJiraSettings(ctx context.Context, id int64) error {
	query := `
		UPDATE users SET
			jira_domain = NULL,
			jira_email = NULL,
			jira_api_token = NULL,
			jira_oauth_access_token = NULL,
			jira_oauth_refresh_token = NULL,
			jira_oauth_token_expires_at = NULL,
			jira_cloud_id = NULL,
			jira_site_url = NULL,
			updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to clear Jira settings: %w", err)
	}
	return nil
}

// SaveJiraOAuthTokens saves OAuth tokens for a user
func (r *UserRepository) SaveJiraOAuthTokens(ctx context.Context, id int64, tokens *models.JiraOAuthTokens) error {
	query := `
		UPDATE users SET
			jira_oauth_access_token = $2,
			jira_oauth_refresh_token = $3,
			jira_oauth_token_expires_at = $4,
			jira_cloud_id = $5,
			jira_site_url = $6,
			updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, id, tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresAt, tokens.CloudID, tokens.SiteURL)
	if err != nil {
		return fmt.Errorf("failed to save Jira OAuth tokens: %w", err)
	}
	return nil
}

// UpdateJiraOAuthAccessToken updates only the access token and expiry (after refresh)
func (r *UserRepository) UpdateJiraOAuthAccessToken(ctx context.Context, id int64, accessToken string, expiresAt time.Time) error {
	query := `
		UPDATE users SET
			jira_oauth_access_token = $2,
			jira_oauth_token_expires_at = $3,
			updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, id, accessToken, expiresAt)
	if err != nil {
		return fmt.Errorf("failed to update Jira access token: %w", err)
	}
	return nil
}

// UpdateJiraAccountID updates the Jira account ID for a user
func (r *UserRepository) UpdateJiraAccountID(ctx context.Context, id int64, jiraAccountID *string) error {
	query := `
		UPDATE users SET
			jira_account_id = $2,
			updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, id, jiraAccountID)
	if err != nil {
		return fmt.Errorf("failed to update Jira account ID: %w", err)
	}
	return nil
}

// GetByJiraAccountID returns a user by their Jira account ID
func (r *UserRepository) GetByJiraAccountID(ctx context.Context, jiraAccountID string) (*models.User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE jira_account_id = $1`
	user, err := scanUser(r.pool.QueryRow(ctx, query, jiraAccountID))
	if err != nil {
		return nil, fmt.Errorf("failed to get user by Jira account ID: %w", err)
	}
	return user, nil
}

// GetAllSquads is deprecated - use SquadRepository.GetAll instead
// This method is kept for backward compatibility during migration
func (r *UserRepository) GetAllSquads(ctx context.Context) ([]string, error) {
	query := `SELECT name FROM squads ORDER BY name`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get all squads: %w", err)
	}
	defer rows.Close()

	var squads []string
	for rows.Next() {
		var squad string
		if err := rows.Scan(&squad); err != nil {
			return nil, fmt.Errorf("failed to scan squad: %w", err)
		}
		squads = append(squads, squad)
	}
	return squads, nil
}

// GetAllDepartments returns all unique department names from users
func (r *UserRepository) GetAllDepartments(ctx context.Context) ([]string, error) {
	query := `SELECT DISTINCT department FROM users WHERE department != '' ORDER BY department`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get all departments: %w", err)
	}
	defer rows.Close()

	var departments []string
	for rows.Next() {
		var department string
		if err := rows.Scan(&department); err != nil {
			return nil, fmt.Errorf("failed to scan department: %w", err)
		}
		departments = append(departments, department)
	}
	return departments, nil
}

// ClearDepartment clears the department field for all users with the given department name
func (r *UserRepository) ClearDepartment(ctx context.Context, department string) error {
	query := `UPDATE users SET department = '', updated_at = $1 WHERE department = $2`
	_, err := r.pool.Exec(ctx, query, time.Now(), department)
	if err != nil {
		return fmt.Errorf("failed to clear department: %w", err)
	}
	return nil
}

// Deactivate marks a user as inactive and performs cleanup:
// - Deletes tasks created by the user
// - Deletes time-off requests created by the user
// - Unassigns tasks that were assigned to the user
// - Clears the user's supervisor_id from their direct reports
func (r *UserRepository) Deactivate(ctx context.Context, userID int64) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	now := time.Now()

	// 1. Delete tasks created by the user
	_, err = tx.Exec(ctx, `DELETE FROM tasks WHERE created_by_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user's tasks: %w", err)
	}

	// 2. Delete time-off requests created by the user
	_, err = tx.Exec(ctx, `DELETE FROM time_off_requests WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user's time-off requests: %w", err)
	}

	// 3. Unassign tasks that were assigned to the user (set assigned_user_id to NULL)
	_, err = tx.Exec(ctx, `UPDATE tasks SET assigned_user_id = NULL, updated_at = $1 WHERE assigned_user_id = $2`, now, userID)
	if err != nil {
		return fmt.Errorf("failed to unassign tasks from user: %w", err)
	}

	// 4. Clear supervisor_id for any direct reports
	_, err = tx.Exec(ctx, `UPDATE users SET supervisor_id = NULL, updated_at = $1 WHERE supervisor_id = $2`, now, userID)
	if err != nil {
		return fmt.Errorf("failed to clear supervisor from direct reports: %w", err)
	}

	// 5. Mark the user as inactive
	_, err = tx.Exec(ctx, `UPDATE users SET is_active = false, updated_at = $1 WHERE id = $2`, now, userID)
	if err != nil {
		return fmt.Errorf("failed to deactivate user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// Reactivate marks a user as active again
func (r *UserRepository) Reactivate(ctx context.Context, userID int64) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET is_active = true, updated_at = $1 WHERE id = $2`, time.Now(), userID)
	if err != nil {
		return fmt.Errorf("failed to reactivate user: %w", err)
	}
	return nil
}

// RenameDepartment renames a department by updating all users with the old department name to the new name
func (r *UserRepository) RenameDepartment(ctx context.Context, oldName, newName string) error {
	query := `UPDATE users SET department = $1, updated_at = $2 WHERE department = $3`
	_, err := r.pool.Exec(ctx, query, newName, time.Now(), oldName)
	if err != nil {
		return fmt.Errorf("failed to rename department: %w", err)
	}
	return nil
}

// GetUsersByDepartment returns all active users in a specific department
func (r *UserRepository) GetUsersByDepartment(ctx context.Context, department string) ([]models.User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE department = $1 AND is_active = true ORDER BY last_name, first_name`
	rows, err := r.pool.Query(ctx, query, department)
	if err != nil {
		return nil, fmt.Errorf("failed to get users by department: %w", err)
	}
	defer rows.Close()

	users, err := scanUsers(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan users: %w", err)
	}
	return users, nil
}
