package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

type TimeOffRepository struct {
	db *pgxpool.Pool
}

func NewTimeOffRepository(db *pgxpool.Pool) *TimeOffRepository {
	return &TimeOffRepository{db: db}
}

// Create creates a new time off request
func (r *TimeOffRepository) Create(ctx context.Context, userID int64, req *models.CreateTimeOffRequestInput) (*models.TimeOffRequest, error) {
	startDate, _ := time.Parse("2006-01-02", req.StartDate)
	endDate, _ := time.Parse("2006-01-02", req.EndDate)

	var timeOff models.TimeOffRequest
	err := r.db.QueryRow(ctx, `
		INSERT INTO time_off_requests (user_id, start_date, end_date, request_type, reason, status)
		VALUES ($1, $2, $3, $4, $5, 'pending')
		RETURNING id, user_id, start_date, end_date, request_type, reason, status, reviewer_id, reviewer_notes, reviewed_at, created_at, updated_at
	`, userID, startDate, endDate, req.RequestType, req.Reason).Scan(
		&timeOff.ID, &timeOff.UserID, &timeOff.StartDate, &timeOff.EndDate,
		&timeOff.RequestType, &timeOff.Reason, &timeOff.Status,
		&timeOff.ReviewerID, &timeOff.ReviewerNotes, &timeOff.ReviewedAt,
		&timeOff.CreatedAt, &timeOff.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create time off request: %w", err)
	}
	return &timeOff, nil
}

// GetByID retrieves a time off request by ID
func (r *TimeOffRepository) GetByID(ctx context.Context, id int64) (*models.TimeOffRequest, error) {
	var timeOff models.TimeOffRequest
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, start_date, end_date, request_type, reason, status, reviewer_id, reviewer_notes, reviewed_at, created_at, updated_at
		FROM time_off_requests
		WHERE id = $1
	`, id).Scan(
		&timeOff.ID, &timeOff.UserID, &timeOff.StartDate, &timeOff.EndDate,
		&timeOff.RequestType, &timeOff.Reason, &timeOff.Status,
		&timeOff.ReviewerID, &timeOff.ReviewerNotes, &timeOff.ReviewedAt,
		&timeOff.CreatedAt, &timeOff.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get time off request: %w", err)
	}
	return &timeOff, nil
}

// GetByIDWithUser retrieves a time off request by ID with user info
func (r *TimeOffRepository) GetByIDWithUser(ctx context.Context, id int64) (*models.TimeOffRequest, error) {
	var timeOff models.TimeOffRequest
	var user models.User
	var reviewer models.User
	var reviewerID *int64

	err := r.db.QueryRow(ctx, `
		SELECT
			t.id, t.user_id, t.start_date, t.end_date, t.request_type, t.reason, t.status,
			t.reviewer_id, t.reviewer_notes, t.reviewed_at, t.created_at, t.updated_at,
			u.id, u.email, u.first_name, u.last_name, u.role, u.title, u.department, u.avatar_url
		FROM time_off_requests t
		JOIN users u ON t.user_id = u.id
		WHERE t.id = $1
	`, id).Scan(
		&timeOff.ID, &timeOff.UserID, &timeOff.StartDate, &timeOff.EndDate,
		&timeOff.RequestType, &timeOff.Reason, &timeOff.Status,
		&reviewerID, &timeOff.ReviewerNotes, &timeOff.ReviewedAt,
		&timeOff.CreatedAt, &timeOff.UpdatedAt,
		&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Role, &user.Title, &user.Department, &user.AvatarURL,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get time off request with user: %w", err)
	}

	timeOff.User = &user
	timeOff.ReviewerID = reviewerID

	// Load reviewer if exists
	if reviewerID != nil {
		err = r.db.QueryRow(ctx, `
			SELECT id, email, first_name, last_name, role, title, department, avatar_url
			FROM users WHERE id = $1
		`, *reviewerID).Scan(
			&reviewer.ID, &reviewer.Email, &reviewer.FirstName, &reviewer.LastName,
			&reviewer.Role, &reviewer.Title, &reviewer.Department, &reviewer.AvatarURL,
		)
		if err == nil {
			timeOff.Reviewer = &reviewer
		}
	}

	return &timeOff, nil
}

// GetByUserID retrieves time off requests for a user, optionally filtered by status
func (r *TimeOffRepository) GetByUserID(ctx context.Context, userID int64, status *models.TimeOffStatus) ([]models.TimeOffRequest, error) {
	var query string
	var args []interface{}

	if status != nil {
		query = `
			SELECT id, user_id, start_date, end_date, request_type, reason, status, reviewer_id, reviewer_notes, reviewed_at, created_at, updated_at
			FROM time_off_requests
			WHERE user_id = $1 AND status = $2
			ORDER BY start_date DESC
		`
		args = []interface{}{userID, *status}
	} else {
		query = `
			SELECT id, user_id, start_date, end_date, request_type, reason, status, reviewer_id, reviewer_notes, reviewed_at, created_at, updated_at
			FROM time_off_requests
			WHERE user_id = $1
			ORDER BY start_date DESC
		`
		args = []interface{}{userID}
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get time off requests by user: %w", err)
	}
	defer rows.Close()

	var requests []models.TimeOffRequest
	for rows.Next() {
		var timeOff models.TimeOffRequest
		err := rows.Scan(
			&timeOff.ID, &timeOff.UserID, &timeOff.StartDate, &timeOff.EndDate,
			&timeOff.RequestType, &timeOff.Reason, &timeOff.Status,
			&timeOff.ReviewerID, &timeOff.ReviewerNotes, &timeOff.ReviewedAt,
			&timeOff.CreatedAt, &timeOff.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time off request: %w", err)
		}
		requests = append(requests, timeOff)
	}

	return requests, nil
}

// GetPendingForSupervisor retrieves pending time off requests for a supervisor's direct reports
func (r *TimeOffRepository) GetPendingForSupervisor(ctx context.Context, supervisorID int64) ([]models.TimeOffRequest, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			t.id, t.user_id, t.start_date, t.end_date, t.request_type, t.reason, t.status,
			t.reviewer_id, t.reviewer_notes, t.reviewed_at, t.created_at, t.updated_at,
			u.id, u.email, u.first_name, u.last_name, u.role, u.title, u.department, u.avatar_url
		FROM time_off_requests t
		JOIN users u ON t.user_id = u.id
		WHERE u.supervisor_id = $1 AND t.status = 'pending'
		ORDER BY t.created_at ASC
	`, supervisorID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending time off requests: %w", err)
	}
	defer rows.Close()

	var requests []models.TimeOffRequest
	for rows.Next() {
		var timeOff models.TimeOffRequest
		var user models.User
		err := rows.Scan(
			&timeOff.ID, &timeOff.UserID, &timeOff.StartDate, &timeOff.EndDate,
			&timeOff.RequestType, &timeOff.Reason, &timeOff.Status,
			&timeOff.ReviewerID, &timeOff.ReviewerNotes, &timeOff.ReviewedAt,
			&timeOff.CreatedAt, &timeOff.UpdatedAt,
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Role, &user.Title, &user.Department, &user.AvatarURL,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time off request: %w", err)
		}
		timeOff.User = &user
		requests = append(requests, timeOff)
	}

	return requests, nil
}

// GetAllApproved retrieves all approved time off requests (for admins viewing team time off)
func (r *TimeOffRepository) GetAllApproved(ctx context.Context) ([]models.TimeOffRequest, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			t.id, t.user_id, t.start_date, t.end_date, t.request_type, t.reason, t.status,
			t.reviewer_id, t.reviewer_notes, t.reviewed_at, t.created_at, t.updated_at,
			u.id, u.email, u.first_name, u.last_name, u.role, u.title, u.department, u.avatar_url
		FROM time_off_requests t
		JOIN users u ON t.user_id = u.id
		WHERE t.status = 'approved'
		AND t.end_date >= CURRENT_DATE
		ORDER BY t.start_date ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get all approved time off requests: %w", err)
	}
	defer rows.Close()

	var requests []models.TimeOffRequest
	for rows.Next() {
		var timeOff models.TimeOffRequest
		var user models.User
		err := rows.Scan(
			&timeOff.ID, &timeOff.UserID, &timeOff.StartDate, &timeOff.EndDate,
			&timeOff.RequestType, &timeOff.Reason, &timeOff.Status,
			&timeOff.ReviewerID, &timeOff.ReviewerNotes, &timeOff.ReviewedAt,
			&timeOff.CreatedAt, &timeOff.UpdatedAt,
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Role, &user.Title, &user.Department, &user.AvatarURL,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time off request: %w", err)
		}
		timeOff.User = &user
		requests = append(requests, timeOff)
	}

	return requests, nil
}

// GetAllPending retrieves all pending time off requests (for admins)
func (r *TimeOffRepository) GetAllPending(ctx context.Context) ([]models.TimeOffRequest, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			t.id, t.user_id, t.start_date, t.end_date, t.request_type, t.reason, t.status,
			t.reviewer_id, t.reviewer_notes, t.reviewed_at, t.created_at, t.updated_at,
			u.id, u.email, u.first_name, u.last_name, u.role, u.title, u.department, u.avatar_url
		FROM time_off_requests t
		JOIN users u ON t.user_id = u.id
		WHERE t.status = 'pending'
		ORDER BY t.created_at ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get all pending time off requests: %w", err)
	}
	defer rows.Close()

	var requests []models.TimeOffRequest
	for rows.Next() {
		var timeOff models.TimeOffRequest
		var user models.User
		err := rows.Scan(
			&timeOff.ID, &timeOff.UserID, &timeOff.StartDate, &timeOff.EndDate,
			&timeOff.RequestType, &timeOff.Reason, &timeOff.Status,
			&timeOff.ReviewerID, &timeOff.ReviewerNotes, &timeOff.ReviewedAt,
			&timeOff.CreatedAt, &timeOff.UpdatedAt,
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Role, &user.Title, &user.Department, &user.AvatarURL,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time off request: %w", err)
		}
		timeOff.User = &user
		requests = append(requests, timeOff)
	}

	return requests, nil
}

// Review updates a time off request status (approve/reject)
func (r *TimeOffRepository) Review(ctx context.Context, id int64, reviewerID int64, req *models.ReviewTimeOffRequestInput) error {
	now := time.Now()
	result, err := r.db.Exec(ctx, `
		UPDATE time_off_requests
		SET status = $1, reviewer_id = $2, reviewer_notes = $3, reviewed_at = $4, updated_at = $5
		WHERE id = $6 AND status = 'pending'
	`, req.Status, reviewerID, req.ReviewerNotes, now, now, id)
	if err != nil {
		return fmt.Errorf("failed to review time off request: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("time off request not found or already reviewed")
	}
	return nil
}

// Cancel cancels a pending time off request
func (r *TimeOffRepository) Cancel(ctx context.Context, id int64, userID int64) error {
	result, err := r.db.Exec(ctx, `
		UPDATE time_off_requests
		SET status = 'cancelled', updated_at = $1
		WHERE id = $2 AND user_id = $3 AND status = 'pending'
	`, time.Now(), id, userID)
	if err != nil {
		return fmt.Errorf("failed to cancel time off request: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("time off request not found, not yours, or already processed")
	}
	return nil
}

// GetApprovedByDateRange retrieves approved time off requests for a user within a date range
func (r *TimeOffRepository) GetApprovedByDateRange(ctx context.Context, userID int64, start, end time.Time) ([]models.TimeOffRequest, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, start_date, end_date, request_type, reason, status, reviewer_id, reviewer_notes, reviewed_at, created_at, updated_at
		FROM time_off_requests
		WHERE user_id = $1
		AND status = 'approved'
		AND start_date <= $3
		AND end_date >= $2
		ORDER BY start_date ASC
	`, userID, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to get approved time off by date range: %w", err)
	}
	defer rows.Close()

	var requests []models.TimeOffRequest
	for rows.Next() {
		var timeOff models.TimeOffRequest
		err := rows.Scan(
			&timeOff.ID, &timeOff.UserID, &timeOff.StartDate, &timeOff.EndDate,
			&timeOff.RequestType, &timeOff.Reason, &timeOff.Status,
			&timeOff.ReviewerID, &timeOff.ReviewerNotes, &timeOff.ReviewedAt,
			&timeOff.CreatedAt, &timeOff.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time off request: %w", err)
		}
		requests = append(requests, timeOff)
	}

	return requests, nil
}

// GetApprovedForUsers retrieves approved time off requests for multiple users within a date range
func (r *TimeOffRepository) GetApprovedForUsers(ctx context.Context, userIDs []int64, start, end time.Time) ([]models.TimeOffRequest, error) {
	if len(userIDs) == 0 {
		return []models.TimeOffRequest{}, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			t.id, t.user_id, t.start_date, t.end_date, t.request_type, t.reason, t.status,
			t.reviewer_id, t.reviewer_notes, t.reviewed_at, t.created_at, t.updated_at,
			u.id, u.email, u.first_name, u.last_name, u.role, u.title, u.department, u.avatar_url
		FROM time_off_requests t
		JOIN users u ON t.user_id = u.id
		WHERE t.user_id = ANY($1)
		AND t.status = 'approved'
		AND t.start_date <= $3
		AND t.end_date >= $2
		ORDER BY t.start_date ASC
	`, userIDs, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to get approved time off for users: %w", err)
	}
	defer rows.Close()

	var requests []models.TimeOffRequest
	for rows.Next() {
		var timeOff models.TimeOffRequest
		var user models.User
		err := rows.Scan(
			&timeOff.ID, &timeOff.UserID, &timeOff.StartDate, &timeOff.EndDate,
			&timeOff.RequestType, &timeOff.Reason, &timeOff.Status,
			&timeOff.ReviewerID, &timeOff.ReviewerNotes, &timeOff.ReviewedAt,
			&timeOff.CreatedAt, &timeOff.UpdatedAt,
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Role, &user.Title, &user.Department, &user.AvatarURL,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time off request: %w", err)
		}
		timeOff.User = &user
		requests = append(requests, timeOff)
	}

	return requests, nil
}

// GetTeamTimeOff retrieves approved time off for a supervisor's direct reports
func (r *TimeOffRepository) GetTeamTimeOff(ctx context.Context, supervisorID int64) ([]models.TimeOffRequest, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			t.id, t.user_id, t.start_date, t.end_date, t.request_type, t.reason, t.status,
			t.reviewer_id, t.reviewer_notes, t.reviewed_at, t.created_at, t.updated_at,
			u.id, u.email, u.first_name, u.last_name, u.role, u.title, u.department, u.avatar_url
		FROM time_off_requests t
		JOIN users u ON t.user_id = u.id
		WHERE u.supervisor_id = $1
		AND t.status = 'approved'
		AND t.end_date >= CURRENT_DATE
		ORDER BY t.start_date ASC
	`, supervisorID)
	if err != nil {
		return nil, fmt.Errorf("failed to get team time off: %w", err)
	}
	defer rows.Close()

	var requests []models.TimeOffRequest
	for rows.Next() {
		var timeOff models.TimeOffRequest
		var user models.User
		err := rows.Scan(
			&timeOff.ID, &timeOff.UserID, &timeOff.StartDate, &timeOff.EndDate,
			&timeOff.RequestType, &timeOff.Reason, &timeOff.Status,
			&timeOff.ReviewerID, &timeOff.ReviewerNotes, &timeOff.ReviewedAt,
			&timeOff.CreatedAt, &timeOff.UpdatedAt,
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Role, &user.Title, &user.Department, &user.AvatarURL,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time off request: %w", err)
		}
		timeOff.User = &user
		requests = append(requests, timeOff)
	}

	return requests, nil
}

// GetApprovedFutureTimeOffByUser retrieves future approved time off for a specific user (for Jira impact calculation)
func (r *TimeOffRepository) GetApprovedFutureTimeOffByUser(ctx context.Context, userID int64) ([]models.TimeOffRequest, error) {
	today := time.Now().Truncate(24 * time.Hour)
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, start_date, end_date, request_type, reason, status, reviewer_id, reviewer_notes, reviewed_at, created_at, updated_at
		FROM time_off_requests
		WHERE user_id = $1
		AND status = 'approved'
		AND end_date >= $2
		ORDER BY start_date ASC
	`, userID, today)
	if err != nil {
		return nil, fmt.Errorf("failed to get future approved time off: %w", err)
	}
	defer rows.Close()

	var requests []models.TimeOffRequest
	for rows.Next() {
		var timeOff models.TimeOffRequest
		err := rows.Scan(
			&timeOff.ID, &timeOff.UserID, &timeOff.StartDate, &timeOff.EndDate,
			&timeOff.RequestType, &timeOff.Reason, &timeOff.Status,
			&timeOff.ReviewerID, &timeOff.ReviewerNotes, &timeOff.ReviewedAt,
			&timeOff.CreatedAt, &timeOff.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time off request: %w", err)
		}
		requests = append(requests, timeOff)
	}

	return requests, nil
}

// GetVisibleRequests returns time off requests visible to the user based on their role:
// - Employees: only their own requests
// - Supervisors: their own + their direct reports' requests
// - Admins: their own + all users' requests (could be filtered to direct reports if preferred)
func (r *TimeOffRepository) GetVisibleRequests(ctx context.Context, user *models.User, statusFilter *models.TimeOffStatus) ([]models.TimeOffRequest, error) {
	var query string
	var args []interface{}

	// Build status filter clause
	statusClause := ""
	if statusFilter != nil {
		statusClause = " AND t.status = $2"
	}

	if user.Role == models.RoleEmployee {
		// Employees see only their own
		if statusFilter != nil {
			query = `
				SELECT
					t.id, t.user_id, t.start_date, t.end_date, t.request_type, t.reason, t.status,
					t.reviewer_id, t.reviewer_notes, t.reviewed_at, t.created_at, t.updated_at,
					u.id, u.email, u.first_name, u.last_name, u.role, u.title, u.department, u.avatar_url
				FROM time_off_requests t
				JOIN users u ON t.user_id = u.id
				WHERE t.user_id = $1` + statusClause + `
				ORDER BY t.start_date DESC
			`
			args = []interface{}{user.ID, *statusFilter}
		} else {
			query = `
				SELECT
					t.id, t.user_id, t.start_date, t.end_date, t.request_type, t.reason, t.status,
					t.reviewer_id, t.reviewer_notes, t.reviewed_at, t.created_at, t.updated_at,
					u.id, u.email, u.first_name, u.last_name, u.role, u.title, u.department, u.avatar_url
				FROM time_off_requests t
				JOIN users u ON t.user_id = u.id
				WHERE t.user_id = $1
				ORDER BY t.start_date DESC
			`
			args = []interface{}{user.ID}
		}
	} else if user.Role == models.RoleSupervisor {
		// Supervisors see their own + direct reports
		if statusFilter != nil {
			query = `
				SELECT
					t.id, t.user_id, t.start_date, t.end_date, t.request_type, t.reason, t.status,
					t.reviewer_id, t.reviewer_notes, t.reviewed_at, t.created_at, t.updated_at,
					u.id, u.email, u.first_name, u.last_name, u.role, u.title, u.department, u.avatar_url
				FROM time_off_requests t
				JOIN users u ON t.user_id = u.id
				WHERE (t.user_id = $1 OR u.supervisor_id = $1)` + statusClause + `
				ORDER BY t.start_date DESC
			`
			args = []interface{}{user.ID, *statusFilter}
		} else {
			query = `
				SELECT
					t.id, t.user_id, t.start_date, t.end_date, t.request_type, t.reason, t.status,
					t.reviewer_id, t.reviewer_notes, t.reviewed_at, t.created_at, t.updated_at,
					u.id, u.email, u.first_name, u.last_name, u.role, u.title, u.department, u.avatar_url
				FROM time_off_requests t
				JOIN users u ON t.user_id = u.id
				WHERE (t.user_id = $1 OR u.supervisor_id = $1)
				ORDER BY t.start_date DESC
			`
			args = []interface{}{user.ID}
		}
	} else {
		// Admins see their own + direct reports (same as supervisor for now)
		if statusFilter != nil {
			query = `
				SELECT
					t.id, t.user_id, t.start_date, t.end_date, t.request_type, t.reason, t.status,
					t.reviewer_id, t.reviewer_notes, t.reviewed_at, t.created_at, t.updated_at,
					u.id, u.email, u.first_name, u.last_name, u.role, u.title, u.department, u.avatar_url
				FROM time_off_requests t
				JOIN users u ON t.user_id = u.id
				WHERE (t.user_id = $1 OR u.supervisor_id = $1)` + statusClause + `
				ORDER BY t.start_date DESC
			`
			args = []interface{}{user.ID, *statusFilter}
		} else {
			query = `
				SELECT
					t.id, t.user_id, t.start_date, t.end_date, t.request_type, t.reason, t.status,
					t.reviewer_id, t.reviewer_notes, t.reviewed_at, t.created_at, t.updated_at,
					u.id, u.email, u.first_name, u.last_name, u.role, u.title, u.department, u.avatar_url
				FROM time_off_requests t
				JOIN users u ON t.user_id = u.id
				WHERE (t.user_id = $1 OR u.supervisor_id = $1)
				ORDER BY t.start_date DESC
			`
			args = []interface{}{user.ID}
		}
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get visible time off requests: %w", err)
	}
	defer rows.Close()

	var requests []models.TimeOffRequest
	for rows.Next() {
		var timeOff models.TimeOffRequest
		var reqUser models.User
		err := rows.Scan(
			&timeOff.ID, &timeOff.UserID, &timeOff.StartDate, &timeOff.EndDate,
			&timeOff.RequestType, &timeOff.Reason, &timeOff.Status,
			&timeOff.ReviewerID, &timeOff.ReviewerNotes, &timeOff.ReviewedAt,
			&timeOff.CreatedAt, &timeOff.UpdatedAt,
			&reqUser.ID, &reqUser.Email, &reqUser.FirstName, &reqUser.LastName,
			&reqUser.Role, &reqUser.Title, &reqUser.Department, &reqUser.AvatarURL,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time off request: %w", err)
		}
		timeOff.User = &reqUser
		requests = append(requests, timeOff)
	}

	return requests, nil
}

// Business day calculation helpers

// CountBusinessDays counts business days (Mon-Fri) between two dates inclusive
func CountBusinessDays(start, end time.Time) int {
	if end.Before(start) {
		return 0
	}

	count := 0
	current := start
	for !current.After(end) {
		weekday := current.Weekday()
		if weekday != time.Saturday && weekday != time.Sunday {
			count++
		}
		current = current.AddDate(0, 0, 1)
	}
	return count
}

// CountOverlappingBusinessDays counts business days where time off overlaps with a date range
func CountOverlappingBusinessDays(timeOff *models.TimeOffRequest, rangeStart, rangeEnd time.Time) int {
	// Find the overlap period
	overlapStart := timeOff.StartDate
	if rangeStart.After(overlapStart) {
		overlapStart = rangeStart
	}

	overlapEnd := timeOff.EndDate
	if rangeEnd.Before(overlapEnd) {
		overlapEnd = rangeEnd
	}

	if overlapEnd.Before(overlapStart) {
		return 0
	}

	return CountBusinessDays(overlapStart, overlapEnd)
}

// CalculateTimeOffImpact calculates the impact of time off on a Jira task
func CalculateTimeOffImpact(dueDate *time.Time, timeOffRequests []models.TimeOffRequest) *models.TimeOffImpact {
	if dueDate == nil {
		return nil
	}

	today := time.Now().Truncate(24 * time.Hour)
	dueDateTruncated := dueDate.Truncate(24 * time.Hour)

	if dueDateTruncated.Before(today) {
		return nil // Already overdue, no impact calculation
	}

	remainingBusinessDays := CountBusinessDays(today, dueDateTruncated)
	if remainingBusinessDays == 0 {
		return nil
	}

	timeOffBusinessDays := 0
	for _, to := range timeOffRequests {
		if to.Status == models.TimeOffStatusApproved {
			timeOffBusinessDays += CountOverlappingBusinessDays(&to, today, dueDateTruncated)
		}
	}

	if timeOffBusinessDays == 0 {
		return nil
	}

	impactPercent := float64(timeOffBusinessDays) / float64(remainingBusinessDays)
	if impactPercent >= 0.25 {
		return &models.TimeOffImpact{
			HasTimeOff:    true,
			TimeOffDays:   timeOffBusinessDays,
			RemainingDays: remainingBusinessDays,
			ImpactPercent: impactPercent,
		}
	}
	return nil
}
