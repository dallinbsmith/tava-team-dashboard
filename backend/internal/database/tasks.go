package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

const taskColumns = `id, title, description, status, due_date, created_by_id, assignment_type,
	assigned_user_id, assigned_squad_id, assigned_department, created_at, updated_at`

type TaskRepository struct {
	pool *pgxpool.Pool
}

func NewTaskRepository(pool *pgxpool.Pool) *TaskRepository {
	return &TaskRepository{pool: pool}
}

// scanTask scans a row into a Task struct
func scanTask(row pgx.Row) (*models.Task, error) {
	var task models.Task
	err := row.Scan(
		&task.ID, &task.Title, &task.Description, &task.Status, &task.DueDate,
		&task.CreatedByID, &task.AssignmentType, &task.AssignedUserID,
		&task.AssignedSquadID, &task.AssignedDepartment,
		&task.CreatedAt, &task.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &task, nil
}

// scanTasks scans multiple rows into a slice of Tasks
func scanTasks(rows pgx.Rows) ([]models.Task, error) {
	var tasks []models.Task
	for rows.Next() {
		var task models.Task
		err := rows.Scan(
			&task.ID, &task.Title, &task.Description, &task.Status, &task.DueDate,
			&task.CreatedByID, &task.AssignmentType, &task.AssignedUserID,
			&task.AssignedSquadID, &task.AssignedDepartment,
			&task.CreatedAt, &task.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}
	return tasks, nil
}

// Create creates a new task
func (r *TaskRepository) Create(ctx context.Context, req *models.CreateTaskRequest, createdByID int64) (*models.Task, error) {
	query := `
		INSERT INTO tasks (title, description, due_date, created_by_id, assignment_type,
			assigned_user_id, assigned_squad_id, assigned_department)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING ` + taskColumns

	task, err := scanTask(r.pool.QueryRow(ctx, query,
		req.Title, req.Description, req.DueDate, createdByID, req.AssignmentType,
		req.AssignedUserID, req.AssignedSquadID, req.AssignedDepartment,
	))
	if err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}
	return task, nil
}

// GetByID retrieves a task by ID
func (r *TaskRepository) GetByID(ctx context.Context, id int64) (*models.Task, error) {
	query := `SELECT ` + taskColumns + ` FROM tasks WHERE id = $1`
	task, err := scanTask(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, fmt.Errorf("failed to get task by ID: %w", err)
	}
	return task, nil
}

// Update updates a task
func (r *TaskRepository) Update(ctx context.Context, id int64, req *models.UpdateTaskRequest) (*models.Task, error) {
	query := `
		UPDATE tasks SET
			title = COALESCE($2, title),
			description = COALESCE($3, description),
			status = COALESCE($4, status),
			due_date = COALESCE($5, due_date),
			assignment_type = COALESCE($6, assignment_type),
			assigned_user_id = COALESCE($7, assigned_user_id),
			assigned_squad_id = COALESCE($8, assigned_squad_id),
			assigned_department = COALESCE($9, assigned_department),
			updated_at = NOW()
		WHERE id = $1
		RETURNING ` + taskColumns

	var status *string
	if req.Status != nil {
		s := string(*req.Status)
		status = &s
	}
	var assignmentType *string
	if req.AssignmentType != nil {
		a := string(*req.AssignmentType)
		assignmentType = &a
	}

	task, err := scanTask(r.pool.QueryRow(ctx, query,
		id, req.Title, req.Description, status, req.DueDate,
		assignmentType, req.AssignedUserID, req.AssignedSquadID, req.AssignedDepartment,
	))
	if err != nil {
		return nil, fmt.Errorf("failed to update task: %w", err)
	}
	return task, nil
}

// Delete deletes a task
func (r *TaskRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM tasks WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete task: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("task not found")
	}
	return nil
}

// GetByDateRange retrieves tasks within a date range for a user
func (r *TaskRepository) GetByDateRange(ctx context.Context, userID int64, start, end time.Time) ([]models.Task, error) {
	query := `
		SELECT ` + taskColumns + `
		FROM tasks
		WHERE due_date >= $1 AND due_date <= $2
		AND (
			created_by_id = $3
			OR assigned_user_id = $3
		)
		ORDER BY due_date`

	rows, err := r.pool.Query(ctx, query, start, end, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks by date range: %w", err)
	}
	defer rows.Close()

	tasks, err := scanTasks(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan tasks: %w", err)
	}
	return tasks, nil
}

// GetByDateRangeForSquad retrieves tasks within a date range for a specific squad
func (r *TaskRepository) GetByDateRangeForSquad(ctx context.Context, squadID int64, start, end time.Time) ([]models.Task, error) {
	query := `
		SELECT ` + taskColumns + `
		FROM tasks
		WHERE due_date >= $1 AND due_date <= $2
		AND assigned_squad_id = $3
		ORDER BY due_date`

	rows, err := r.pool.Query(ctx, query, start, end, squadID)
	if err != nil {
		return nil, fmt.Errorf("failed to get squad tasks by date range: %w", err)
	}
	defer rows.Close()

	tasks, err := scanTasks(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan tasks: %w", err)
	}
	return tasks, nil
}

// GetByDateRangeForDepartment retrieves tasks within a date range for a department
func (r *TaskRepository) GetByDateRangeForDepartment(ctx context.Context, department string, start, end time.Time) ([]models.Task, error) {
	query := `
		SELECT ` + taskColumns + `
		FROM tasks
		WHERE due_date >= $1 AND due_date <= $2
		AND assigned_department = $3
		ORDER BY due_date`

	rows, err := r.pool.Query(ctx, query, start, end, department)
	if err != nil {
		return nil, fmt.Errorf("failed to get department tasks by date range: %w", err)
	}
	defer rows.Close()

	tasks, err := scanTasks(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan tasks: %w", err)
	}
	return tasks, nil
}

// GetAllByDateRange retrieves all tasks within a date range (admin only)
func (r *TaskRepository) GetAllByDateRange(ctx context.Context, start, end time.Time) ([]models.Task, error) {
	query := `
		SELECT ` + taskColumns + `
		FROM tasks
		WHERE due_date >= $1 AND due_date <= $2
		ORDER BY due_date`

	rows, err := r.pool.Query(ctx, query, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to get all tasks by date range: %w", err)
	}
	defer rows.Close()

	tasks, err := scanTasks(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan tasks: %w", err)
	}
	return tasks, nil
}

// GetVisibleTasks retrieves all tasks visible to a user within a date range
func (r *TaskRepository) GetVisibleTasks(ctx context.Context, user *models.User, start, end time.Time) ([]models.Task, error) {
	// Admin sees all tasks
	if user.IsAdmin() {
		return r.GetAllByDateRange(ctx, start, end)
	}

	// Get user's squad IDs for the query
	var squadIDs []int64
	for _, squad := range user.Squads {
		squadIDs = append(squadIDs, squad.ID)
	}

	query := `
		SELECT DISTINCT ` + taskColumns + `
		FROM tasks
		WHERE due_date >= $1 AND due_date <= $2
		AND (
			created_by_id = $3
			OR assigned_user_id = $3
			OR (assignment_type = 'squad' AND assigned_squad_id = ANY($4))
			OR (assignment_type = 'department' AND assigned_department = $5)
		)
		ORDER BY due_date`

	rows, err := r.pool.Query(ctx, query, start, end, user.ID, squadIDs, user.Department)
	if err != nil {
		return nil, fmt.Errorf("failed to get visible tasks: %w", err)
	}
	defer rows.Close()

	tasks, err := scanTasks(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan tasks: %w", err)
	}
	return tasks, nil
}
