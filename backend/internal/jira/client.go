package jira

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// AuthType represents the type of authentication used
type AuthType int

const (
	AuthTypeBasic AuthType = iota
	AuthTypeOAuth
)

// Client represents a Jira API client
type Client struct {
	// For legacy Basic auth
	domain   string
	email    string
	apiToken string
	// For OAuth
	accessToken string
	cloudID     string
	siteURL     string
	// Common
	authType   AuthType
	httpClient *http.Client
}

// NewClient creates a new Jira client with Basic auth (legacy)
func NewClient(domain, email, apiToken string) *Client {
	return &Client{
		domain:   domain,
		email:    email,
		apiToken: apiToken,
		authType: AuthTypeBasic,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// NewOAuthClient creates a new Jira client with OAuth authentication
func NewOAuthClient(accessToken, cloudID, siteURL string) *Client {
	return &Client{
		accessToken: accessToken,
		cloudID:     cloudID,
		siteURL:     siteURL,
		authType:    AuthTypeOAuth,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// NewClientFromUser creates a Jira client from user credentials (supports both OAuth and legacy)
func NewClientFromUser(user *models.User) (*Client, error) {
	// Prefer OAuth if configured
	if user.HasJiraOAuth() {
		return NewOAuthClient(*user.JiraOAuthAccessToken, *user.JiraCloudID, *user.JiraSiteURL), nil
	}
	// Fall back to legacy API token
	if user.HasJiraAPIToken() {
		return NewClient(*user.JiraDomain, *user.JiraEmail, *user.JiraAPIToken), nil
	}
	return nil, fmt.Errorf("user does not have Jira configured")
}

// baseURL returns the base URL for API calls
func (c *Client) baseURL() string {
	if c.authType == AuthTypeOAuth {
		return fmt.Sprintf("https://api.atlassian.com/ex/jira/%s", c.cloudID)
	}
	return fmt.Sprintf("https://%s.atlassian.net", c.domain)
}

// browseURL returns the URL for browsing issues (for UI links)
func (c *Client) browseURL() string {
	if c.authType == AuthTypeOAuth && c.siteURL != "" {
		return c.siteURL
	}
	return fmt.Sprintf("https://%s.atlassian.net", c.domain)
}

// authHeader returns the auth header value based on auth type
func (c *Client) authHeader() string {
	if c.authType == AuthTypeOAuth {
		return "Bearer " + c.accessToken
	}
	auth := fmt.Sprintf("%s:%s", c.email, c.apiToken)
	return "Basic " + base64.StdEncoding.EncodeToString([]byte(auth))
}

// doRequest performs an authenticated request to Jira
func (c *Client) doRequest(method, path string, body io.Reader) (*http.Response, error) {
	url := c.baseURL() + path

	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", c.authHeader())
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	return resp, nil
}

// TestConnection tests if the Jira credentials are valid
func (c *Client) TestConnection() error {
	resp, err := c.doRequest("GET", "/rest/api/3/myself", nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("authentication failed (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// searchIssues performs a JQL search using the new /search/jql endpoint
func (c *Client) searchIssues(jql string, maxResults int) ([]models.JiraIssue, error) {
	// Use the new /rest/api/3/search/jql endpoint (POST with body)
	// Fields include customfield_10015 which is the default "Start date" field for epics
	reqBody := map[string]interface{}{
		"jql":        jql,
		"maxResults": maxResults,
		"fields":     []string{"summary", "description", "status", "priority", "issuetype", "assignee", "reporter", "project", "parent", "created", "updated", "duedate", "labels", "customfield_10015"},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := c.doRequest("POST", "/rest/api/3/search/jql", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to fetch issues (status %d): %s", resp.StatusCode, string(body))
	}

	var result jiraSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return c.convertIssues(result.Issues), nil
}

// GetMyIssues returns issues assigned to the authenticated user
func (c *Client) GetMyIssues(maxResults int) ([]models.JiraIssue, error) {
	jql := "assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC"
	return c.searchIssues(jql, maxResults)
}

// GetIssuesByProject returns issues for a specific project
func (c *Client) GetIssuesByProject(projectKey string, maxResults int) ([]models.JiraIssue, error) {
	jql := fmt.Sprintf("project = %s AND resolution = Unresolved ORDER BY updated DESC", projectKey)
	return c.searchIssues(jql, maxResults)
}

// GetEpics returns all unresolved epics
func (c *Client) GetEpics(maxResults int) ([]models.JiraIssue, error) {
	jql := "issuetype = Epic AND resolution = Unresolved ORDER BY updated DESC"
	return c.searchIssues(jql, maxResults)
}

// GetProjects returns all accessible projects
func (c *Client) GetProjects() ([]models.JiraProject, error) {
	resp, err := c.doRequest("GET", "/rest/api/3/project", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to fetch projects (status %d): %s", resp.StatusCode, string(body))
	}

	var projects []jiraProject
	if err := json.NewDecoder(resp.Body).Decode(&projects); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	result := make([]models.JiraProject, len(projects))
	for i, p := range projects {
		result[i] = models.JiraProject{
			ID:   p.ID,
			Key:  p.Key,
			Name: p.Name,
		}
	}

	return result, nil
}

// GetIssuesByAccountID returns issues assigned to a specific Jira account
func (c *Client) GetIssuesByAccountID(accountID string, maxResults int) ([]models.JiraIssue, error) {
	// Use accountId() function for Jira Cloud compatibility and proper quoting
	jql := fmt.Sprintf("assignee = accountId(\"%s\") AND resolution = Unresolved ORDER BY updated DESC", accountID)
	return c.searchIssues(jql, maxResults)
}

// GetAllUsers returns all users searchable in Jira
func (c *Client) GetAllUsers(maxResults int) ([]models.JiraUser, error) {
	path := fmt.Sprintf("/rest/api/3/users/search?maxResults=%d", maxResults)

	resp, err := c.doRequest("GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to fetch users (status %d): %s", resp.StatusCode, string(body))
	}

	var users []jiraUser
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	result := make([]models.JiraUser, 0, len(users))
	for _, u := range users {
		// Skip inactive users and app users
		if u.AccountType != "atlassian" {
			continue
		}
		result = append(result, models.JiraUser{
			AccountID:   u.AccountID,
			DisplayName: u.DisplayName,
			Email:       u.EmailAddress,
			AvatarURL:   getAvatarURL(u.AvatarURLs),
		})
	}

	return result, nil
}

// CreateUserRequest represents the request to create a user in Jira
type CreateUserRequest struct {
	EmailAddress string   `json:"emailAddress"`
	DisplayName  string   `json:"displayName,omitempty"`
	Products     []string `json:"products"`
}

// CreateUserResponse represents the response from creating a user in Jira
type CreateUserResponse struct {
	AccountID   string `json:"accountId"`
	AccountType string `json:"accountType"`
	Email       string `json:"emailAddress"`
	DisplayName string `json:"displayName"`
	Active      bool   `json:"active"`
}

// CreateUser creates a new user in Jira Cloud
// Note: This requires admin permissions and the user will receive an invitation email
func (c *Client) CreateUser(email, displayName string) (*CreateUserResponse, error) {
	reqBody := CreateUserRequest{
		EmailAddress: email,
		DisplayName:  displayName,
		Products:     []string{"jira-software"}, // Required since May 2024
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := c.doRequest("POST", "/rest/api/3/user", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// 201 Created is the success status for user creation
	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to create user (status %d): %s", resp.StatusCode, string(body))
	}

	var result CreateUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// convertIssues converts Jira API issues to our model
func (c *Client) convertIssues(issues []jiraIssue) []models.JiraIssue {
	result := make([]models.JiraIssue, len(issues))
	for i, issue := range issues {
		result[i] = models.JiraIssue{
			ID:        issue.ID,
			Key:       issue.Key,
			Summary:   issue.Fields.Summary,
			Status:    issue.Fields.Status.Name,
			IssueType: issue.Fields.IssueType.Name,
			Project: models.JiraProject{
				ID:   issue.Fields.Project.ID,
				Key:  issue.Fields.Project.Key,
				Name: issue.Fields.Project.Name,
			},
			Created: issue.Fields.Created.Time,
			Updated: issue.Fields.Updated.Time,
			Labels:  issue.Fields.Labels,
			URL:     fmt.Sprintf("%s/browse/%s", c.browseURL(), issue.Key),
		}

		// Description (can be complex ADF format)
		if issue.Fields.Description != nil {
			if desc, ok := issue.Fields.Description.(string); ok {
				result[i].Description = desc
			} else if descMap, ok := issue.Fields.Description.(map[string]interface{}); ok {
				// Extract text from ADF format
				result[i].Description = extractTextFromADF(descMap)
			}
		}

		// Priority
		if issue.Fields.Priority != nil {
			result[i].Priority = issue.Fields.Priority.Name
		}

		// Assignee
		if issue.Fields.Assignee != nil {
			result[i].Assignee = &models.JiraUser{
				AccountID:   issue.Fields.Assignee.AccountID,
				DisplayName: issue.Fields.Assignee.DisplayName,
				Email:       issue.Fields.Assignee.EmailAddress,
				AvatarURL:   getAvatarURL(issue.Fields.Assignee.AvatarURLs),
			}
		}

		// Reporter
		if issue.Fields.Reporter != nil {
			result[i].Reporter = &models.JiraUser{
				AccountID:   issue.Fields.Reporter.AccountID,
				DisplayName: issue.Fields.Reporter.DisplayName,
				Email:       issue.Fields.Reporter.EmailAddress,
				AvatarURL:   getAvatarURL(issue.Fields.Reporter.AvatarURLs),
			}
		}

		// Start date (Epic start date from custom field)
		if issue.Fields.StartDate != "" {
			if t, err := time.Parse("2006-01-02", issue.Fields.StartDate); err == nil {
				result[i].StartDate = &t
			}
		}

		// Due date
		if issue.Fields.DueDate != "" {
			if t, err := time.Parse("2006-01-02", issue.Fields.DueDate); err == nil {
				result[i].DueDate = &t
			}
		}

		// Parent/Epic link (only for non-epic issues that have a parent)
		if issue.Fields.Parent != nil && issue.Fields.Parent.Key != "" {
			result[i].Epic = &models.JiraEpicLink{
				Key:     issue.Fields.Parent.Key,
				Summary: issue.Fields.Parent.Fields.Summary,
			}
		}
	}

	return result
}

// extractTextFromADF extracts plain text from Atlassian Document Format
func extractTextFromADF(adf map[string]interface{}) string {
	content, ok := adf["content"].([]interface{})
	if !ok {
		return ""
	}

	var text string
	for _, block := range content {
		blockMap, ok := block.(map[string]interface{})
		if !ok {
			continue
		}

		blockContent, ok := blockMap["content"].([]interface{})
		if !ok {
			continue
		}

		for _, item := range blockContent {
			itemMap, ok := item.(map[string]interface{})
			if !ok {
				continue
			}

			if t, ok := itemMap["text"].(string); ok {
				text += t
			}
		}
		text += "\n"
	}

	return text
}

// getAvatarURL extracts the 48x48 avatar URL
func getAvatarURL(avatars map[string]string) string {
	if url, ok := avatars["48x48"]; ok {
		return url
	}
	if url, ok := avatars["32x32"]; ok {
		return url
	}
	return ""
}

// JiraTime handles Jira's timestamp format which uses -0700 instead of -07:00
type JiraTime struct {
	time.Time
}

func (jt *JiraTime) UnmarshalJSON(data []byte) error {
	// Remove quotes
	s := string(data)
	if len(s) < 2 {
		return nil
	}
	s = s[1 : len(s)-1]
	if s == "" || s == "null" {
		return nil
	}

	// Try multiple formats that Jira might return
	formats := []string{
		"2006-01-02T15:04:05.000-0700",  // Jira format with milliseconds
		"2006-01-02T15:04:05-0700",       // Jira format without milliseconds
		"2006-01-02T15:04:05.000Z",       // UTC with milliseconds
		"2006-01-02T15:04:05Z",           // UTC without milliseconds
		time.RFC3339,                     // Standard RFC3339
		time.RFC3339Nano,                 // RFC3339 with nanoseconds
	}

	var err error
	for _, format := range formats {
		jt.Time, err = time.Parse(format, s)
		if err == nil {
			return nil
		}
	}

	return fmt.Errorf("unable to parse time %q", s)
}

// Jira API response types
type jiraSearchResponse struct {
	StartAt    int         `json:"startAt"`
	MaxResults int         `json:"maxResults"`
	Total      int         `json:"total"`
	Issues     []jiraIssue `json:"issues"`
}

type jiraIssue struct {
	ID     string      `json:"id"`
	Key    string      `json:"key"`
	Fields jiraFields  `json:"fields"`
}

type jiraFields struct {
	Summary     string          `json:"summary"`
	Description interface{}     `json:"description"` // Can be string or ADF object
	Status      jiraStatus      `json:"status"`
	Priority    *jiraPriority   `json:"priority"`
	IssueType   jiraIssueType   `json:"issuetype"`
	Assignee    *jiraUser       `json:"assignee"`
	Reporter    *jiraUser       `json:"reporter"`
	Project     jiraProject     `json:"project"`
	Parent      *jiraParent     `json:"parent"`
	Created     JiraTime        `json:"created"`
	Updated     JiraTime        `json:"updated"`
	// StartDate maps to customfield_10015, which is the default "Start date" field ID
	// in Jira Cloud for epics. This ID is consistent across most Jira Cloud instances.
	// If a specific instance uses a different field ID, this would need to be made
	// configurable via OrgJiraSettings.
	StartDate   string          `json:"customfield_10015"`
	DueDate     string          `json:"duedate"`
	Labels      []string        `json:"labels"`
}

type jiraParent struct {
	Key    string           `json:"key"`
	Fields jiraParentFields `json:"fields"`
}

type jiraParentFields struct {
	Summary   string        `json:"summary"`
	IssueType jiraIssueType `json:"issuetype"`
}

type jiraStatus struct {
	Name string `json:"name"`
}

type jiraPriority struct {
	Name string `json:"name"`
}

type jiraIssueType struct {
	Name string `json:"name"`
}

type jiraUser struct {
	AccountID    string            `json:"accountId"`
	AccountType  string            `json:"accountType"` // "atlassian", "app", "customer"
	DisplayName  string            `json:"displayName"`
	EmailAddress string            `json:"emailAddress"`
	AvatarURLs   map[string]string `json:"avatarUrls"`
	Active       bool              `json:"active"`
}

type jiraProject struct {
	ID   string `json:"id"`
	Key  string `json:"key"`
	Name string `json:"name"`
}
