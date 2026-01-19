package models

import (
	"testing"
)

func TestUser_IsSupervisor(t *testing.T) {
	tests := []struct {
		name     string
		user     User
		expected bool
	}{
		{
			name:     "supervisor role returns true",
			user:     User{Role: RoleSupervisor},
			expected: true,
		},
		{
			name:     "employee role returns false",
			user:     User{Role: RoleEmployee},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.user.IsSupervisor()
			if result != tt.expected {
				t.Errorf("IsSupervisor() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestUser_CanManage(t *testing.T) {
	supervisorID := int64(1)
	otherSupervisorID := int64(2)

	tests := []struct {
		name       string
		user       User
		target     User
		expected   bool
	}{
		{
			name: "supervisor can manage their direct report",
			user: User{
				ID:   supervisorID,
				Role: RoleSupervisor,
			},
			target: User{
				ID:           3,
				SupervisorID: &supervisorID,
				Role:         RoleEmployee,
			},
			expected: true,
		},
		{
			name: "supervisor can manage another supervisor under them",
			user: User{
				ID:   supervisorID,
				Role: RoleSupervisor,
			},
			target: User{
				ID:           4,
				SupervisorID: &supervisorID,
				Role:         RoleSupervisor,
			},
			expected: true,
		},
		{
			name: "supervisor cannot manage someone not under them",
			user: User{
				ID:   supervisorID,
				Role: RoleSupervisor,
			},
			target: User{
				ID:           5,
				SupervisorID: &otherSupervisorID,
				Role:         RoleEmployee,
			},
			expected: false,
		},
		{
			name: "supervisor cannot manage user with no supervisor",
			user: User{
				ID:   supervisorID,
				Role: RoleSupervisor,
			},
			target: User{
				ID:           6,
				SupervisorID: nil,
				Role:         RoleEmployee,
			},
			expected: false,
		},
		{
			name: "employee cannot manage anyone",
			user: User{
				ID:   7,
				Role: RoleEmployee,
			},
			target: User{
				ID:           8,
				SupervisorID: nil,
				Role:         RoleEmployee,
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.user.CanManage(&tt.target)
			if result != tt.expected {
				t.Errorf("CanManage() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestRole_Constants(t *testing.T) {
	if RoleSupervisor != "supervisor" {
		t.Errorf("RoleSupervisor = %v, want %v", RoleSupervisor, "supervisor")
	}
	if RoleEmployee != "employee" {
		t.Errorf("RoleEmployee = %v, want %v", RoleEmployee, "employee")
	}
}
