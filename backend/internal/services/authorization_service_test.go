package services

import (
	"context"
	"testing"

	"github.com/smith-dallin/manager-dashboard/internal/apperrors"
	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository/mocks"
)

func TestAuthorizationService_CanViewUser(t *testing.T) {
	supervisorID := int64(1)

	tests := []struct {
		name         string
		currentUser  *models.User
		targetUserID int64
		setupMocks   func(*mocks.MockUserRepository)
		wantErr      bool
		errType      apperrors.ErrorType
	}{
		{
			name: "admin can view anyone",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleAdmin,
			},
			targetUserID: 2,
			setupMocks:   func(m *mocks.MockUserRepository) {},
			wantErr:      false,
		},
		{
			name: "user can view themselves",
			currentUser: &models.User{
				ID:   2,
				Role: models.RoleEmployee,
			},
			targetUserID: 2,
			setupMocks:   func(m *mocks.MockUserRepository) {},
			wantErr:      false,
		},
		{
			name: "supervisor can view direct report",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleSupervisor,
			},
			targetUserID: 2,
			setupMocks: func(m *mocks.MockUserRepository) {
				m.AddUser(&models.User{
					ID:           2,
					Role:         models.RoleEmployee,
					SupervisorID: &supervisorID,
				})
			},
			wantErr: false,
		},
		{
			name: "supervisor cannot view non-report",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleSupervisor,
			},
			targetUserID: 3,
			setupMocks: func(m *mocks.MockUserRepository) {
				otherSupervisorID := int64(99)
				m.AddUser(&models.User{
					ID:           3,
					Role:         models.RoleEmployee,
					SupervisorID: &otherSupervisorID,
				})
			},
			wantErr: true,
			errType: apperrors.ErrorTypeForbidden,
		},
		{
			name: "employee cannot view other employees",
			currentUser: &models.User{
				ID:   2,
				Role: models.RoleEmployee,
			},
			targetUserID: 3,
			setupMocks: func(m *mocks.MockUserRepository) {
				m.AddUser(&models.User{
					ID:   3,
					Role: models.RoleEmployee,
				})
			},
			wantErr: true,
			errType: apperrors.ErrorTypeForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userRepo := mocks.NewMockUserRepository()
			tt.setupMocks(userRepo)

			svc := NewAuthorizationService(userRepo)
			err := svc.CanViewUser(context.Background(), tt.currentUser, tt.targetUserID)

			if tt.wantErr {
				if err == nil {
					t.Errorf("CanViewUser() expected error, got nil")
					return
				}
				if appErr, ok := err.(*apperrors.AppError); ok {
					if appErr.Type != tt.errType {
						t.Errorf("CanViewUser() error type = %v, want %v", appErr.Type, tt.errType)
					}
				}
			} else {
				if err != nil {
					t.Errorf("CanViewUser() unexpected error: %v", err)
				}
			}
		})
	}
}

func TestAuthorizationService_CanUpdateUser(t *testing.T) {
	supervisorID := int64(1)

	tests := []struct {
		name         string
		currentUser  *models.User
		targetUserID int64
		setupMocks   func(*mocks.MockUserRepository)
		wantErr      bool
	}{
		{
			name: "admin can update anyone",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleAdmin,
			},
			targetUserID: 2,
			setupMocks:   func(m *mocks.MockUserRepository) {},
			wantErr:      false,
		},
		{
			name: "user can update themselves",
			currentUser: &models.User{
				ID:   2,
				Role: models.RoleEmployee,
			},
			targetUserID: 2,
			setupMocks:   func(m *mocks.MockUserRepository) {},
			wantErr:      false,
		},
		{
			name: "supervisor can update direct report",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleSupervisor,
			},
			targetUserID: 2,
			setupMocks: func(m *mocks.MockUserRepository) {
				m.AddUser(&models.User{
					ID:           2,
					Role:         models.RoleEmployee,
					SupervisorID: &supervisorID,
				})
			},
			wantErr: false,
		},
		{
			name: "employee cannot update others",
			currentUser: &models.User{
				ID:   2,
				Role: models.RoleEmployee,
			},
			targetUserID: 3,
			setupMocks: func(m *mocks.MockUserRepository) {
				m.AddUser(&models.User{ID: 3, Role: models.RoleEmployee})
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userRepo := mocks.NewMockUserRepository()
			tt.setupMocks(userRepo)

			svc := NewAuthorizationService(userRepo)
			err := svc.CanUpdateUser(context.Background(), tt.currentUser, tt.targetUserID)

			if tt.wantErr && err == nil {
				t.Errorf("CanUpdateUser() expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("CanUpdateUser() unexpected error: %v", err)
			}
		})
	}
}

func TestAuthorizationService_CanDeleteUser(t *testing.T) {
	supervisorID := int64(1)

	tests := []struct {
		name         string
		currentUser  *models.User
		targetUserID int64
		setupMocks   func(*mocks.MockUserRepository)
		wantErr      bool
	}{
		{
			name: "admin can delete others",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleAdmin,
			},
			targetUserID: 2,
			setupMocks:   func(m *mocks.MockUserRepository) {},
			wantErr:      false,
		},
		{
			name: "admin cannot delete themselves",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleAdmin,
			},
			targetUserID: 1,
			setupMocks:   func(m *mocks.MockUserRepository) {},
			wantErr:      true,
		},
		{
			name: "supervisor can delete direct report",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleSupervisor,
			},
			targetUserID: 2,
			setupMocks: func(m *mocks.MockUserRepository) {
				m.AddUser(&models.User{
					ID:           2,
					Role:         models.RoleEmployee,
					SupervisorID: &supervisorID,
				})
			},
			wantErr: false,
		},
		{
			name: "employee cannot delete anyone",
			currentUser: &models.User{
				ID:   2,
				Role: models.RoleEmployee,
			},
			targetUserID: 3,
			setupMocks: func(m *mocks.MockUserRepository) {
				m.AddUser(&models.User{ID: 3, Role: models.RoleEmployee})
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userRepo := mocks.NewMockUserRepository()
			tt.setupMocks(userRepo)

			svc := NewAuthorizationService(userRepo)
			err := svc.CanDeleteUser(context.Background(), tt.currentUser, tt.targetUserID)

			if tt.wantErr && err == nil {
				t.Errorf("CanDeleteUser() expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("CanDeleteUser() unexpected error: %v", err)
			}
		})
	}
}

func TestAuthorizationService_CanManageSquads(t *testing.T) {
	tests := []struct {
		name        string
		currentUser *models.User
		wantErr     bool
	}{
		{
			name:        "admin can manage squads",
			currentUser: &models.User{ID: 1, Role: models.RoleAdmin},
			wantErr:     false,
		},
		{
			name:        "supervisor can manage squads",
			currentUser: &models.User{ID: 1, Role: models.RoleSupervisor},
			wantErr:     false,
		},
		{
			name:        "employee cannot manage squads",
			currentUser: &models.User{ID: 1, Role: models.RoleEmployee},
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewAuthorizationService(nil)
			err := svc.CanManageSquads(tt.currentUser)

			if tt.wantErr && err == nil {
				t.Errorf("CanManageSquads() expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("CanManageSquads() unexpected error: %v", err)
			}
		})
	}
}

func TestAuthorizationService_CanManageInvitations(t *testing.T) {
	tests := []struct {
		name        string
		currentUser *models.User
		wantErr     bool
	}{
		{
			name:        "admin can manage invitations",
			currentUser: &models.User{ID: 1, Role: models.RoleAdmin},
			wantErr:     false,
		},
		{
			name:        "supervisor cannot manage invitations",
			currentUser: &models.User{ID: 1, Role: models.RoleSupervisor},
			wantErr:     true,
		},
		{
			name:        "employee cannot manage invitations",
			currentUser: &models.User{ID: 1, Role: models.RoleEmployee},
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewAuthorizationService(nil)
			err := svc.CanManageInvitations(tt.currentUser)

			if tt.wantErr && err == nil {
				t.Errorf("CanManageInvitations() expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("CanManageInvitations() unexpected error: %v", err)
			}
		})
	}
}

func TestAuthorizationService_CanConfigureJira(t *testing.T) {
	tests := []struct {
		name        string
		currentUser *models.User
		wantErr     bool
	}{
		{
			name:        "admin can configure Jira",
			currentUser: &models.User{ID: 1, Role: models.RoleAdmin},
			wantErr:     false,
		},
		{
			name:        "supervisor cannot configure Jira",
			currentUser: &models.User{ID: 1, Role: models.RoleSupervisor},
			wantErr:     true,
		},
		{
			name:        "employee cannot configure Jira",
			currentUser: &models.User{ID: 1, Role: models.RoleEmployee},
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewAuthorizationService(nil)
			err := svc.CanConfigureJira(tt.currentUser)

			if tt.wantErr && err == nil {
				t.Errorf("CanConfigureJira() expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("CanConfigureJira() unexpected error: %v", err)
			}
		})
	}
}

func TestAuthorizationService_CanViewTimeOffRequest(t *testing.T) {
	supervisorID := int64(1)

	tests := []struct {
		name        string
		currentUser *models.User
		request     *models.TimeOffRequest
		wantErr     bool
	}{
		{
			name:        "admin can view any request",
			currentUser: &models.User{ID: 1, Role: models.RoleAdmin},
			request:     &models.TimeOffRequest{ID: 1, UserID: 2},
			wantErr:     false,
		},
		{
			name:        "user can view own request",
			currentUser: &models.User{ID: 2, Role: models.RoleEmployee},
			request:     &models.TimeOffRequest{ID: 1, UserID: 2},
			wantErr:     false,
		},
		{
			name:        "supervisor can view direct report's request",
			currentUser: &models.User{ID: 1, Role: models.RoleSupervisor},
			request: &models.TimeOffRequest{
				ID:     1,
				UserID: 2,
				User:   &models.User{ID: 2, SupervisorID: &supervisorID},
			},
			wantErr: false,
		},
		{
			name:        "employee cannot view other's request",
			currentUser: &models.User{ID: 3, Role: models.RoleEmployee},
			request:     &models.TimeOffRequest{ID: 1, UserID: 2},
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewAuthorizationService(nil)
			err := svc.CanViewTimeOffRequest(tt.currentUser, tt.request)

			if tt.wantErr && err == nil {
				t.Errorf("CanViewTimeOffRequest() expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("CanViewTimeOffRequest() unexpected error: %v", err)
			}
		})
	}
}

func TestAuthorizationService_CanReviewTimeOffRequest(t *testing.T) {
	supervisorID := int64(1)

	tests := []struct {
		name             string
		currentUser      *models.User
		requestingUserID int64
		setupMocks       func(*mocks.MockUserRepository)
		wantErr          bool
	}{
		{
			name:             "admin can review any request",
			currentUser:      &models.User{ID: 1, Role: models.RoleAdmin},
			requestingUserID: 2,
			setupMocks:       func(m *mocks.MockUserRepository) {},
			wantErr:          false,
		},
		{
			name:             "supervisor can review direct report's request",
			currentUser:      &models.User{ID: 1, Role: models.RoleSupervisor},
			requestingUserID: 2,
			setupMocks: func(m *mocks.MockUserRepository) {
				m.AddUser(&models.User{ID: 2, Role: models.RoleEmployee, SupervisorID: &supervisorID})
			},
			wantErr: false,
		},
		{
			name:             "supervisor cannot review non-report's request",
			currentUser:      &models.User{ID: 1, Role: models.RoleSupervisor},
			requestingUserID: 3,
			setupMocks: func(m *mocks.MockUserRepository) {
				otherSupervisorID := int64(99)
				m.AddUser(&models.User{ID: 3, Role: models.RoleEmployee, SupervisorID: &otherSupervisorID})
			},
			wantErr: true,
		},
		{
			name:             "employee cannot review requests",
			currentUser:      &models.User{ID: 2, Role: models.RoleEmployee},
			requestingUserID: 3,
			setupMocks:       func(m *mocks.MockUserRepository) {},
			wantErr:          true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userRepo := mocks.NewMockUserRepository()
			tt.setupMocks(userRepo)

			svc := NewAuthorizationService(userRepo)
			err := svc.CanReviewTimeOffRequest(context.Background(), tt.currentUser, tt.requestingUserID)

			if tt.wantErr && err == nil {
				t.Errorf("CanReviewTimeOffRequest() expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("CanReviewTimeOffRequest() unexpected error: %v", err)
			}
		})
	}
}

func TestAuthorizationService_CanManageOrgChart(t *testing.T) {
	tests := []struct {
		name        string
		currentUser *models.User
		wantErr     bool
	}{
		{
			name:        "admin can manage org chart",
			currentUser: &models.User{ID: 1, Role: models.RoleAdmin},
			wantErr:     false,
		},
		{
			name:        "supervisor can manage org chart",
			currentUser: &models.User{ID: 1, Role: models.RoleSupervisor},
			wantErr:     false,
		},
		{
			name:        "employee cannot manage org chart",
			currentUser: &models.User{ID: 1, Role: models.RoleEmployee},
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewAuthorizationService(nil)
			err := svc.CanManageOrgChart(tt.currentUser)

			if tt.wantErr && err == nil {
				t.Errorf("CanManageOrgChart() expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("CanManageOrgChart() unexpected error: %v", err)
			}
		})
	}
}

func TestAuthorizationService_CanPublishOrgChart(t *testing.T) {
	tests := []struct {
		name        string
		currentUser *models.User
		wantErr     bool
	}{
		{
			name:        "admin can publish org chart",
			currentUser: &models.User{ID: 1, Role: models.RoleAdmin},
			wantErr:     false,
		},
		{
			name:        "supervisor cannot publish org chart",
			currentUser: &models.User{ID: 1, Role: models.RoleSupervisor},
			wantErr:     true,
		},
		{
			name:        "employee cannot publish org chart",
			currentUser: &models.User{ID: 1, Role: models.RoleEmployee},
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewAuthorizationService(nil)
			err := svc.CanPublishOrgChart(tt.currentUser)

			if tt.wantErr && err == nil {
				t.Errorf("CanPublishOrgChart() expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("CanPublishOrgChart() unexpected error: %v", err)
			}
		})
	}
}
