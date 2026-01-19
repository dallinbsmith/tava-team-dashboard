package services

import (
	"context"
	"errors"
	"testing"

	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository/mocks"
)

func TestUserService_GetByID(t *testing.T) {
	tests := []struct {
		name        string
		userID      int64
		setupMocks  func(*mocks.MockUserRepository, *mocks.MockSquadRepository)
		wantErr     bool
		wantSquads  int
	}{
		{
			name:   "returns user with squads",
			userID: 1,
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				userRepo.AddUser(&models.User{
					ID:        1,
					Email:     "test@example.com",
					FirstName: "Test",
					LastName:  "User",
					Role:      models.RoleEmployee,
				})
				squadRepo.AddSquad(&models.Squad{ID: 1, Name: "Engineering"})
				squadRepo.AddSquad(&models.Squad{ID: 2, Name: "Platform"})
				squadRepo.AssignUserToSquad(1, 1)
				squadRepo.AssignUserToSquad(1, 2)
			},
			wantErr:    false,
			wantSquads: 2,
		},
		{
			name:   "returns user with no squads",
			userID: 1,
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				userRepo.AddUser(&models.User{
					ID:        1,
					Email:     "test@example.com",
					FirstName: "Test",
					LastName:  "User",
					Role:      models.RoleEmployee,
				})
			},
			wantErr:    false,
			wantSquads: 0,
		},
		{
			name:   "returns error when user not found",
			userID: 999,
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				userRepo.GetByIDFunc = func(ctx context.Context, id int64) (*models.User, error) {
					return nil, errors.New("user not found")
				}
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userRepo := mocks.NewMockUserRepository()
			squadRepo := mocks.NewMockSquadRepository()
			tt.setupMocks(userRepo, squadRepo)

			svc := NewUserService(userRepo, squadRepo)
			user, err := svc.GetByID(context.Background(), tt.userID)

			if tt.wantErr {
				if err == nil {
					t.Errorf("GetByID() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("GetByID() unexpected error: %v", err)
				return
			}

			if user == nil {
				t.Errorf("GetByID() returned nil user")
				return
			}

			if len(user.Squads) != tt.wantSquads {
				t.Errorf("GetByID() squads = %d, want %d", len(user.Squads), tt.wantSquads)
			}
		})
	}
}

func TestUserService_GetAll(t *testing.T) {
	tests := []struct {
		name       string
		setupMocks func(*mocks.MockUserRepository, *mocks.MockSquadRepository)
		wantUsers  int
		wantErr    bool
	}{
		{
			name: "returns all users with squads",
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				userRepo.AddUser(&models.User{ID: 1, Email: "user1@example.com", FirstName: "User", LastName: "One", Role: models.RoleEmployee})
				userRepo.AddUser(&models.User{ID: 2, Email: "user2@example.com", FirstName: "User", LastName: "Two", Role: models.RoleEmployee})
				squadRepo.AddSquad(&models.Squad{ID: 1, Name: "Engineering"})
				squadRepo.AssignUserToSquad(1, 1)
			},
			wantUsers: 2,
			wantErr:   false,
		},
		{
			name: "returns empty list when no users",
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				// No users added
			},
			wantUsers: 0,
			wantErr:   false,
		},
		{
			name: "returns error when repository fails",
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				userRepo.GetAllFunc = func(ctx context.Context) ([]models.User, error) {
					return nil, errors.New("database error")
				}
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userRepo := mocks.NewMockUserRepository()
			squadRepo := mocks.NewMockSquadRepository()
			tt.setupMocks(userRepo, squadRepo)

			svc := NewUserService(userRepo, squadRepo)
			users, err := svc.GetAll(context.Background())

			if tt.wantErr {
				if err == nil {
					t.Errorf("GetAll() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("GetAll() unexpected error: %v", err)
				return
			}

			if len(users) != tt.wantUsers {
				t.Errorf("GetAll() users = %d, want %d", len(users), tt.wantUsers)
			}
		})
	}
}

func TestUserService_GetDirectReports(t *testing.T) {
	supervisorID := int64(1)

	tests := []struct {
		name        string
		setupMocks  func(*mocks.MockUserRepository, *mocks.MockSquadRepository)
		wantReports int
		wantErr     bool
	}{
		{
			name: "returns direct reports with squads",
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				userRepo.AddUser(&models.User{ID: 1, Email: "supervisor@example.com", FirstName: "Super", LastName: "Visor", Role: models.RoleSupervisor})
				userRepo.AddUser(&models.User{ID: 2, Email: "report1@example.com", FirstName: "Report", LastName: "One", Role: models.RoleEmployee, SupervisorID: &supervisorID})
				userRepo.AddUser(&models.User{ID: 3, Email: "report2@example.com", FirstName: "Report", LastName: "Two", Role: models.RoleEmployee, SupervisorID: &supervisorID})
				squadRepo.AddSquad(&models.Squad{ID: 1, Name: "Engineering"})
				squadRepo.AssignUserToSquad(2, 1)
			},
			wantReports: 2,
			wantErr:     false,
		},
		{
			name: "returns empty when no direct reports",
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				userRepo.AddUser(&models.User{ID: 1, Email: "supervisor@example.com", FirstName: "Super", LastName: "Visor", Role: models.RoleSupervisor})
			},
			wantReports: 0,
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userRepo := mocks.NewMockUserRepository()
			squadRepo := mocks.NewMockSquadRepository()
			tt.setupMocks(userRepo, squadRepo)

			svc := NewUserService(userRepo, squadRepo)
			reports, err := svc.GetDirectReports(context.Background(), supervisorID)

			if tt.wantErr {
				if err == nil {
					t.Errorf("GetDirectReports() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("GetDirectReports() unexpected error: %v", err)
				return
			}

			if len(reports) != tt.wantReports {
				t.Errorf("GetDirectReports() reports = %d, want %d", len(reports), tt.wantReports)
			}
		})
	}
}

func TestUserService_GetEmployeesForUser(t *testing.T) {
	supervisorID := int64(1)

	tests := []struct {
		name         string
		currentUser  *models.User
		setupMocks   func(*mocks.MockUserRepository, *mocks.MockSquadRepository)
		wantEmployees int
		wantErr      bool
	}{
		{
			name: "admin sees all users",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleAdmin,
			},
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				userRepo.AddUser(&models.User{ID: 1, Email: "admin@example.com", FirstName: "Admin", LastName: "User", Role: models.RoleAdmin})
				userRepo.AddUser(&models.User{ID: 2, Email: "user1@example.com", FirstName: "User", LastName: "One", Role: models.RoleEmployee})
				userRepo.AddUser(&models.User{ID: 3, Email: "user2@example.com", FirstName: "User", LastName: "Two", Role: models.RoleEmployee})
			},
			wantEmployees: 3,
			wantErr:       false,
		},
		{
			name: "supervisor sees direct reports",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleSupervisor,
			},
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				userRepo.AddUser(&models.User{ID: 1, Email: "supervisor@example.com", FirstName: "Super", LastName: "Visor", Role: models.RoleSupervisor})
				userRepo.AddUser(&models.User{ID: 2, Email: "report1@example.com", FirstName: "Report", LastName: "One", Role: models.RoleEmployee, SupervisorID: &supervisorID})
				userRepo.AddUser(&models.User{ID: 3, Email: "other@example.com", FirstName: "Other", LastName: "User", Role: models.RoleEmployee})
			},
			wantEmployees: 1,
			wantErr:       false,
		},
		{
			name: "employee sees only themselves",
			currentUser: &models.User{
				ID:        2,
				Email:     "employee@example.com",
				FirstName: "Employee",
				LastName:  "User",
				Role:      models.RoleEmployee,
			},
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				userRepo.AddUser(&models.User{ID: 2, Email: "employee@example.com", FirstName: "Employee", LastName: "User", Role: models.RoleEmployee})
				userRepo.AddUser(&models.User{ID: 3, Email: "other@example.com", FirstName: "Other", LastName: "User", Role: models.RoleEmployee})
			},
			wantEmployees: 1,
			wantErr:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userRepo := mocks.NewMockUserRepository()
			squadRepo := mocks.NewMockSquadRepository()
			tt.setupMocks(userRepo, squadRepo)

			svc := NewUserService(userRepo, squadRepo)
			employees, err := svc.GetEmployeesForUser(context.Background(), tt.currentUser)

			if tt.wantErr {
				if err == nil {
					t.Errorf("GetEmployeesForUser() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("GetEmployeesForUser() unexpected error: %v", err)
				return
			}

			if len(employees) != tt.wantEmployees {
				t.Errorf("GetEmployeesForUser() employees = %d, want %d", len(employees), tt.wantEmployees)
			}
		})
	}
}

func TestUserService_Update(t *testing.T) {
	firstName := "Updated"
	lastName := "Name"

	tests := []struct {
		name       string
		userID     int64
		req        *models.UpdateUserRequest
		setupMocks func(*mocks.MockUserRepository, *mocks.MockSquadRepository)
		wantErr    bool
		wantName   string
	}{
		{
			name:   "updates user successfully",
			userID: 1,
			req: &models.UpdateUserRequest{
				FirstName: &firstName,
				LastName:  &lastName,
			},
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				userRepo.AddUser(&models.User{ID: 1, Email: "test@example.com", FirstName: "Test", LastName: "User", Role: models.RoleEmployee})
			},
			wantErr:  false,
			wantName: "Updated",
		},
		{
			name:   "updates user with squads",
			userID: 1,
			req: &models.UpdateUserRequest{
				FirstName: &firstName,
				SquadIDs:  []int64{1, 2},
			},
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				userRepo.AddUser(&models.User{ID: 1, Email: "test@example.com", FirstName: "Test", LastName: "User", Role: models.RoleEmployee})
				squadRepo.AddSquad(&models.Squad{ID: 1, Name: "Engineering"})
				squadRepo.AddSquad(&models.Squad{ID: 2, Name: "Platform"})
			},
			wantErr:  false,
			wantName: "Updated",
		},
		{
			name:   "returns error when user not found",
			userID: 999,
			req: &models.UpdateUserRequest{
				FirstName: &firstName,
			},
			setupMocks: func(userRepo *mocks.MockUserRepository, squadRepo *mocks.MockSquadRepository) {
				userRepo.UpdateFunc = func(ctx context.Context, id int64, req *models.UpdateUserRequest) (*models.User, error) {
					return nil, errors.New("user not found")
				}
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userRepo := mocks.NewMockUserRepository()
			squadRepo := mocks.NewMockSquadRepository()
			tt.setupMocks(userRepo, squadRepo)

			svc := NewUserService(userRepo, squadRepo)
			user, err := svc.Update(context.Background(), tt.userID, tt.req)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Update() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("Update() unexpected error: %v", err)
				return
			}

			if user == nil {
				t.Errorf("Update() returned nil user")
				return
			}

			if user.FirstName != tt.wantName {
				t.Errorf("Update() firstName = %s, want %s", user.FirstName, tt.wantName)
			}
		})
	}
}

func TestUserService_loadSquadsForUsers(t *testing.T) {
	t.Run("batch loads squads correctly", func(t *testing.T) {
		userRepo := mocks.NewMockUserRepository()
		squadRepo := mocks.NewMockSquadRepository()

		// Setup data
		squadRepo.AddSquad(&models.Squad{ID: 1, Name: "Engineering"})
		squadRepo.AddSquad(&models.Squad{ID: 2, Name: "Platform"})
		squadRepo.AddSquad(&models.Squad{ID: 3, Name: "QA"})
		squadRepo.AssignUserToSquad(1, 1)
		squadRepo.AssignUserToSquad(1, 2)
		squadRepo.AssignUserToSquad(2, 2)
		squadRepo.AssignUserToSquad(3, 3)

		users := []models.User{
			{ID: 1, Email: "user1@example.com"},
			{ID: 2, Email: "user2@example.com"},
			{ID: 3, Email: "user3@example.com"},
			{ID: 4, Email: "user4@example.com"}, // No squads
		}

		svc := NewUserService(userRepo, squadRepo)
		result, err := svc.loadSquadsForUsers(context.Background(), users)

		if err != nil {
			t.Errorf("loadSquadsForUsers() unexpected error: %v", err)
			return
		}

		if len(result) != 4 {
			t.Errorf("loadSquadsForUsers() users = %d, want 4", len(result))
		}

		// Verify squad assignments
		userSquadCounts := map[int64]int{1: 2, 2: 1, 3: 1, 4: 0}
		for _, user := range result {
			expected := userSquadCounts[user.ID]
			if len(user.Squads) != expected {
				t.Errorf("User %d squads = %d, want %d", user.ID, len(user.Squads), expected)
			}
		}
	})

	t.Run("handles empty user list", func(t *testing.T) {
		userRepo := mocks.NewMockUserRepository()
		squadRepo := mocks.NewMockSquadRepository()

		svc := NewUserService(userRepo, squadRepo)
		result, err := svc.loadSquadsForUsers(context.Background(), []models.User{})

		if err != nil {
			t.Errorf("loadSquadsForUsers() unexpected error: %v", err)
		}

		if len(result) != 0 {
			t.Errorf("loadSquadsForUsers() users = %d, want 0", len(result))
		}
	})
}
