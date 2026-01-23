package models

import (
	"strings"
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
	if RoleAdmin != "admin" {
		t.Errorf("RoleAdmin = %v, want %v", RoleAdmin, "admin")
	}
}

func TestUser_IsAdmin(t *testing.T) {
	tests := []struct {
		name     string
		user     User
		expected bool
	}{
		{
			name:     "admin role returns true",
			user:     User{Role: RoleAdmin},
			expected: true,
		},
		{
			name:     "supervisor role returns false",
			user:     User{Role: RoleSupervisor},
			expected: false,
		},
		{
			name:     "employee role returns false",
			user:     User{Role: RoleEmployee},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.user.IsAdmin()
			if result != tt.expected {
				t.Errorf("IsAdmin() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestUser_IsSupervisorOrAdmin(t *testing.T) {
	tests := []struct {
		name     string
		user     User
		expected bool
	}{
		{
			name:     "admin role returns true",
			user:     User{Role: RoleAdmin},
			expected: true,
		},
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
			result := tt.user.IsSupervisorOrAdmin()
			if result != tt.expected {
				t.Errorf("IsSupervisorOrAdmin() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestUser_CanManage_AdminCases(t *testing.T) {
	adminID := int64(1)

	tests := []struct {
		name     string
		user     User
		target   User
		expected bool
	}{
		{
			name: "admin can manage anyone",
			user: User{
				ID:   adminID,
				Role: RoleAdmin,
			},
			target: User{
				ID:   2,
				Role: RoleEmployee,
			},
			expected: true,
		},
		{
			name: "admin can manage supervisors",
			user: User{
				ID:   adminID,
				Role: RoleAdmin,
			},
			target: User{
				ID:   3,
				Role: RoleSupervisor,
			},
			expected: true,
		},
		{
			name: "admin can manage user with no supervisor",
			user: User{
				ID:   adminID,
				Role: RoleAdmin,
			},
			target: User{
				ID:           4,
				Role:         RoleEmployee,
				SupervisorID: nil,
			},
			expected: true,
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

func TestUser_ToUserResponse(t *testing.T) {
	supervisorID := int64(1)
	user := User{
		ID:           2,
		Email:        "test@example.com",
		FirstName:    "Test",
		LastName:     "User",
		Role:         RoleEmployee,
		Title:        "Engineer",
		Department:   "Engineering",
		SupervisorID: &supervisorID,
		Squads:       []Squad{{ID: 1, Name: "Platform"}},
	}

	response := user.ToUserResponse()

	if response.ID != user.ID {
		t.Errorf("ToUserResponse().ID = %v, want %v", response.ID, user.ID)
	}
	if response.Email != user.Email {
		t.Errorf("ToUserResponse().Email = %v, want %v", response.Email, user.Email)
	}
	if response.FirstName != user.FirstName {
		t.Errorf("ToUserResponse().FirstName = %v, want %v", response.FirstName, user.FirstName)
	}
	if response.LastName != user.LastName {
		t.Errorf("ToUserResponse().LastName = %v, want %v", response.LastName, user.LastName)
	}
	if response.Role != user.Role {
		t.Errorf("ToUserResponse().Role = %v, want %v", response.Role, user.Role)
	}
	if len(response.Squads) != 1 {
		t.Errorf("ToUserResponse().Squads length = %v, want 1", len(response.Squads))
	}
}

func TestTimeOffStatus_Constants(t *testing.T) {
	if TimeOffStatusPending != "pending" {
		t.Errorf("TimeOffStatusPending = %v, want pending", TimeOffStatusPending)
	}
	if TimeOffStatusApproved != "approved" {
		t.Errorf("TimeOffStatusApproved = %v, want approved", TimeOffStatusApproved)
	}
	if TimeOffStatusRejected != "rejected" {
		t.Errorf("TimeOffStatusRejected = %v, want rejected", TimeOffStatusRejected)
	}
	if TimeOffStatusCancelled != "cancelled" {
		t.Errorf("TimeOffStatusCancelled = %v, want cancelled", TimeOffStatusCancelled)
	}
}

func TestCreateUserRequest_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     CreateUserRequest
		wantErr bool
	}{
		{
			name: "valid request",
			req: CreateUserRequest{
				Email:      "test@example.com",
				FirstName:  "Test",
				LastName:   "User",
				Role:       RoleEmployee,
				Department: "Engineering",
			},
			wantErr: false,
		},
		{
			name: "missing email",
			req: CreateUserRequest{
				FirstName:  "Test",
				LastName:   "User",
				Role:       RoleEmployee,
				Department: "Engineering",
			},
			wantErr: true,
		},
		{
			name: "missing first name",
			req: CreateUserRequest{
				Email:      "test@example.com",
				LastName:   "User",
				Role:       RoleEmployee,
				Department: "Engineering",
			},
			wantErr: true,
		},
		{
			name: "missing last name",
			req: CreateUserRequest{
				Email:      "test@example.com",
				FirstName:  "Test",
				Role:       RoleEmployee,
				Department: "Engineering",
			},
			wantErr: true,
		},
		{
			name: "missing role",
			req: CreateUserRequest{
				Email:      "test@example.com",
				FirstName:  "Test",
				LastName:   "User",
				Department: "Engineering",
			},
			wantErr: true,
		},
		{
			name: "department is optional",
			req: CreateUserRequest{
				Email:     "test@example.com",
				FirstName: "Test",
				LastName:  "User",
				Role:      RoleEmployee,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestCreateUserRequest_Validate_EdgeCases(t *testing.T) {
	tests := []struct {
		name    string
		req     CreateUserRequest
		wantErr bool
		errMsg  string
	}{
		{
			name: "invalid email format",
			req: CreateUserRequest{
				Email:      "not-an-email",
				FirstName:  "Test",
				LastName:   "User",
				Role:       RoleEmployee,
				Department: "Engineering",
			},
			wantErr: true,
			errMsg:  "invalid email",
		},
		{
			name: "invalid role",
			req: CreateUserRequest{
				Email:      "test@example.com",
				FirstName:  "Test",
				LastName:   "User",
				Role:       Role("invalid"),
				Department: "Engineering",
			},
			wantErr: true,
			errMsg:  "invalid role",
		},
		{
			name: "whitespace-only first name",
			req: CreateUserRequest{
				Email:      "test@example.com",
				FirstName:  "   ",
				LastName:   "User",
				Role:       RoleEmployee,
				Department: "Engineering",
			},
			wantErr: true,
			errMsg:  "first name",
		},
		{
			name: "whitespace-only last name",
			req: CreateUserRequest{
				Email:      "test@example.com",
				FirstName:  "Test",
				LastName:   "   ",
				Role:       RoleEmployee,
				Department: "Engineering",
			},
			wantErr: true,
			errMsg:  "last name",
		},
		{
			name: "admin role is valid",
			req: CreateUserRequest{
				Email:      "admin@example.com",
				FirstName:  "Admin",
				LastName:   "User",
				Role:       RoleAdmin,
				Department: "IT",
			},
			wantErr: false,
		},
		{
			name: "supervisor role is valid",
			req: CreateUserRequest{
				Email:      "supervisor@example.com",
				FirstName:  "Super",
				LastName:   "Visor",
				Role:       RoleSupervisor,
				Department: "Management",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr && tt.errMsg != "" && err != nil {
				if !strings.Contains(err.Error(), tt.errMsg) {
					t.Errorf("Validate() error = %v, should contain %v", err, tt.errMsg)
				}
			}
		})
	}
}

func TestUpdateUserRequest_Validate(t *testing.T) {
	validFirstName := "John"
	validLastName := "Doe"
	emptyFirstName := ""
	emptyLastName := ""
	whitespaceFirst := "   "
	whitespaceLast := "   "

	tests := []struct {
		name    string
		req     UpdateUserRequest
		wantErr bool
	}{
		{
			name:    "empty request is valid",
			req:     UpdateUserRequest{},
			wantErr: false,
		},
		{
			name: "valid first name update",
			req: UpdateUserRequest{
				FirstName: &validFirstName,
			},
			wantErr: false,
		},
		{
			name: "valid last name update",
			req: UpdateUserRequest{
				LastName: &validLastName,
			},
			wantErr: false,
		},
		{
			name: "empty first name is invalid",
			req: UpdateUserRequest{
				FirstName: &emptyFirstName,
			},
			wantErr: true,
		},
		{
			name: "empty last name is invalid",
			req: UpdateUserRequest{
				LastName: &emptyLastName,
			},
			wantErr: true,
		},
		{
			name: "whitespace first name is invalid",
			req: UpdateUserRequest{
				FirstName: &whitespaceFirst,
			},
			wantErr: true,
		},
		{
			name: "whitespace last name is invalid",
			req: UpdateUserRequest{
				LastName: &whitespaceLast,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestCreateTimeOffRequestInput_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     CreateTimeOffRequestInput
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid request",
			req: CreateTimeOffRequestInput{
				StartDate:   "2024-01-15",
				EndDate:     "2024-01-16",
				RequestType: TimeOffTypeVacation,
			},
			wantErr: false,
		},
		{
			name: "missing start_date",
			req: CreateTimeOffRequestInput{
				EndDate:     "2024-01-16",
				RequestType: TimeOffTypeVacation,
			},
			wantErr: true,
			errMsg:  "start_date",
		},
		{
			name: "missing end_date",
			req: CreateTimeOffRequestInput{
				StartDate:   "2024-01-15",
				RequestType: TimeOffTypeVacation,
			},
			wantErr: true,
			errMsg:  "end_date",
		},
		{
			name: "invalid request_type",
			req: CreateTimeOffRequestInput{
				StartDate:   "2024-01-15",
				EndDate:     "2024-01-16",
				RequestType: TimeOffType("invalid"),
			},
			wantErr: true,
			errMsg:  "request_type",
		},
		{
			name: "end_date before start_date",
			req: CreateTimeOffRequestInput{
				StartDate:   "2024-01-16",
				EndDate:     "2024-01-15",
				RequestType: TimeOffTypeVacation,
			},
			wantErr: true,
			errMsg:  "end_date must be on or after",
		},
		{
			name: "invalid start_date format",
			req: CreateTimeOffRequestInput{
				StartDate:   "01-15-2024",
				EndDate:     "2024-01-16",
				RequestType: TimeOffTypeVacation,
			},
			wantErr: true,
			errMsg:  "start_date format",
		},
		{
			name: "invalid end_date format",
			req: CreateTimeOffRequestInput{
				StartDate:   "2024-01-15",
				EndDate:     "01-16-2024",
				RequestType: TimeOffTypeVacation,
			},
			wantErr: true,
			errMsg:  "end_date format",
		},
		{
			name: "sick time off type is valid",
			req: CreateTimeOffRequestInput{
				StartDate:   "2024-01-15",
				EndDate:     "2024-01-15",
				RequestType: TimeOffTypeSick,
			},
			wantErr: false,
		},
		{
			name: "personal time off type is valid",
			req: CreateTimeOffRequestInput{
				StartDate:   "2024-01-15",
				EndDate:     "2024-01-15",
				RequestType: TimeOffTypePersonal,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr && tt.errMsg != "" && err != nil {
				if !strings.Contains(err.Error(), tt.errMsg) {
					t.Errorf("Validate() error = %v, should contain %v", err, tt.errMsg)
				}
			}
		})
	}
}

func TestReviewTimeOffRequestInput_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     ReviewTimeOffRequestInput
		wantErr bool
	}{
		{
			name: "valid approved status",
			req: ReviewTimeOffRequestInput{
				Status: TimeOffStatusApproved,
			},
			wantErr: false,
		},
		{
			name: "valid rejected status",
			req: ReviewTimeOffRequestInput{
				Status: TimeOffStatusRejected,
			},
			wantErr: false,
		},
		{
			name: "pending status is invalid for review",
			req: ReviewTimeOffRequestInput{
				Status: TimeOffStatusPending,
			},
			wantErr: true,
		},
		{
			name: "cancelled status is invalid for review",
			req: ReviewTimeOffRequestInput{
				Status: TimeOffStatusCancelled,
			},
			wantErr: true,
		},
		{
			name: "invalid status",
			req: ReviewTimeOffRequestInput{
				Status: TimeOffStatus("invalid"),
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidRoles(t *testing.T) {
	tests := []struct {
		role     Role
		expected bool
	}{
		{RoleAdmin, true},
		{RoleSupervisor, true},
		{RoleEmployee, true},
		{Role("invalid"), false},
		{Role(""), false},
	}

	for _, tt := range tests {
		t.Run(string(tt.role), func(t *testing.T) {
			if ValidRoles[tt.role] != tt.expected {
				t.Errorf("ValidRoles[%v] = %v, want %v", tt.role, ValidRoles[tt.role], tt.expected)
			}
		})
	}
}

func TestValidTimeOffStatuses(t *testing.T) {
	tests := []struct {
		status   TimeOffStatus
		expected bool
	}{
		{TimeOffStatusPending, true},
		{TimeOffStatusApproved, true},
		{TimeOffStatusRejected, true},
		{TimeOffStatusCancelled, true},
		{TimeOffStatus("invalid"), false},
		{TimeOffStatus(""), false},
	}

	for _, tt := range tests {
		t.Run(string(tt.status), func(t *testing.T) {
			if ValidTimeOffStatuses[tt.status] != tt.expected {
				t.Errorf("ValidTimeOffStatuses[%v] = %v, want %v", tt.status, ValidTimeOffStatuses[tt.status], tt.expected)
			}
		})
	}
}

func TestValidTimeOffTypes(t *testing.T) {
	tests := []struct {
		timeOffType TimeOffType
		expected    bool
	}{
		{TimeOffTypeVacation, true},
		{TimeOffTypeSick, true},
		{TimeOffTypePersonal, true},
		{TimeOffTypeBereavement, true},
		{TimeOffTypeJuryDuty, true},
		{TimeOffTypeOther, true},
		{TimeOffType("invalid"), false},
		{TimeOffType(""), false},
	}

	for _, tt := range tests {
		t.Run(string(tt.timeOffType), func(t *testing.T) {
			if ValidTimeOffTypes[tt.timeOffType] != tt.expected {
				t.Errorf("ValidTimeOffTypes[%v] = %v, want %v", tt.timeOffType, ValidTimeOffTypes[tt.timeOffType], tt.expected)
			}
		})
	}
}

func TestUser_CanManage_NilTarget(t *testing.T) {
	// Admin can manage anyone (including nil check returns early)
	admin := User{
		ID:   1,
		Role: RoleAdmin,
	}

	// Admin returns true before checking target
	result := admin.CanManage(nil)
	if !result {
		t.Error("Admin CanManage(nil) should return true (admin check passes first)")
	}
}

func TestTaskStatus_Constants(t *testing.T) {
	if TaskStatusPending != "pending" {
		t.Errorf("TaskStatusPending = %v, want pending", TaskStatusPending)
	}
	if TaskStatusInProgress != "in_progress" {
		t.Errorf("TaskStatusInProgress = %v, want in_progress", TaskStatusInProgress)
	}
	if TaskStatusCompleted != "completed" {
		t.Errorf("TaskStatusCompleted = %v, want completed", TaskStatusCompleted)
	}
	if TaskStatusCancelled != "cancelled" {
		t.Errorf("TaskStatusCancelled = %v, want cancelled", TaskStatusCancelled)
	}
}

func TestInvitationStatus_Constants(t *testing.T) {
	if InvitationStatusPending != "pending" {
		t.Errorf("InvitationStatusPending = %v, want pending", InvitationStatusPending)
	}
	if InvitationStatusAccepted != "accepted" {
		t.Errorf("InvitationStatusAccepted = %v, want accepted", InvitationStatusAccepted)
	}
	if InvitationStatusRevoked != "revoked" {
		t.Errorf("InvitationStatusRevoked = %v, want revoked", InvitationStatusRevoked)
	}
	if InvitationStatusExpired != "expired" {
		t.Errorf("InvitationStatusExpired = %v, want expired", InvitationStatusExpired)
	}
}

func TestAssignmentType_Constants(t *testing.T) {
	if AssignmentTypeUser != "user" {
		t.Errorf("AssignmentTypeUser = %v, want user", AssignmentTypeUser)
	}
	if AssignmentTypeSquad != "squad" {
		t.Errorf("AssignmentTypeSquad = %v, want squad", AssignmentTypeSquad)
	}
	if AssignmentTypeDepartment != "department" {
		t.Errorf("AssignmentTypeDepartment = %v, want department", AssignmentTypeDepartment)
	}
}

func TestResponseStatus_Constants(t *testing.T) {
	if ResponseStatusPending != "pending" {
		t.Errorf("ResponseStatusPending = %v, want pending", ResponseStatusPending)
	}
	if ResponseStatusAccepted != "accepted" {
		t.Errorf("ResponseStatusAccepted = %v, want accepted", ResponseStatusAccepted)
	}
	if ResponseStatusDeclined != "declined" {
		t.Errorf("ResponseStatusDeclined = %v, want declined", ResponseStatusDeclined)
	}
	if ResponseStatusTentative != "tentative" {
		t.Errorf("ResponseStatusTentative = %v, want tentative", ResponseStatusTentative)
	}
}
