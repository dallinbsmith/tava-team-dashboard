package jira

import (
	"context"

	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// CalendarJiraClient is an adapter that implements the calendar handler's JiraClient interface
// It creates fresh Jira clients with the provided OAuth credentials for each call
type CalendarJiraClient struct{}

// NewCalendarJiraClient creates a new CalendarJiraClient adapter
func NewCalendarJiraClient() *CalendarJiraClient {
	return &CalendarJiraClient{}
}

// GetMyTasks returns Jira issues assigned to the current user
// ctx is passed for future use (e.g., cancellation)
func (c *CalendarJiraClient) GetMyTasks(ctx context.Context, cloudID, accessToken string, maxResults int) ([]models.JiraIssue, error) {
	// Create a temporary client with the provided OAuth credentials
	// siteURL is constructed from cloudID for browsing links
	client := NewOAuthClient(accessToken, cloudID, "")
	return client.GetMyIssues(maxResults)
}

// GetEpics returns all unresolved Jira epics
func (c *CalendarJiraClient) GetEpics(ctx context.Context, cloudID, accessToken string, maxResults int) ([]models.JiraIssue, error) {
	// Create a temporary client with the provided OAuth credentials
	client := NewOAuthClient(accessToken, cloudID, "")
	return client.GetEpics(maxResults)
}
