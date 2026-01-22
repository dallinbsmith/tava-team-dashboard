package mocks

import (
	"context"

	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// MockUserRepository is a mock implementation of UserRepository for testing
type MockUserRepository struct {
	Users       map[int64]*models.User
	ByAuth0ID   map[string]*models.User
	ByEmail     map[string]*models.User
	Departments map[string]bool

	// Function hooks for custom behavior
	GetByIDFunc                        func(ctx context.Context, id int64) (*models.User, error)
	GetByAuth0IDFunc                   func(ctx context.Context, auth0ID string) (*models.User, error)
	GetByEmailFunc                     func(ctx context.Context, email string) (*models.User, error)
	GetAllFunc                         func(ctx context.Context) ([]models.User, error)
	CreateFunc                         func(ctx context.Context, req *models.CreateUserRequest, auth0ID string) (*models.User, error)
	UpdateFunc                         func(ctx context.Context, id int64, req *models.UpdateUserRequest) (*models.User, error)
	DeleteFunc                         func(ctx context.Context, id int64) error
	GetDirectReportsBySupervisorIDFunc func(ctx context.Context, supervisorID int64) ([]models.User, error)
	GetAllSupervisorsFunc              func(ctx context.Context) ([]models.User, error)
	GetAllDepartmentsFunc              func(ctx context.Context) ([]string, error)
	ClearDepartmentFunc                func(ctx context.Context, department string) error
	UpdateJiraSettingsFunc             func(ctx context.Context, id int64, req *models.UpdateJiraSettingsRequest) error
	ClearJiraSettingsFunc              func(ctx context.Context, id int64) error
	UpdateJiraAccountIDFunc            func(ctx context.Context, id int64, jiraAccountID *string) error
	SaveJiraOAuthTokensFunc            func(ctx context.Context, id int64, tokens *models.JiraOAuthTokens) error
	DeactivateFunc                     func(ctx context.Context, id int64) error
	ReactivateFunc                     func(ctx context.Context, id int64) error
}

// NewMockUserRepository creates a new mock user repository
func NewMockUserRepository() *MockUserRepository {
	return &MockUserRepository{
		Users:       make(map[int64]*models.User),
		ByAuth0ID:   make(map[string]*models.User),
		ByEmail:     make(map[string]*models.User),
		Departments: make(map[string]bool),
	}
}

func (m *MockUserRepository) GetByID(ctx context.Context, id int64) (*models.User, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	if user, ok := m.Users[id]; ok {
		return user, nil
	}
	return nil, nil
}

// GetByIDs returns multiple users by their IDs (batch loading for dataloaders)
func (m *MockUserRepository) GetByIDs(ctx context.Context, ids []int64) ([]models.User, error) {
	var users []models.User
	for _, id := range ids {
		if user, ok := m.Users[id]; ok {
			users = append(users, *user)
		}
	}
	return users, nil
}

func (m *MockUserRepository) GetByAuth0ID(ctx context.Context, auth0ID string) (*models.User, error) {
	if m.GetByAuth0IDFunc != nil {
		return m.GetByAuth0IDFunc(ctx, auth0ID)
	}
	if user, ok := m.ByAuth0ID[auth0ID]; ok {
		return user, nil
	}
	return nil, nil
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	if m.GetByEmailFunc != nil {
		return m.GetByEmailFunc(ctx, email)
	}
	if user, ok := m.ByEmail[email]; ok {
		return user, nil
	}
	return nil, nil
}

func (m *MockUserRepository) GetAll(ctx context.Context) ([]models.User, error) {
	if m.GetAllFunc != nil {
		return m.GetAllFunc(ctx)
	}
	users := make([]models.User, 0, len(m.Users))
	for _, user := range m.Users {
		users = append(users, *user)
	}
	return users, nil
}

func (m *MockUserRepository) Create(ctx context.Context, req *models.CreateUserRequest, auth0ID string) (*models.User, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, req, auth0ID)
	}
	user := &models.User{
		ID:        int64(len(m.Users) + 1),
		Auth0ID:   auth0ID,
		Email:     req.Email,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Role:      req.Role,
		Title:     req.Title,
		Department: req.Department,
	}
	m.Users[user.ID] = user
	m.ByAuth0ID[auth0ID] = user
	m.ByEmail[req.Email] = user
	return user, nil
}

func (m *MockUserRepository) Update(ctx context.Context, id int64, req *models.UpdateUserRequest) (*models.User, error) {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, id, req)
	}
	user, ok := m.Users[id]
	if !ok {
		return nil, nil
	}
	if req.FirstName != nil {
		user.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		user.LastName = *req.LastName
	}
	if req.Title != nil {
		user.Title = *req.Title
	}
	if req.Department != nil {
		user.Department = *req.Department
	}
	return user, nil
}

func (m *MockUserRepository) Delete(ctx context.Context, id int64) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	delete(m.Users, id)
	return nil
}

func (m *MockUserRepository) GetDirectReportsBySupervisorID(ctx context.Context, supervisorID int64) ([]models.User, error) {
	if m.GetDirectReportsBySupervisorIDFunc != nil {
		return m.GetDirectReportsBySupervisorIDFunc(ctx, supervisorID)
	}
	var reports []models.User
	for _, user := range m.Users {
		if user.SupervisorID != nil && *user.SupervisorID == supervisorID {
			reports = append(reports, *user)
		}
	}
	return reports, nil
}

func (m *MockUserRepository) GetAllSupervisors(ctx context.Context) ([]models.User, error) {
	if m.GetAllSupervisorsFunc != nil {
		return m.GetAllSupervisorsFunc(ctx)
	}
	var supervisors []models.User
	for _, user := range m.Users {
		if user.Role == models.RoleSupervisor || user.Role == models.RoleAdmin {
			supervisors = append(supervisors, *user)
		}
	}
	return supervisors, nil
}

func (m *MockUserRepository) GetAllDepartments(ctx context.Context) ([]string, error) {
	if m.GetAllDepartmentsFunc != nil {
		return m.GetAllDepartmentsFunc(ctx)
	}
	deptSet := make(map[string]bool)
	for _, user := range m.Users {
		if user.Department != "" {
			deptSet[user.Department] = true
		}
	}
	departments := make([]string, 0, len(deptSet))
	for dept := range deptSet {
		departments = append(departments, dept)
	}
	return departments, nil
}

func (m *MockUserRepository) ClearDepartment(ctx context.Context, department string) error {
	if m.ClearDepartmentFunc != nil {
		return m.ClearDepartmentFunc(ctx, department)
	}
	for _, user := range m.Users {
		if user.Department == department {
			user.Department = ""
		}
	}
	return nil
}

func (m *MockUserRepository) UpdateJiraSettings(ctx context.Context, id int64, req *models.UpdateJiraSettingsRequest) error {
	if m.UpdateJiraSettingsFunc != nil {
		return m.UpdateJiraSettingsFunc(ctx, id, req)
	}
	return nil
}

func (m *MockUserRepository) ClearJiraSettings(ctx context.Context, id int64) error {
	if m.ClearJiraSettingsFunc != nil {
		return m.ClearJiraSettingsFunc(ctx, id)
	}
	return nil
}

func (m *MockUserRepository) UpdateJiraAccountID(ctx context.Context, id int64, jiraAccountID *string) error {
	if m.UpdateJiraAccountIDFunc != nil {
		return m.UpdateJiraAccountIDFunc(ctx, id, jiraAccountID)
	}
	return nil
}

func (m *MockUserRepository) SaveJiraOAuthTokens(ctx context.Context, id int64, tokens *models.JiraOAuthTokens) error {
	if m.SaveJiraOAuthTokensFunc != nil {
		return m.SaveJiraOAuthTokensFunc(ctx, id, tokens)
	}
	return nil
}

func (m *MockUserRepository) Deactivate(ctx context.Context, id int64) error {
	if m.DeactivateFunc != nil {
		return m.DeactivateFunc(ctx, id)
	}
	if user, ok := m.Users[id]; ok {
		user.IsActive = false
	}
	return nil
}

func (m *MockUserRepository) Reactivate(ctx context.Context, id int64) error {
	if m.ReactivateFunc != nil {
		return m.ReactivateFunc(ctx, id)
	}
	if user, ok := m.Users[id]; ok {
		user.IsActive = true
	}
	return nil
}

// AddUser is a helper method for setting up test data
func (m *MockUserRepository) AddUser(user *models.User) {
	m.Users[user.ID] = user
	if user.Auth0ID != "" {
		m.ByAuth0ID[user.Auth0ID] = user
	}
	if user.Email != "" {
		m.ByEmail[user.Email] = user
	}
	if user.Department != "" {
		m.Departments[user.Department] = true
	}
}
