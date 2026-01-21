package models

import (
	"fmt"
	"net/mail"
	"strings"
	"time"
)

type Role string

const (
	RoleAdmin      Role = "admin"
	RoleSupervisor Role = "supervisor"
	RoleEmployee   Role = "employee"
)

// ValidRoles contains all valid role values
var ValidRoles = map[Role]bool{
	RoleAdmin:      true,
	RoleSupervisor: true,
	RoleEmployee:   true,
}

// Validation constants
const (
	MaxNameLength       = 100
	MaxDepartmentLength = 100
	MaxSquadLength      = 100
	MaxEmailLength      = 254
)

// Squad represents a team/squad that users can belong to
type Squad struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type User struct {
	ID           int64      `json:"id"`
	Auth0ID      string     `json:"auth0_id"`
	Email        string     `json:"email"`
	FirstName    string     `json:"first_name"`
	LastName     string     `json:"last_name"`
	Role         Role       `json:"role"`
	Title        string     `json:"title"`
	Department   string     `json:"department"`
	Squads       []Squad    `json:"squads"`
	AvatarURL    *string    `json:"avatar_url,omitempty"`
	SupervisorID *int64     `json:"supervisor_id,omitempty"`
	DateStarted  *time.Time `json:"date_started,omitempty"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	// Jira integration fields (legacy API token auth)
	JiraDomain   *string `json:"jira_domain,omitempty"`
	JiraEmail    *string `json:"jira_email,omitempty"`
	JiraAPIToken *string `json:"-"` // Never expose in JSON
	// Jira OAuth 2.0 fields
	JiraOAuthAccessToken  *string    `json:"-"` // Never expose in JSON
	JiraOAuthRefreshToken *string    `json:"-"` // Never expose in JSON
	JiraOAuthTokenExpires *time.Time `json:"-"` // Never expose in JSON
	JiraCloudID           *string    `json:"jira_cloud_id,omitempty"`
	JiraSiteURL           *string    `json:"jira_site_url,omitempty"`
	// Jira account matching (for org-wide Jira connection)
	JiraAccountID *string `json:"jira_account_id,omitempty"`
}

// HasJiraConfigured checks if user has Jira credentials configured (either OAuth or legacy API token)
func (u *User) HasJiraConfigured() bool {
	return u.HasJiraOAuth() || u.HasJiraAPIToken()
}

// HasJiraOAuth checks if user has Jira OAuth configured
func (u *User) HasJiraOAuth() bool {
	return u.JiraOAuthAccessToken != nil && u.JiraCloudID != nil &&
		*u.JiraOAuthAccessToken != "" && *u.JiraCloudID != ""
}

// HasJiraAPIToken checks if user has legacy Jira API token configured
func (u *User) HasJiraAPIToken() bool {
	return u.JiraDomain != nil && u.JiraEmail != nil && u.JiraAPIToken != nil &&
		*u.JiraDomain != "" && *u.JiraEmail != "" && *u.JiraAPIToken != ""
}

// IsJiraTokenExpired checks if the OAuth token is expired
func (u *User) IsJiraTokenExpired() bool {
	if u.JiraOAuthTokenExpires == nil {
		return true
	}
	// Consider token expired if it expires within 5 minutes
	return time.Now().Add(5 * time.Minute).After(*u.JiraOAuthTokenExpires)
}

// Employee represents a user with their supervisor info
type Employee struct {
	User
	Supervisor *User `json:"supervisor,omitempty"`
}

// Supervisor represents a supervisor with their direct reports
type Supervisor struct {
	User
	DirectReports []User `json:"direct_reports,omitempty"`
}

type CreateUserRequest struct {
	Email        string  `json:"email"`
	FirstName    string  `json:"first_name"`
	LastName     string  `json:"last_name"`
	Role         Role    `json:"role"`
	Title        string  `json:"title"`
	Department   string  `json:"department"`
	SquadIDs     []int64 `json:"squad_ids,omitempty"`
	SupervisorID *int64  `json:"supervisor_id,omitempty"`
	AvatarURL    *string `json:"avatar_url,omitempty"`
}

type UpdateUserRequest struct {
	FirstName    *string `json:"first_name,omitempty"`
	LastName     *string `json:"last_name,omitempty"`
	Role         *Role   `json:"role,omitempty"`
	Title        *string `json:"title,omitempty"`
	Department   *string `json:"department,omitempty"`
	SquadIDs     []int64 `json:"squad_ids,omitempty"`
	SupervisorID *int64  `json:"supervisor_id,omitempty"`
	AvatarURL    *string `json:"avatar_url,omitempty"`
}

// IsAdmin checks if the user has admin role
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}

// IsSupervisor checks if the user has supervisor role
func (u *User) IsSupervisor() bool {
	return u.Role == RoleSupervisor
}

// IsSupervisorOrAdmin checks if user has supervisor or admin role
func (u *User) IsSupervisorOrAdmin() bool {
	return u.Role == RoleSupervisor || u.Role == RoleAdmin
}

// CanManage checks if this user can manage the target user
// Admins can manage anyone, supervisors can manage their direct reports
func (u *User) CanManage(target *User) bool {
	if u.IsAdmin() {
		return true
	}
	if !u.IsSupervisor() {
		return false
	}
	if target.SupervisorID == nil {
		return false
	}
	return *target.SupervisorID == u.ID
}

// Validate validates the CreateUserRequest
func (r *CreateUserRequest) Validate() error {
	// Email validation
	if r.Email == "" {
		return fmt.Errorf("email is required")
	}
	if len(r.Email) > MaxEmailLength {
		return fmt.Errorf("email must be less than %d characters", MaxEmailLength)
	}
	if _, err := mail.ParseAddress(r.Email); err != nil {
		return fmt.Errorf("invalid email format")
	}

	// Name validation
	r.FirstName = strings.TrimSpace(r.FirstName)
	r.LastName = strings.TrimSpace(r.LastName)
	if r.FirstName == "" {
		return fmt.Errorf("first name is required")
	}
	if r.LastName == "" {
		return fmt.Errorf("last name is required")
	}
	if len(r.FirstName) > MaxNameLength {
		return fmt.Errorf("first name must be less than %d characters", MaxNameLength)
	}
	if len(r.LastName) > MaxNameLength {
		return fmt.Errorf("last name must be less than %d characters", MaxNameLength)
	}

	// Role validation
	if !ValidRoles[r.Role] {
		return fmt.Errorf("invalid role: must be 'admin', 'supervisor', or 'employee'")
	}

	// Department validation
	r.Department = strings.TrimSpace(r.Department)
	if len(r.Department) > MaxDepartmentLength {
		return fmt.Errorf("department must be less than %d characters", MaxDepartmentLength)
	}

	// SquadIDs are validated at the repository level

	return nil
}

// Validate validates the UpdateUserRequest
func (r *UpdateUserRequest) Validate() error {
	// Name validation
	if r.FirstName != nil {
		*r.FirstName = strings.TrimSpace(*r.FirstName)
		if *r.FirstName == "" {
			return fmt.Errorf("first name cannot be empty")
		}
		if len(*r.FirstName) > MaxNameLength {
			return fmt.Errorf("first name must be less than %d characters", MaxNameLength)
		}
	}
	if r.LastName != nil {
		*r.LastName = strings.TrimSpace(*r.LastName)
		if *r.LastName == "" {
			return fmt.Errorf("last name cannot be empty")
		}
		if len(*r.LastName) > MaxNameLength {
			return fmt.Errorf("last name must be less than %d characters", MaxNameLength)
		}
	}

	// Role validation
	if r.Role != nil && !ValidRoles[*r.Role] {
		return fmt.Errorf("invalid role: must be 'admin', 'supervisor', or 'employee'")
	}

	// Department validation
	if r.Department != nil {
		*r.Department = strings.TrimSpace(*r.Department)
		if len(*r.Department) > MaxDepartmentLength {
			return fmt.Errorf("department must be less than %d characters", MaxDepartmentLength)
		}
	}

	// SquadIDs are validated at the repository level

	return nil
}

// InvitationStatus represents the status of an invitation
type InvitationStatus string

const (
	InvitationStatusPending  InvitationStatus = "pending"
	InvitationStatusAccepted InvitationStatus = "accepted"
	InvitationStatusExpired  InvitationStatus = "expired"
	InvitationStatusRevoked  InvitationStatus = "revoked"
)

// Invitation represents an invitation to join the system
type Invitation struct {
	ID          int64            `json:"id"`
	Email       string           `json:"email"`
	Role        Role             `json:"role"`
	Department  string           `json:"department,omitempty"`
	SquadIDs    []int64          `json:"squad_ids,omitempty"`
	Token       string           `json:"token,omitempty"` // Only shown to admin who created it
	InvitedByID int64            `json:"invited_by_id"`
	InvitedBy   *User            `json:"invited_by,omitempty"`
	Status      InvitationStatus `json:"status"`
	ExpiresAt   time.Time        `json:"expires_at"`
	AcceptedAt  *time.Time       `json:"accepted_at,omitempty"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

// CreateInvitationRequest represents a request to create an invitation
type CreateInvitationRequest struct {
	Email      string  `json:"email"`
	Role       Role    `json:"role"`
	Department string  `json:"department,omitempty"`
	SquadIDs   []int64 `json:"squad_ids,omitempty"`
}

// Validate validates the CreateInvitationRequest
func (r *CreateInvitationRequest) Validate() error {
	// Email validation
	if r.Email == "" {
		return fmt.Errorf("email is required")
	}
	if len(r.Email) > MaxEmailLength {
		return fmt.Errorf("email must be less than %d characters", MaxEmailLength)
	}
	if _, err := mail.ParseAddress(r.Email); err != nil {
		return fmt.Errorf("invalid email format")
	}

	// Role validation - only admin and supervisor can be invited
	if r.Role != RoleAdmin && r.Role != RoleSupervisor {
		return fmt.Errorf("can only invite admin or supervisor roles")
	}

	return nil
}

// UpdateJiraSettingsRequest represents a request to update Jira settings
type UpdateJiraSettingsRequest struct {
	JiraDomain   string `json:"jira_domain"`
	JiraEmail    string `json:"jira_email"`
	JiraAPIToken string `json:"jira_api_token"`
}

// Validate validates the UpdateJiraSettingsRequest
func (r *UpdateJiraSettingsRequest) Validate() error {
	if r.JiraDomain == "" {
		return fmt.Errorf("jira_domain is required")
	}
	if r.JiraEmail == "" {
		return fmt.Errorf("jira_email is required")
	}
	if _, err := mail.ParseAddress(r.JiraEmail); err != nil {
		return fmt.Errorf("invalid jira_email format")
	}
	if r.JiraAPIToken == "" {
		return fmt.Errorf("jira_api_token is required")
	}
	return nil
}

// JiraIssue represents a Jira issue/task
type JiraIssue struct {
	ID          string            `json:"id"`
	Key         string            `json:"key"`
	Summary     string            `json:"summary"`
	Description string            `json:"description,omitempty"`
	Status      string            `json:"status"`
	Priority    string            `json:"priority,omitempty"`
	IssueType   string            `json:"issue_type"`
	Assignee    *JiraUser         `json:"assignee,omitempty"`
	Reporter    *JiraUser         `json:"reporter,omitempty"`
	Project     JiraProject       `json:"project"`
	Epic        *JiraEpicLink     `json:"epic,omitempty"`
	Created     time.Time         `json:"created"`
	Updated     time.Time         `json:"updated"`
	StartDate   *time.Time        `json:"start_date,omitempty"`
	DueDate     *time.Time        `json:"due_date,omitempty"`
	Labels      []string          `json:"labels,omitempty"`
	URL         string            `json:"url"`
}

// JiraEpicLink represents a link to a parent epic
type JiraEpicLink struct {
	Key     string `json:"key"`
	Summary string `json:"summary"`
}

// JiraUser represents a Jira user
type JiraUser struct {
	AccountID   string `json:"account_id"`
	DisplayName string `json:"display_name"`
	Email       string `json:"email,omitempty"`
	AvatarURL   string `json:"avatar_url,omitempty"`
}

// JiraProject represents a Jira project
type JiraProject struct {
	ID   string `json:"id"`
	Key  string `json:"key"`
	Name string `json:"name"`
}

// DraftStatus represents the status of an org chart draft
type DraftStatus string

const (
	DraftStatusDraft     DraftStatus = "draft"
	DraftStatusPublished DraftStatus = "published"
	DraftStatusArchived  DraftStatus = "archived"
)

// OrgChartDraft represents a draft of organizational changes
type OrgChartDraft struct {
	ID          int64        `json:"id"`
	Name        string       `json:"name"`
	Description *string      `json:"description,omitempty"`
	CreatedByID int64        `json:"created_by_id"`
	CreatedBy   *User        `json:"created_by,omitempty"`
	Status      DraftStatus  `json:"status"`
	PublishedAt *time.Time   `json:"published_at,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
	Changes     []DraftChange `json:"changes,omitempty"`
}

// DraftChange represents a single change within a draft
type DraftChange struct {
	ID                   int64     `json:"id"`
	DraftID              int64     `json:"draft_id"`
	UserID               int64     `json:"user_id"`
	User                 *User     `json:"user,omitempty"`
	OriginalSupervisorID *int64    `json:"original_supervisor_id,omitempty"`
	OriginalDepartment   *string   `json:"original_department,omitempty"`
	OriginalRole         *Role     `json:"original_role,omitempty"`
	OriginalSquadIDs     []int64   `json:"original_squad_ids,omitempty"`
	NewSupervisorID      *int64    `json:"new_supervisor_id,omitempty"`
	NewDepartment        *string   `json:"new_department,omitempty"`
	NewRole              *Role     `json:"new_role,omitempty"`
	NewSquadIDs          []int64   `json:"new_squad_ids,omitempty"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

// CreateDraftRequest represents a request to create an org chart draft
type CreateDraftRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
}

// Validate validates the CreateDraftRequest
func (r *CreateDraftRequest) Validate() error {
	r.Name = strings.TrimSpace(r.Name)
	if r.Name == "" {
		return fmt.Errorf("name is required")
	}
	if len(r.Name) > 255 {
		return fmt.Errorf("name must be less than 255 characters")
	}
	return nil
}

// UpdateDraftRequest represents a request to update an org chart draft
type UpdateDraftRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
}

// Validate validates the UpdateDraftRequest
func (r *UpdateDraftRequest) Validate() error {
	if r.Name != nil {
		*r.Name = strings.TrimSpace(*r.Name)
		if *r.Name == "" {
			return fmt.Errorf("name cannot be empty")
		}
		if len(*r.Name) > 255 {
			return fmt.Errorf("name must be less than 255 characters")
		}
	}
	return nil
}

// AddDraftChangeRequest represents a request to add/update a change in a draft
type AddDraftChangeRequest struct {
	UserID          int64   `json:"user_id"`
	NewSupervisorID *int64  `json:"new_supervisor_id,omitempty"`
	NewDepartment   *string `json:"new_department,omitempty"`
	NewRole         *Role   `json:"new_role,omitempty"`
	NewSquadIDs     []int64 `json:"new_squad_ids,omitempty"`
}

// Validate validates the AddDraftChangeRequest
func (r *AddDraftChangeRequest) Validate() error {
	if r.UserID <= 0 {
		return fmt.Errorf("user_id is required")
	}
	// At least one change should be specified
	if r.NewSupervisorID == nil && r.NewDepartment == nil && r.NewRole == nil && len(r.NewSquadIDs) == 0 {
		return fmt.Errorf("at least one change (supervisor, department, role, or squad) is required")
	}
	// Validate role if provided
	if r.NewRole != nil && !ValidRoles[*r.NewRole] {
		return fmt.Errorf("invalid role: must be 'admin', 'supervisor', or 'employee'")
	}
	// Validate department length if provided
	if r.NewDepartment != nil && len(*r.NewDepartment) > MaxDepartmentLength {
		return fmt.Errorf("department must be less than %d characters", MaxDepartmentLength)
	}
	// SquadIDs are validated at the repository level
	return nil
}

// OrgTreeNode represents a node in the organization tree
type OrgTreeNode struct {
	User          User           `json:"user"`
	Children      []OrgTreeNode  `json:"children"`
	PendingChange *DraftChange   `json:"pending_change,omitempty"`
}

// ============================================================================
// Calendar Types
// ============================================================================

// TaskStatus represents the status of a task
type TaskStatus string

const (
	TaskStatusPending    TaskStatus = "pending"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusCompleted  TaskStatus = "completed"
	TaskStatusCancelled  TaskStatus = "cancelled"
)

// ValidTaskStatuses contains all valid task status values
var ValidTaskStatuses = map[TaskStatus]bool{
	TaskStatusPending:    true,
	TaskStatusInProgress: true,
	TaskStatusCompleted:  true,
	TaskStatusCancelled:  true,
}

// AssignmentType represents how a task is assigned
type AssignmentType string

const (
	AssignmentTypeUser       AssignmentType = "user"
	AssignmentTypeSquad      AssignmentType = "squad"
	AssignmentTypeDepartment AssignmentType = "department"
)

// ValidAssignmentTypes contains all valid assignment type values
var ValidAssignmentTypes = map[AssignmentType]bool{
	AssignmentTypeUser:       true,
	AssignmentTypeSquad:      true,
	AssignmentTypeDepartment: true,
}

// RecurrenceType represents meeting recurrence patterns
type RecurrenceType string

const (
	RecurrenceTypeDaily   RecurrenceType = "daily"
	RecurrenceTypeWeekly  RecurrenceType = "weekly"
	RecurrenceTypeMonthly RecurrenceType = "monthly"
)

// ValidRecurrenceTypes contains all valid recurrence type values
var ValidRecurrenceTypes = map[RecurrenceType]bool{
	RecurrenceTypeDaily:   true,
	RecurrenceTypeWeekly:  true,
	RecurrenceTypeMonthly: true,
}

// ResponseStatus represents meeting invitation response
type ResponseStatus string

const (
	ResponseStatusPending   ResponseStatus = "pending"
	ResponseStatusAccepted  ResponseStatus = "accepted"
	ResponseStatusDeclined  ResponseStatus = "declined"
	ResponseStatusTentative ResponseStatus = "tentative"
)

// ValidResponseStatuses contains all valid response status values
var ValidResponseStatuses = map[ResponseStatus]bool{
	ResponseStatusPending:   true,
	ResponseStatusAccepted:  true,
	ResponseStatusDeclined:  true,
	ResponseStatusTentative: true,
}

// Task represents a calendar task or event
type Task struct {
	ID                 int64          `json:"id"`
	Title              string         `json:"title"`
	Description        *string        `json:"description,omitempty"`
	Status             TaskStatus     `json:"status"`
	DueDate            time.Time      `json:"due_date"`
	StartTime          *time.Time     `json:"start_time,omitempty"`
	EndTime            *time.Time     `json:"end_time,omitempty"`
	AllDay             bool           `json:"all_day"`
	CreatedByID        int64          `json:"created_by_id"`
	CreatedBy          *User          `json:"created_by,omitempty"`
	AssignmentType     AssignmentType `json:"assignment_type"`
	AssignedUserID     *int64         `json:"assigned_user_id,omitempty"`
	AssignedUser       *User          `json:"assigned_user,omitempty"`
	AssignedSquadID    *int64         `json:"assigned_squad_id,omitempty"`
	AssignedSquad      *Squad         `json:"assigned_squad,omitempty"`
	AssignedDepartment *string        `json:"assigned_department,omitempty"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
}

// CreateTaskRequest represents a request to create a task or event
type CreateTaskRequest struct {
	Title              string         `json:"title"`
	Description        *string        `json:"description,omitempty"`
	DueDate            time.Time      `json:"due_date"`
	StartTime          *time.Time     `json:"start_time,omitempty"`
	EndTime            *time.Time     `json:"end_time,omitempty"`
	AllDay             *bool          `json:"all_day,omitempty"`
	AssignmentType     AssignmentType `json:"assignment_type"`
	AssignedUserID     *int64         `json:"assigned_user_id,omitempty"`
	AssignedSquadID    *int64         `json:"assigned_squad_id,omitempty"`
	AssignedDepartment *string        `json:"assigned_department,omitempty"`
}

// Validate validates the CreateTaskRequest
func (r *CreateTaskRequest) Validate() error {
	r.Title = strings.TrimSpace(r.Title)
	if r.Title == "" {
		return fmt.Errorf("title is required")
	}
	if len(r.Title) > 255 {
		return fmt.Errorf("title must be less than 255 characters")
	}
	if r.DueDate.IsZero() {
		return fmt.Errorf("due_date is required")
	}
	if !ValidAssignmentTypes[r.AssignmentType] {
		return fmt.Errorf("invalid assignment_type: must be 'user', 'squad', or 'department'")
	}
	// Validate assignment based on type
	switch r.AssignmentType {
	case AssignmentTypeUser:
		if r.AssignedUserID == nil {
			return fmt.Errorf("assigned_user_id is required when assignment_type is 'user'")
		}
	case AssignmentTypeSquad:
		if r.AssignedSquadID == nil {
			return fmt.Errorf("assigned_squad_id is required when assignment_type is 'squad'")
		}
	case AssignmentTypeDepartment:
		if r.AssignedDepartment == nil || *r.AssignedDepartment == "" {
			return fmt.Errorf("assigned_department is required when assignment_type is 'department'")
		}
	}
	return nil
}

// UpdateTaskRequest represents a request to update a task or event
type UpdateTaskRequest struct {
	Title              *string         `json:"title,omitempty"`
	Description        *string         `json:"description,omitempty"`
	Status             *TaskStatus     `json:"status,omitempty"`
	DueDate            *time.Time      `json:"due_date,omitempty"`
	StartTime          *time.Time      `json:"start_time,omitempty"`
	EndTime            *time.Time      `json:"end_time,omitempty"`
	AllDay             *bool           `json:"all_day,omitempty"`
	AssignmentType     *AssignmentType `json:"assignment_type,omitempty"`
	AssignedUserID     *int64          `json:"assigned_user_id,omitempty"`
	AssignedSquadID    *int64          `json:"assigned_squad_id,omitempty"`
	AssignedDepartment *string         `json:"assigned_department,omitempty"`
}

// Validate validates the UpdateTaskRequest
func (r *UpdateTaskRequest) Validate() error {
	if r.Title != nil {
		*r.Title = strings.TrimSpace(*r.Title)
		if *r.Title == "" {
			return fmt.Errorf("title cannot be empty")
		}
		if len(*r.Title) > 255 {
			return fmt.Errorf("title must be less than 255 characters")
		}
	}
	if r.Status != nil && !ValidTaskStatuses[*r.Status] {
		return fmt.Errorf("invalid status: must be 'pending', 'in_progress', 'completed', or 'cancelled'")
	}
	if r.AssignmentType != nil && !ValidAssignmentTypes[*r.AssignmentType] {
		return fmt.Errorf("invalid assignment_type: must be 'user', 'squad', or 'department'")
	}
	return nil
}

// Meeting represents a calendar meeting
type Meeting struct {
	ID                   int64           `json:"id"`
	Title                string          `json:"title"`
	Description          *string         `json:"description,omitempty"`
	StartTime            time.Time       `json:"start_time"`
	EndTime              time.Time       `json:"end_time"`
	CreatedByID          int64           `json:"created_by_id"`
	CreatedBy            *User           `json:"created_by,omitempty"`
	RecurrenceType       *RecurrenceType `json:"recurrence_type,omitempty"`
	RecurrenceInterval   int             `json:"recurrence_interval"`
	RecurrenceEndDate    *time.Time      `json:"recurrence_end_date,omitempty"`
	RecurrenceDaysOfWeek []int           `json:"recurrence_days_of_week,omitempty"`
	RecurrenceDayOfMonth *int            `json:"recurrence_day_of_month,omitempty"`
	ParentMeetingID      *int64          `json:"parent_meeting_id,omitempty"`
	CreatedAt            time.Time       `json:"created_at"`
	UpdatedAt            time.Time       `json:"updated_at"`
	Attendees            []MeetingAttendee `json:"attendees,omitempty"`
}

// MeetingAttendee represents an attendee of a meeting
type MeetingAttendee struct {
	ID             int64          `json:"id"`
	MeetingID      int64          `json:"meeting_id"`
	UserID         int64          `json:"user_id"`
	User           *User          `json:"user,omitempty"`
	ResponseStatus ResponseStatus `json:"response_status"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

// CreateMeetingRequest represents a request to create a meeting
type CreateMeetingRequest struct {
	Title                string          `json:"title"`
	Description          *string         `json:"description,omitempty"`
	StartTime            time.Time       `json:"start_time"`
	EndTime              time.Time       `json:"end_time"`
	AttendeeIDs          []int64         `json:"attendee_ids"`
	RecurrenceType       *RecurrenceType `json:"recurrence_type,omitempty"`
	RecurrenceInterval   *int            `json:"recurrence_interval,omitempty"`
	RecurrenceEndDate    *time.Time      `json:"recurrence_end_date,omitempty"`
	RecurrenceDaysOfWeek []int           `json:"recurrence_days_of_week,omitempty"`
	RecurrenceDayOfMonth *int            `json:"recurrence_day_of_month,omitempty"`
}

// Validate validates the CreateMeetingRequest
func (r *CreateMeetingRequest) Validate() error {
	r.Title = strings.TrimSpace(r.Title)
	if r.Title == "" {
		return fmt.Errorf("title is required")
	}
	if len(r.Title) > 255 {
		return fmt.Errorf("title must be less than 255 characters")
	}
	if r.StartTime.IsZero() {
		return fmt.Errorf("start_time is required")
	}
	if r.EndTime.IsZero() {
		return fmt.Errorf("end_time is required")
	}
	if r.EndTime.Before(r.StartTime) || r.EndTime.Equal(r.StartTime) {
		return fmt.Errorf("end_time must be after start_time")
	}
	// Validate recurrence settings
	if r.RecurrenceType != nil {
		if !ValidRecurrenceTypes[*r.RecurrenceType] {
			return fmt.Errorf("invalid recurrence_type: must be 'daily', 'weekly', or 'monthly'")
		}
		if r.RecurrenceInterval != nil && *r.RecurrenceInterval < 1 {
			return fmt.Errorf("recurrence_interval must be at least 1")
		}
		// Weekly recurrence needs days of week
		if *r.RecurrenceType == RecurrenceTypeWeekly && len(r.RecurrenceDaysOfWeek) == 0 {
			return fmt.Errorf("recurrence_days_of_week is required for weekly recurrence")
		}
		// Monthly recurrence needs day of month
		if *r.RecurrenceType == RecurrenceTypeMonthly && r.RecurrenceDayOfMonth == nil {
			return fmt.Errorf("recurrence_day_of_month is required for monthly recurrence")
		}
	}
	return nil
}

// UpdateMeetingRequest represents a request to update a meeting
type UpdateMeetingRequest struct {
	Title                *string         `json:"title,omitempty"`
	Description          *string         `json:"description,omitempty"`
	StartTime            *time.Time      `json:"start_time,omitempty"`
	EndTime              *time.Time      `json:"end_time,omitempty"`
	AttendeeIDs          []int64         `json:"attendee_ids,omitempty"`
	RecurrenceType       *RecurrenceType `json:"recurrence_type,omitempty"`
	RecurrenceInterval   *int            `json:"recurrence_interval,omitempty"`
	RecurrenceEndDate    *time.Time      `json:"recurrence_end_date,omitempty"`
	RecurrenceDaysOfWeek []int           `json:"recurrence_days_of_week,omitempty"`
	RecurrenceDayOfMonth *int            `json:"recurrence_day_of_month,omitempty"`
}

// Validate validates the UpdateMeetingRequest
func (r *UpdateMeetingRequest) Validate() error {
	if r.Title != nil {
		*r.Title = strings.TrimSpace(*r.Title)
		if *r.Title == "" {
			return fmt.Errorf("title cannot be empty")
		}
		if len(*r.Title) > 255 {
			return fmt.Errorf("title must be less than 255 characters")
		}
	}
	if r.RecurrenceType != nil && !ValidRecurrenceTypes[*r.RecurrenceType] {
		return fmt.Errorf("invalid recurrence_type: must be 'daily', 'weekly', or 'monthly'")
	}
	if r.RecurrenceInterval != nil && *r.RecurrenceInterval < 1 {
		return fmt.Errorf("recurrence_interval must be at least 1")
	}
	return nil
}

// MeetingResponseRequest represents a request to respond to a meeting
type MeetingResponseRequest struct {
	Response ResponseStatus `json:"response"`
}

// Validate validates the MeetingResponseRequest
func (r *MeetingResponseRequest) Validate() error {
	if !ValidResponseStatuses[r.Response] {
		return fmt.Errorf("invalid response: must be 'pending', 'accepted', 'declined', or 'tentative'")
	}
	return nil
}

// CalendarEventType represents the type of calendar event
type CalendarEventType string

const (
	CalendarEventTypeJira    CalendarEventType = "jira"
	CalendarEventTypeTask    CalendarEventType = "task"
	CalendarEventTypeMeeting CalendarEventType = "meeting"
	CalendarEventTypeTimeOff CalendarEventType = "time_off"
)

// CalendarEvent represents a unified calendar event (Jira, Task, Meeting, or TimeOff)
type CalendarEvent struct {
	ID             string            `json:"id"`
	Type           CalendarEventType `json:"type"`
	Title          string            `json:"title"`
	Start          time.Time         `json:"start"`
	End            *time.Time        `json:"end,omitempty"`
	AllDay         bool              `json:"all_day"`
	URL            *string           `json:"url,omitempty"`
	Task           *Task             `json:"task,omitempty"`
	Meeting        *Meeting          `json:"meeting,omitempty"`
	JiraIssue      *JiraIssue        `json:"jira_issue,omitempty"`
	TimeOffRequest *TimeOffRequest   `json:"time_off_request,omitempty"`
}

// ============================================================================
// Time Off Types
// ============================================================================

// TimeOffType represents the type of time off request
type TimeOffType string

const (
	TimeOffTypeVacation    TimeOffType = "vacation"
	TimeOffTypeSick        TimeOffType = "sick"
	TimeOffTypePersonal    TimeOffType = "personal"
	TimeOffTypeBereavement TimeOffType = "bereavement"
	TimeOffTypeJuryDuty    TimeOffType = "jury_duty"
	TimeOffTypeOther       TimeOffType = "other"
)

// ValidTimeOffTypes contains all valid time off type values
var ValidTimeOffTypes = map[TimeOffType]bool{
	TimeOffTypeVacation:    true,
	TimeOffTypeSick:        true,
	TimeOffTypePersonal:    true,
	TimeOffTypeBereavement: true,
	TimeOffTypeJuryDuty:    true,
	TimeOffTypeOther:       true,
}

// TimeOffStatus represents the status of a time off request
type TimeOffStatus string

const (
	TimeOffStatusPending   TimeOffStatus = "pending"
	TimeOffStatusApproved  TimeOffStatus = "approved"
	TimeOffStatusRejected  TimeOffStatus = "rejected"
	TimeOffStatusCancelled TimeOffStatus = "cancelled"
)

// ValidTimeOffStatuses contains all valid time off status values
var ValidTimeOffStatuses = map[TimeOffStatus]bool{
	TimeOffStatusPending:   true,
	TimeOffStatusApproved:  true,
	TimeOffStatusRejected:  true,
	TimeOffStatusCancelled: true,
}

// TimeOffRequest represents a time off request
type TimeOffRequest struct {
	ID            int64         `json:"id"`
	UserID        int64         `json:"user_id"`
	User          *User         `json:"user,omitempty"`
	StartDate     time.Time     `json:"start_date"`
	EndDate       time.Time     `json:"end_date"`
	RequestType   TimeOffType   `json:"request_type"`
	Reason        *string       `json:"reason,omitempty"`
	Status        TimeOffStatus `json:"status"`
	ReviewerID    *int64        `json:"reviewer_id,omitempty"`
	Reviewer      *User         `json:"reviewer,omitempty"`
	ReviewerNotes *string       `json:"reviewer_notes,omitempty"`
	ReviewedAt    *time.Time    `json:"reviewed_at,omitempty"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

// CreateTimeOffRequestInput represents a request to create a time off request
type CreateTimeOffRequestInput struct {
	StartDate   string      `json:"start_date"`
	EndDate     string      `json:"end_date"`
	RequestType TimeOffType `json:"request_type"`
	Reason      *string     `json:"reason,omitempty"`
	// For supervisor/admin to create time off for another user
	UserID      *int64 `json:"user_id,omitempty"`
	AutoApprove bool   `json:"auto_approve,omitempty"`
}

// Validate validates the CreateTimeOffRequestInput
func (r *CreateTimeOffRequestInput) Validate() error {
	if r.StartDate == "" {
		return fmt.Errorf("start_date is required")
	}
	if r.EndDate == "" {
		return fmt.Errorf("end_date is required")
	}
	if !ValidTimeOffTypes[r.RequestType] {
		return fmt.Errorf("invalid request_type: must be 'vacation', 'sick', 'personal', 'bereavement', 'jury_duty', or 'other'")
	}
	// Parse and validate dates
	startDate, err := time.Parse("2006-01-02", r.StartDate)
	if err != nil {
		return fmt.Errorf("invalid start_date format: use YYYY-MM-DD")
	}
	endDate, err := time.Parse("2006-01-02", r.EndDate)
	if err != nil {
		return fmt.Errorf("invalid end_date format: use YYYY-MM-DD")
	}
	if endDate.Before(startDate) {
		return fmt.Errorf("end_date must be on or after start_date")
	}
	return nil
}

// ReviewTimeOffRequestInput represents a request to review a time off request
type ReviewTimeOffRequestInput struct {
	Status        TimeOffStatus `json:"status"`
	ReviewerNotes *string       `json:"reviewer_notes,omitempty"`
}

// Validate validates the ReviewTimeOffRequestInput
func (r *ReviewTimeOffRequestInput) Validate() error {
	if r.Status != TimeOffStatusApproved && r.Status != TimeOffStatusRejected {
		return fmt.Errorf("status must be 'approved' or 'rejected'")
	}
	return nil
}

// TimeOffImpact represents the impact of time off on a Jira task
type TimeOffImpact struct {
	HasTimeOff       bool    `json:"has_time_off"`
	TimeOffDays      int     `json:"time_off_days"`
	RemainingDays    int     `json:"remaining_days"`
	ImpactPercent    float64 `json:"impact_percent"`
}

// ============================================================================
// Jira OAuth Types
// ============================================================================

// JiraOAuthTokens holds OAuth tokens for user Jira integration
type JiraOAuthTokens struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
	CloudID      string
	SiteURL      string
}

// OrgJiraSettings represents organization-wide Jira OAuth settings
type OrgJiraSettings struct {
	ID                  int64     `json:"id"`
	OAuthAccessToken    string    `json:"-"` // Never expose
	OAuthRefreshToken   string    `json:"-"` // Never expose
	OAuthTokenExpiresAt time.Time `json:"-"` // Never expose
	CloudID             string    `json:"cloud_id"`
	SiteURL             string    `json:"site_url"`
	SiteName            *string   `json:"site_name,omitempty"`
	ConfiguredByID      int64     `json:"configured_by_id"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// IsTokenExpired checks if the OAuth token is expired (with 5 min buffer)
func (s *OrgJiraSettings) IsTokenExpired() bool {
	return time.Now().Add(5 * time.Minute).After(s.OAuthTokenExpiresAt)
}
