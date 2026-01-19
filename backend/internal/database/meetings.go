package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

const meetingColumns = `id, title, description, start_time, end_time, created_by_id,
	recurrence_type, recurrence_interval, recurrence_end_date, recurrence_days_of_week,
	recurrence_day_of_month, parent_meeting_id, created_at, updated_at`

const attendeeColumns = `id, meeting_id, user_id, response_status, created_at, updated_at`

type MeetingRepository struct {
	pool *pgxpool.Pool
}

func NewMeetingRepository(pool *pgxpool.Pool) *MeetingRepository {
	return &MeetingRepository{pool: pool}
}

// scanMeeting scans a row into a Meeting struct
func scanMeeting(row pgx.Row) (*models.Meeting, error) {
	var meeting models.Meeting
	var recurrenceType *string
	err := row.Scan(
		&meeting.ID, &meeting.Title, &meeting.Description, &meeting.StartTime, &meeting.EndTime,
		&meeting.CreatedByID, &recurrenceType, &meeting.RecurrenceInterval,
		&meeting.RecurrenceEndDate, &meeting.RecurrenceDaysOfWeek, &meeting.RecurrenceDayOfMonth,
		&meeting.ParentMeetingID, &meeting.CreatedAt, &meeting.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if recurrenceType != nil {
		rt := models.RecurrenceType(*recurrenceType)
		meeting.RecurrenceType = &rt
	}
	return &meeting, nil
}

// scanMeetings scans multiple rows into a slice of Meetings
func scanMeetings(rows pgx.Rows) ([]models.Meeting, error) {
	var meetings []models.Meeting
	for rows.Next() {
		var meeting models.Meeting
		var recurrenceType *string
		err := rows.Scan(
			&meeting.ID, &meeting.Title, &meeting.Description, &meeting.StartTime, &meeting.EndTime,
			&meeting.CreatedByID, &recurrenceType, &meeting.RecurrenceInterval,
			&meeting.RecurrenceEndDate, &meeting.RecurrenceDaysOfWeek, &meeting.RecurrenceDayOfMonth,
			&meeting.ParentMeetingID, &meeting.CreatedAt, &meeting.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if recurrenceType != nil {
			rt := models.RecurrenceType(*recurrenceType)
			meeting.RecurrenceType = &rt
		}
		meetings = append(meetings, meeting)
	}
	return meetings, nil
}

// Create creates a new meeting with attendees
func (r *MeetingRepository) Create(ctx context.Context, req *models.CreateMeetingRequest, createdByID int64) (*models.Meeting, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var recurrenceType *string
	if req.RecurrenceType != nil {
		s := string(*req.RecurrenceType)
		recurrenceType = &s
	}

	recurrenceInterval := 1
	if req.RecurrenceInterval != nil {
		recurrenceInterval = *req.RecurrenceInterval
	}

	query := `
		INSERT INTO meetings (title, description, start_time, end_time, created_by_id,
			recurrence_type, recurrence_interval, recurrence_end_date, recurrence_days_of_week,
			recurrence_day_of_month)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING ` + meetingColumns

	var meeting models.Meeting
	var rtScan *string
	err = tx.QueryRow(ctx, query,
		req.Title, req.Description, req.StartTime, req.EndTime, createdByID,
		recurrenceType, recurrenceInterval, req.RecurrenceEndDate, req.RecurrenceDaysOfWeek,
		req.RecurrenceDayOfMonth,
	).Scan(
		&meeting.ID, &meeting.Title, &meeting.Description, &meeting.StartTime, &meeting.EndTime,
		&meeting.CreatedByID, &rtScan, &meeting.RecurrenceInterval,
		&meeting.RecurrenceEndDate, &meeting.RecurrenceDaysOfWeek, &meeting.RecurrenceDayOfMonth,
		&meeting.ParentMeetingID, &meeting.CreatedAt, &meeting.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create meeting: %w", err)
	}
	if rtScan != nil {
		rt := models.RecurrenceType(*rtScan)
		meeting.RecurrenceType = &rt
	}

	// Add attendees
	for _, userID := range req.AttendeeIDs {
		_, err = tx.Exec(ctx, `
			INSERT INTO meeting_attendees (meeting_id, user_id, response_status)
			VALUES ($1, $2, 'pending')
		`, meeting.ID, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to add attendee: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Fetch attendees
	meeting.Attendees, err = r.GetAttendees(ctx, meeting.ID)
	if err != nil {
		return nil, err
	}

	return &meeting, nil
}

// GetByID retrieves a meeting by ID with attendees
func (r *MeetingRepository) GetByID(ctx context.Context, id int64) (*models.Meeting, error) {
	query := `SELECT ` + meetingColumns + ` FROM meetings WHERE id = $1`
	meeting, err := scanMeeting(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, fmt.Errorf("failed to get meeting by ID: %w", err)
	}

	meeting.Attendees, err = r.GetAttendees(ctx, id)
	if err != nil {
		return nil, err
	}

	return meeting, nil
}

// GetAttendees retrieves attendees for a meeting
func (r *MeetingRepository) GetAttendees(ctx context.Context, meetingID int64) ([]models.MeetingAttendee, error) {
	query := `
		SELECT a.id, a.meeting_id, a.user_id, a.response_status, a.created_at, a.updated_at,
			u.id, COALESCE(u.auth0_id, ''), u.email, u.first_name, u.last_name, u.role, u.title,
			u.department, u.avatar_url, u.supervisor_id, u.date_started, u.created_at, u.updated_at
		FROM meeting_attendees a
		JOIN users u ON a.user_id = u.id
		WHERE a.meeting_id = $1
		ORDER BY u.last_name, u.first_name`

	rows, err := r.pool.Query(ctx, query, meetingID)
	if err != nil {
		return nil, fmt.Errorf("failed to get attendees: %w", err)
	}
	defer rows.Close()

	var attendees []models.MeetingAttendee
	for rows.Next() {
		var attendee models.MeetingAttendee
		var user models.User
		err := rows.Scan(
			&attendee.ID, &attendee.MeetingID, &attendee.UserID, &attendee.ResponseStatus,
			&attendee.CreatedAt, &attendee.UpdatedAt,
			&user.ID, &user.Auth0ID, &user.Email, &user.FirstName, &user.LastName,
			&user.Role, &user.Title, &user.Department, &user.AvatarURL, &user.SupervisorID,
			&user.DateStarted, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan attendee: %w", err)
		}
		attendee.User = &user
		attendees = append(attendees, attendee)
	}

	return attendees, nil
}

// Update updates a meeting
func (r *MeetingRepository) Update(ctx context.Context, id int64, req *models.UpdateMeetingRequest) (*models.Meeting, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var recurrenceType *string
	if req.RecurrenceType != nil {
		s := string(*req.RecurrenceType)
		recurrenceType = &s
	}

	query := `
		UPDATE meetings SET
			title = COALESCE($2, title),
			description = COALESCE($3, description),
			start_time = COALESCE($4, start_time),
			end_time = COALESCE($5, end_time),
			recurrence_type = COALESCE($6, recurrence_type),
			recurrence_interval = COALESCE($7, recurrence_interval),
			recurrence_end_date = COALESCE($8, recurrence_end_date),
			recurrence_days_of_week = COALESCE($9, recurrence_days_of_week),
			recurrence_day_of_month = COALESCE($10, recurrence_day_of_month),
			updated_at = NOW()
		WHERE id = $1
		RETURNING ` + meetingColumns

	var meeting models.Meeting
	var rtScan *string
	err = tx.QueryRow(ctx, query,
		id, req.Title, req.Description, req.StartTime, req.EndTime,
		recurrenceType, req.RecurrenceInterval, req.RecurrenceEndDate,
		req.RecurrenceDaysOfWeek, req.RecurrenceDayOfMonth,
	).Scan(
		&meeting.ID, &meeting.Title, &meeting.Description, &meeting.StartTime, &meeting.EndTime,
		&meeting.CreatedByID, &rtScan, &meeting.RecurrenceInterval,
		&meeting.RecurrenceEndDate, &meeting.RecurrenceDaysOfWeek, &meeting.RecurrenceDayOfMonth,
		&meeting.ParentMeetingID, &meeting.CreatedAt, &meeting.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update meeting: %w", err)
	}
	if rtScan != nil {
		rt := models.RecurrenceType(*rtScan)
		meeting.RecurrenceType = &rt
	}

	// Update attendees if provided
	if len(req.AttendeeIDs) > 0 {
		// Remove all existing attendees
		_, err = tx.Exec(ctx, `DELETE FROM meeting_attendees WHERE meeting_id = $1`, id)
		if err != nil {
			return nil, fmt.Errorf("failed to remove existing attendees: %w", err)
		}

		// Add new attendees
		for _, userID := range req.AttendeeIDs {
			_, err = tx.Exec(ctx, `
				INSERT INTO meeting_attendees (meeting_id, user_id, response_status)
				VALUES ($1, $2, 'pending')
			`, id, userID)
			if err != nil {
				return nil, fmt.Errorf("failed to add attendee: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Fetch attendees
	meeting.Attendees, err = r.GetAttendees(ctx, id)
	if err != nil {
		return nil, err
	}

	return &meeting, nil
}

// Delete deletes a meeting
func (r *MeetingRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM meetings WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete meeting: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("meeting not found")
	}
	return nil
}

// RespondToMeeting updates an attendee's response
func (r *MeetingRepository) RespondToMeeting(ctx context.Context, meetingID int64, userID int64, response models.ResponseStatus) error {
	result, err := r.pool.Exec(ctx, `
		UPDATE meeting_attendees SET
			response_status = $3,
			updated_at = NOW()
		WHERE meeting_id = $1 AND user_id = $2
	`, meetingID, userID, string(response))
	if err != nil {
		return fmt.Errorf("failed to update response: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("attendee not found")
	}
	return nil
}

// GetByDateRange retrieves meetings within a date range for a user (as creator or attendee)
func (r *MeetingRepository) GetByDateRange(ctx context.Context, userID int64, start, end time.Time) ([]models.Meeting, error) {
	query := `
		SELECT DISTINCT m.` + meetingColumns + `
		FROM meetings m
		LEFT JOIN meeting_attendees a ON m.id = a.meeting_id
		WHERE m.start_time >= $1 AND m.start_time <= $2
		AND (m.created_by_id = $3 OR a.user_id = $3)
		ORDER BY m.start_time`

	rows, err := r.pool.Query(ctx, query, start, end, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get meetings by date range: %w", err)
	}
	defer rows.Close()

	meetings, err := scanMeetings(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan meetings: %w", err)
	}

	// Fetch attendees for each meeting
	for i := range meetings {
		meetings[i].Attendees, err = r.GetAttendees(ctx, meetings[i].ID)
		if err != nil {
			return nil, err
		}
	}

	return meetings, nil
}

// GetAllByDateRange retrieves all meetings within a date range (admin only)
func (r *MeetingRepository) GetAllByDateRange(ctx context.Context, start, end time.Time) ([]models.Meeting, error) {
	query := `
		SELECT ` + meetingColumns + `
		FROM meetings
		WHERE start_time >= $1 AND start_time <= $2
		ORDER BY start_time`

	rows, err := r.pool.Query(ctx, query, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to get all meetings by date range: %w", err)
	}
	defer rows.Close()

	meetings, err := scanMeetings(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan meetings: %w", err)
	}

	// Fetch attendees for each meeting
	for i := range meetings {
		meetings[i].Attendees, err = r.GetAttendees(ctx, meetings[i].ID)
		if err != nil {
			return nil, err
		}
	}

	return meetings, nil
}

// GetVisibleMeetings retrieves all meetings visible to a user within a date range
func (r *MeetingRepository) GetVisibleMeetings(ctx context.Context, user *models.User, start, end time.Time) ([]models.Meeting, error) {
	// Admin sees all meetings
	if user.IsAdmin() {
		return r.GetAllByDateRange(ctx, start, end)
	}

	return r.GetByDateRange(ctx, user.ID, start, end)
}

// ExpandRecurringMeetings expands recurring meetings into individual occurrences within a date range
func (r *MeetingRepository) ExpandRecurringMeetings(meetings []models.Meeting, start, end time.Time) []models.Meeting {
	var expanded []models.Meeting

	for _, meeting := range meetings {
		if meeting.RecurrenceType == nil {
			// Non-recurring meeting - just add if within range
			if (meeting.StartTime.After(start) || meeting.StartTime.Equal(start)) &&
				(meeting.StartTime.Before(end) || meeting.StartTime.Equal(end)) {
				expanded = append(expanded, meeting)
			}
			continue
		}

		// Expand recurring meeting
		duration := meeting.EndTime.Sub(meeting.StartTime)
		current := meeting.StartTime

		// Determine recurrence end
		recurrenceEnd := end
		if meeting.RecurrenceEndDate != nil && meeting.RecurrenceEndDate.Before(end) {
			recurrenceEnd = *meeting.RecurrenceEndDate
		}

		for current.Before(recurrenceEnd) || current.Equal(recurrenceEnd) {
			if (current.After(start) || current.Equal(start)) && (current.Before(end) || current.Equal(end)) {
				// Create occurrence
				occurrence := meeting
				occurrence.StartTime = current
				occurrence.EndTime = current.Add(duration)
				expanded = append(expanded, occurrence)
			}

			// Calculate next occurrence
			switch *meeting.RecurrenceType {
			case models.RecurrenceTypeDaily:
				current = current.AddDate(0, 0, meeting.RecurrenceInterval)
			case models.RecurrenceTypeWeekly:
				current = current.AddDate(0, 0, 7*meeting.RecurrenceInterval)
			case models.RecurrenceTypeMonthly:
				current = current.AddDate(0, meeting.RecurrenceInterval, 0)
			}
		}
	}

	return expanded
}

// IsAttendee checks if a user is an attendee of a meeting
func (r *MeetingRepository) IsAttendee(ctx context.Context, meetingID, userID int64) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM meeting_attendees WHERE meeting_id = $1 AND user_id = $2)
	`, meetingID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check attendee: %w", err)
	}
	return exists, nil
}
