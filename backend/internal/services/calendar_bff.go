package services

import (
	"context"
	"time"

	"github.com/smith-dallin/manager-dashboard/internal/database"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// JiraClient interface for fetching Jira issues
type JiraClient interface {
	GetMyTasks(ctx context.Context, cloudID, accessToken string, maxResults int) ([]models.JiraIssue, error)
	GetEpics(ctx context.Context, cloudID, accessToken string, maxResults int) ([]models.JiraIssue, error)
}

// CalendarBFFService is the Backend For Frontend service that aggregates
// calendar data from multiple sources (tasks, meetings, Jira, time off)
// before sending to the frontend components
type CalendarBFFService struct {
	calendarRepo *database.CalendarRepository
	jiraRepo     *database.OrgJiraRepository
	jiraClient   JiraClient
}

// NewCalendarBFFService creates a new Calendar BFF service
func NewCalendarBFFService(
	calendarRepo *database.CalendarRepository,
	jiraRepo *database.OrgJiraRepository,
	jiraClient JiraClient,
) *CalendarBFFService {
	return &CalendarBFFService{
		calendarRepo: calendarRepo,
		jiraRepo:     jiraRepo,
		jiraClient:   jiraClient,
	}
}

// CalendarEventsRequest contains the parameters for fetching calendar events
type CalendarEventsRequest struct {
	User  *models.User
	Start time.Time
	End   time.Time
}

// CalendarEventsResponse contains the aggregated calendar events and metadata
type CalendarEventsResponse struct {
	Events        []models.CalendarEvent `json:"events"`
	JiraConnected bool                   `json:"jira_connected"`
	TaskCount     int                    `json:"task_count"`
	MeetingCount  int                    `json:"meeting_count"`
	JiraCount     int                    `json:"jira_count"`
	TimeOffCount  int                    `json:"time_off_count"`
}

// GetCalendarEvents aggregates calendar data from all sources:
// - Tasks from the database
// - Meetings from the database
// - Jira issues and epics (if connected)
// - Time off requests
func (s *CalendarBFFService) GetCalendarEvents(ctx context.Context, req CalendarEventsRequest) (*CalendarEventsResponse, error) {
	// Fetch Jira issues if Jira is configured
	jiraIssues, jiraConnected := s.fetchJiraData(ctx)

	// Get all events from the calendar repository (tasks, meetings, time off + jira)
	events, err := s.calendarRepo.GetEvents(ctx, req.User, req.Start, req.End, jiraIssues)
	if err != nil {
		return nil, err
	}

	// Ensure we return an empty array instead of null
	if events == nil {
		events = []models.CalendarEvent{}
	}

	// Count events by type for metadata
	response := &CalendarEventsResponse{
		Events:        events,
		JiraConnected: jiraConnected,
	}

	for _, event := range events {
		switch event.Type {
		case models.CalendarEventTypeTask:
			response.TaskCount++
		case models.CalendarEventTypeMeeting:
			response.MeetingCount++
		case models.CalendarEventTypeJira:
			response.JiraCount++
		case models.CalendarEventTypeTimeOff:
			response.TimeOffCount++
		}
	}

	return response, nil
}

// fetchJiraData retrieves Jira issues and epics from the configured Jira connection
func (s *CalendarBFFService) fetchJiraData(ctx context.Context) ([]models.JiraIssue, bool) {
	if s.jiraRepo == nil || s.jiraClient == nil {
		return nil, false
	}

	settings, err := s.jiraRepo.Get(ctx)
	if err != nil || settings == nil || settings.OAuthAccessToken == "" {
		return nil, false
	}

	var jiraIssues []models.JiraIssue

	// Fetch user's assigned tasks
	issues, err := s.jiraClient.GetMyTasks(ctx, settings.CloudID, settings.OAuthAccessToken, 100)
	if err == nil {
		jiraIssues = append(jiraIssues, issues...)
	}

	// Fetch epics (shown on calendar for visibility)
	epics, err := s.jiraClient.GetEpics(ctx, settings.CloudID, settings.OAuthAccessToken, 50)
	if err == nil {
		jiraIssues = append(jiraIssues, epics...)
	}

	return jiraIssues, true
}

// GetTaskRepo returns the underlying task repository for direct operations
func (s *CalendarBFFService) GetTaskRepo() *database.TaskRepository {
	return s.calendarRepo.TaskRepo()
}

// GetMeetingRepo returns the underlying meeting repository for direct operations
func (s *CalendarBFFService) GetMeetingRepo() *database.MeetingRepository {
	return s.calendarRepo.MeetingRepo()
}
