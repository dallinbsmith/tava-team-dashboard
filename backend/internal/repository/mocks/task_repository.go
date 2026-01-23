package mocks

import (
	"context"
	"errors"
	"time"

	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// MockTaskRepository is a mock implementation of TaskRepository for testing
type MockTaskRepository struct {
	Tasks  map[int64]*models.Task
	NextID int64

	// Function hooks for custom behavior
	CreateFunc                    func(ctx context.Context, req *models.CreateTaskRequest, createdByID int64) (*models.Task, error)
	GetByIDFunc                   func(ctx context.Context, id int64) (*models.Task, error)
	UpdateFunc                    func(ctx context.Context, id int64, req *models.UpdateTaskRequest) (*models.Task, error)
	DeleteFunc                    func(ctx context.Context, id int64) error
	GetByDateRangeFunc            func(ctx context.Context, userID int64, start, end time.Time) ([]models.Task, error)
	GetByDateRangeForSquadFunc    func(ctx context.Context, squadID int64, start, end time.Time) ([]models.Task, error)
	GetByDateRangeForDepartmentFunc func(ctx context.Context, department string, start, end time.Time) ([]models.Task, error)
	GetAllByDateRangeFunc         func(ctx context.Context, start, end time.Time) ([]models.Task, error)
	GetVisibleTasksFunc           func(ctx context.Context, user *models.User, start, end time.Time) ([]models.Task, error)
}

// NewMockTaskRepository creates a new mock task repository
func NewMockTaskRepository() *MockTaskRepository {
	return &MockTaskRepository{
		Tasks:  make(map[int64]*models.Task),
		NextID: 1,
	}
}

func (m *MockTaskRepository) Create(ctx context.Context, req *models.CreateTaskRequest, createdByID int64) (*models.Task, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, req, createdByID)
	}
	task := &models.Task{
		ID:             m.NextID,
		Title:          req.Title,
		Description:    req.Description,
		DueDate:        req.DueDate,
		Status:         models.TaskStatusPending,
		AssignmentType: req.AssignmentType,
		CreatedByID:    createdByID,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	if req.AssignedUserID != nil {
		task.AssignedUserID = req.AssignedUserID
	}
	if req.AssignedSquadID != nil {
		task.AssignedSquadID = req.AssignedSquadID
	}
	if req.AssignedDepartment != nil {
		task.AssignedDepartment = req.AssignedDepartment
	}
	m.NextID++
	m.Tasks[task.ID] = task
	return task, nil
}

func (m *MockTaskRepository) GetByID(ctx context.Context, id int64) (*models.Task, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	if task, ok := m.Tasks[id]; ok {
		return task, nil
	}
	return nil, errors.New("task not found")
}

func (m *MockTaskRepository) Update(ctx context.Context, id int64, req *models.UpdateTaskRequest) (*models.Task, error) {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, id, req)
	}
	task, ok := m.Tasks[id]
	if !ok {
		return nil, errors.New("task not found")
	}
	if req.Title != nil {
		task.Title = *req.Title
	}
	if req.Description != nil {
		task.Description = req.Description
	}
	if req.Status != nil {
		task.Status = *req.Status
	}
	task.UpdatedAt = time.Now()
	return task, nil
}

func (m *MockTaskRepository) Delete(ctx context.Context, id int64) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	if _, ok := m.Tasks[id]; !ok {
		return errors.New("task not found")
	}
	delete(m.Tasks, id)
	return nil
}

func (m *MockTaskRepository) GetByDateRange(ctx context.Context, userID int64, start, end time.Time) ([]models.Task, error) {
	if m.GetByDateRangeFunc != nil {
		return m.GetByDateRangeFunc(ctx, userID, start, end)
	}
	var tasks []models.Task
	for _, task := range m.Tasks {
		if task.AssignedUserID != nil && *task.AssignedUserID == userID {
			if !task.DueDate.IsZero() && !task.DueDate.Before(start) && !task.DueDate.After(end) {
				tasks = append(tasks, *task)
			}
		}
	}
	return tasks, nil
}

func (m *MockTaskRepository) GetByDateRangeForSquad(ctx context.Context, squadID int64, start, end time.Time) ([]models.Task, error) {
	if m.GetByDateRangeForSquadFunc != nil {
		return m.GetByDateRangeForSquadFunc(ctx, squadID, start, end)
	}
	var tasks []models.Task
	for _, task := range m.Tasks {
		if task.AssignedSquadID != nil && *task.AssignedSquadID == squadID {
			if !task.DueDate.IsZero() && !task.DueDate.Before(start) && !task.DueDate.After(end) {
				tasks = append(tasks, *task)
			}
		}
	}
	return tasks, nil
}

func (m *MockTaskRepository) GetByDateRangeForDepartment(ctx context.Context, department string, start, end time.Time) ([]models.Task, error) {
	if m.GetByDateRangeForDepartmentFunc != nil {
		return m.GetByDateRangeForDepartmentFunc(ctx, department, start, end)
	}
	var tasks []models.Task
	for _, task := range m.Tasks {
		if task.AssignedDepartment != nil && *task.AssignedDepartment == department {
			if !task.DueDate.IsZero() && !task.DueDate.Before(start) && !task.DueDate.After(end) {
				tasks = append(tasks, *task)
			}
		}
	}
	return tasks, nil
}

func (m *MockTaskRepository) GetAllByDateRange(ctx context.Context, start, end time.Time) ([]models.Task, error) {
	if m.GetAllByDateRangeFunc != nil {
		return m.GetAllByDateRangeFunc(ctx, start, end)
	}
	var tasks []models.Task
	for _, task := range m.Tasks {
		if !task.DueDate.IsZero() && !task.DueDate.Before(start) && !task.DueDate.After(end) {
			tasks = append(tasks, *task)
		}
	}
	return tasks, nil
}

func (m *MockTaskRepository) GetVisibleTasks(ctx context.Context, user *models.User, start, end time.Time) ([]models.Task, error) {
	if m.GetVisibleTasksFunc != nil {
		return m.GetVisibleTasksFunc(ctx, user, start, end)
	}
	var tasks []models.Task
	for _, task := range m.Tasks {
		// Return all tasks for simplicity in tests
		if !task.DueDate.IsZero() && !task.DueDate.Before(start) && !task.DueDate.After(end) {
			tasks = append(tasks, *task)
		}
	}
	return tasks, nil
}

// AddTask is a helper method for setting up test data
func (m *MockTaskRepository) AddTask(task *models.Task) {
	m.Tasks[task.ID] = task
	if task.ID >= m.NextID {
		m.NextID = task.ID + 1
	}
}
