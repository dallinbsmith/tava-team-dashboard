package repository

import (
	"context"
	"time"

	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// UserRepository defines the interface for user data access
type UserRepository interface {
	GetByID(ctx context.Context, id int64) (*models.User, error)
	GetByIDs(ctx context.Context, ids []int64) ([]models.User, error)
	GetByAuth0ID(ctx context.Context, auth0ID string) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetAll(ctx context.Context) ([]models.User, error)
	Create(ctx context.Context, req *models.CreateUserRequest, auth0ID string) (*models.User, error)
	Update(ctx context.Context, id int64, req *models.UpdateUserRequest) (*models.User, error)
	Delete(ctx context.Context, id int64) error
	Deactivate(ctx context.Context, id int64) error
	Reactivate(ctx context.Context, id int64) error
	GetDirectReportsBySupervisorID(ctx context.Context, supervisorID int64) ([]models.User, error)
	GetAllSupervisors(ctx context.Context) ([]models.User, error)
	GetAllDepartments(ctx context.Context) ([]string, error)
	ClearDepartment(ctx context.Context, department string) error
	RenameDepartment(ctx context.Context, oldName, newName string) error
	GetUsersByDepartment(ctx context.Context, department string) ([]models.User, error)
	// Jira-related methods
	UpdateJiraSettings(ctx context.Context, id int64, req *models.UpdateJiraSettingsRequest) error
	ClearJiraSettings(ctx context.Context, id int64) error
	UpdateJiraAccountID(ctx context.Context, id int64, jiraAccountID *string) error
	SaveJiraOAuthTokens(ctx context.Context, id int64, tokens *models.JiraOAuthTokens) error
}

// SquadRepository defines the interface for squad data access
type SquadRepository interface {
	GetByID(ctx context.Context, id int64) (*models.Squad, error)
	GetAll(ctx context.Context) ([]models.Squad, error)
	GetByUserID(ctx context.Context, userID int64) ([]models.Squad, error)
	GetByUserIDs(ctx context.Context, userIDs []int64) (map[int64][]models.Squad, error)
	GetSquadIDsByUserID(ctx context.Context, userID int64) ([]int64, error)
	Create(ctx context.Context, name string) (*models.Squad, error)
	Rename(ctx context.Context, id int64, newName string) (*models.Squad, error)
	Delete(ctx context.Context, id int64) error
	SetUserSquads(ctx context.Context, userID int64, squadIDs []int64) error
	GetUsersBySquadID(ctx context.Context, squadID int64) ([]models.User, error)
}

// DepartmentRepository defines the interface for department data access
type DepartmentRepository interface {
	GetAll(ctx context.Context) ([]models.Department, error)
	GetAllNames(ctx context.Context) ([]string, error)
	GetByID(ctx context.Context, id int64) (*models.Department, error)
	GetByName(ctx context.Context, name string) (*models.Department, error)
	Create(ctx context.Context, name string) (*models.Department, error)
	Delete(ctx context.Context, name string) error
	Rename(ctx context.Context, oldName, newName string) error
}

// TimeOffRepository defines the interface for time-off request data access
type TimeOffRepository interface {
	Create(ctx context.Context, userID int64, req *models.CreateTimeOffRequestInput) (*models.TimeOffRequest, error)
	GetByID(ctx context.Context, id int64) (*models.TimeOffRequest, error)
	GetByIDWithUser(ctx context.Context, id int64) (*models.TimeOffRequest, error)
	GetByUserID(ctx context.Context, userID int64, status *models.TimeOffStatus) ([]models.TimeOffRequest, error)
	GetVisibleRequests(ctx context.Context, user *models.User, status *models.TimeOffStatus) ([]models.TimeOffRequest, error)
	GetPendingForSupervisor(ctx context.Context, supervisorID int64) ([]models.TimeOffRequest, error)
	GetAllPending(ctx context.Context) ([]models.TimeOffRequest, error)
	Review(ctx context.Context, id int64, reviewerID int64, req *models.ReviewTimeOffRequestInput) error
	Cancel(ctx context.Context, id int64, userID int64) error
	GetApprovedByDateRange(ctx context.Context, userID int64, start, end time.Time) ([]models.TimeOffRequest, error)
	GetApprovedForUsers(ctx context.Context, userIDs []int64, start, end time.Time) ([]models.TimeOffRequest, error)
	GetTeamTimeOff(ctx context.Context, supervisorID int64) ([]models.TimeOffRequest, error)
	GetApprovedFutureTimeOffByUser(ctx context.Context, userID int64) ([]models.TimeOffRequest, error)
	GetAllApproved(ctx context.Context) ([]models.TimeOffRequest, error)
}

// InvitationRepository defines the interface for invitation data access
type InvitationRepository interface {
	Create(ctx context.Context, req *models.CreateInvitationRequest, invitedByID int64) (*models.Invitation, error)
	GetByID(ctx context.Context, id int64) (*models.Invitation, error)
	GetByToken(ctx context.Context, token string) (*models.Invitation, error)
	GetByEmail(ctx context.Context, email string) (*models.Invitation, error)
	GetAll(ctx context.Context) ([]models.Invitation, error)
	Accept(ctx context.Context, token string, auth0ID string, firstName string, lastName string) (*models.User, error)
	Revoke(ctx context.Context, id int64) error
	ExpirePending(ctx context.Context) error
}

// OrgChartRepository defines the interface for org chart data access
type OrgChartRepository interface {
	CreateDraft(ctx context.Context, req *models.CreateDraftRequest, createdByID int64) (*models.OrgChartDraft, error)
	GetDraftByID(ctx context.Context, id int64) (*models.OrgChartDraft, error)
	GetDraftsByCreator(ctx context.Context, creatorID int64) ([]models.OrgChartDraft, error)
	GetAllDrafts(ctx context.Context) ([]models.OrgChartDraft, error)
	UpdateDraft(ctx context.Context, id int64, req *models.UpdateDraftRequest) (*models.OrgChartDraft, error)
	DeleteDraft(ctx context.Context, id int64) error
	AddOrUpdateChange(ctx context.Context, draftID int64, req *models.AddDraftChangeRequest, userRepo UserRepository) (*models.DraftChange, error)
	RemoveChange(ctx context.Context, draftID int64, userID int64) error
	GetDraftChanges(ctx context.Context, draftID int64) ([]models.DraftChange, error)
	PublishDraft(ctx context.Context, draftID int64) error
	GetOrgTree(ctx context.Context, supervisorID int64) (*models.OrgTreeNode, error)
	GetFullOrgTree(ctx context.Context) ([]models.OrgTreeNode, error)
}

// OrgJiraRepository defines the interface for organization Jira settings
type OrgJiraRepository interface {
	Get(ctx context.Context) (*models.OrgJiraSettings, error)
	Save(ctx context.Context, settings *models.OrgJiraSettings) error
	UpdateTokens(ctx context.Context, accessToken, refreshToken string, expiresAt time.Time) error
	Delete(ctx context.Context) error
}

// TaskRepository defines the interface for task data access
type TaskRepository interface {
	Create(ctx context.Context, req *models.CreateTaskRequest, createdByID int64) (*models.Task, error)
	GetByID(ctx context.Context, id int64) (*models.Task, error)
	Update(ctx context.Context, id int64, req *models.UpdateTaskRequest) (*models.Task, error)
	Delete(ctx context.Context, id int64) error
	GetByDateRange(ctx context.Context, userID int64, start, end time.Time) ([]models.Task, error)
	GetByDateRangeForSquad(ctx context.Context, squadID int64, start, end time.Time) ([]models.Task, error)
	GetByDateRangeForDepartment(ctx context.Context, department string, start, end time.Time) ([]models.Task, error)
	GetAllByDateRange(ctx context.Context, start, end time.Time) ([]models.Task, error)
	GetVisibleTasks(ctx context.Context, user *models.User, start, end time.Time) ([]models.Task, error)
}

// MeetingRepository defines the interface for meeting data access
type MeetingRepository interface {
	Create(ctx context.Context, req *models.CreateMeetingRequest, createdByID int64) (*models.Meeting, error)
	GetByID(ctx context.Context, id int64) (*models.Meeting, error)
	GetAttendees(ctx context.Context, meetingID int64) ([]models.MeetingAttendee, error)
	Update(ctx context.Context, id int64, req *models.UpdateMeetingRequest) (*models.Meeting, error)
	Delete(ctx context.Context, id int64) error
	RespondToMeeting(ctx context.Context, meetingID int64, userID int64, response models.ResponseStatus) error
	GetByDateRange(ctx context.Context, userID int64, start, end time.Time) ([]models.Meeting, error)
	GetAllByDateRange(ctx context.Context, start, end time.Time) ([]models.Meeting, error)
	GetVisibleMeetings(ctx context.Context, user *models.User, start, end time.Time) ([]models.Meeting, error)
	ExpandRecurringMeetings(meetings []models.Meeting, start, end time.Time) []models.Meeting
	IsAttendee(ctx context.Context, meetingID, userID int64) (bool, error)
}
