package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/smith-dallin/manager-dashboard/internal/database"
	"github.com/smith-dallin/manager-dashboard/internal/jira"
	"github.com/smith-dallin/manager-dashboard/internal/logger"
	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/oauth"
	"github.com/smith-dallin/manager-dashboard/internal/repository"
)

// maxConcurrentJiraRequests is the default limit for concurrent Jira API requests
// to avoid overwhelming the Jira API rate limits
const maxConcurrentJiraRequests = 5

type JiraHandlers struct {
	userRepo             repository.UserRepository
	orgJiraRepo          repository.OrgJiraRepository
	timeOffRepo          repository.TimeOffRepository
	oauthService         *jira.OAuthService
	stateStore           oauth.StateStore
	frontendURL          string
	maxUsersPagination   int
	maxConcurrentAPIReqs int
	logger               *logger.Logger
}

func NewJiraHandlers(userRepo repository.UserRepository, orgJiraRepo repository.OrgJiraRepository, timeOffRepo repository.TimeOffRepository, oauthService *jira.OAuthService, stateStore oauth.StateStore, frontendURL string, log *logger.Logger) *JiraHandlers {
	return NewJiraHandlersWithConfig(userRepo, orgJiraRepo, timeOffRepo, oauthService, stateStore, frontendURL, 1000, maxConcurrentJiraRequests, log)
}

// NewJiraHandlersWithConfig creates Jira handlers with custom configuration
func NewJiraHandlersWithConfig(userRepo repository.UserRepository, orgJiraRepo repository.OrgJiraRepository, timeOffRepo repository.TimeOffRepository, oauthService *jira.OAuthService, stateStore oauth.StateStore, frontendURL string, maxUsersPagination int, maxConcurrentAPIReqs int, log *logger.Logger) *JiraHandlers {
	if maxUsersPagination <= 0 {
		maxUsersPagination = 1000
	}
	if maxConcurrentAPIReqs <= 0 {
		maxConcurrentAPIReqs = maxConcurrentJiraRequests
	}
	return &JiraHandlers{
		userRepo:             userRepo,
		orgJiraRepo:          orgJiraRepo,
		timeOffRepo:          timeOffRepo,
		oauthService:         oauthService,
		stateStore:           stateStore,
		frontendURL:          frontendURL,
		maxUsersPagination:   maxUsersPagination,
		maxConcurrentAPIReqs: maxConcurrentAPIReqs,
		logger:               log.WithComponent("jira_handlers"),
	}
}

// getJiraClient gets org-wide Jira settings and returns a Jira client.
// If the token is expired, it attempts to refresh it automatically.
func (h *JiraHandlers) getJiraClient(ctx context.Context) (*jira.Client, error) {
	orgSettings, err := h.orgJiraRepo.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get Jira settings: %w", err)
	}

	if orgSettings == nil {
		return nil, fmt.Errorf("jira is not configured for this organization")
	}

	accessToken := orgSettings.OAuthAccessToken

	// Check if token is expired and refresh if needed
	if orgSettings.IsTokenExpired() {
		if h.oauthService == nil {
			return nil, fmt.Errorf("cannot refresh token: OAuth service not configured")
		}

		h.logger.WithContext(ctx).Info("Jira OAuth token expired, attempting to refresh")

		tokenResp, err := h.oauthService.RefreshAccessToken(orgSettings.OAuthRefreshToken)
		if err != nil {
			return nil, fmt.Errorf("failed to refresh token: %w", err)
		}

		// Update both access and refresh tokens in the database
		// Atlassian uses refresh token rotation - each refresh token can only be used once
		newExpiry := jira.CalculateExpiry(tokenResp.ExpiresIn)
		if err := h.orgJiraRepo.UpdateTokens(ctx, tokenResp.AccessToken, tokenResp.RefreshToken, newExpiry); err != nil {
			h.logger.WithContext(ctx).Warn("Failed to save refreshed tokens", "error", err)
			// Continue with the new token even if save fails
		} else {
			h.logger.WithContext(ctx).Info("Jira OAuth tokens refreshed successfully")
		}

		accessToken = tokenResp.AccessToken
	}

	return jira.NewOAuthClient(accessToken, orgSettings.CloudID, orgSettings.SiteURL), nil
}

// GetJiraSettings returns the organization-wide Jira settings
// Available to all authenticated users to check connection status
func (h *JiraHandlers) GetJiraSettings(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	// Check org-wide Jira settings first
	orgSettings, err := h.orgJiraRepo.Get(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to get Jira settings")
		return
	}

	response := map[string]interface{}{
		"oauth_enabled":    h.oauthService != nil,
		"org_configured":   orgSettings != nil,
		"jira_account_id":  currentUser.JiraAccountID,
	}

	if orgSettings != nil {
		response["jira_site_url"] = orgSettings.SiteURL
		response["jira_site_name"] = orgSettings.SiteName
		response["configured_by_id"] = orgSettings.ConfiguredByID
	}

	// For admins, also check if they have permission to configure
	response["can_configure"] = currentUser.IsAdmin()

	respondJSON(w, http.StatusOK, response)
}

// GetOAuthAuthorizeURL returns the URL to redirect the user to for Jira OAuth authorization
// Only admins can configure the organization-wide Jira connection
func (h *JiraHandlers) GetOAuthAuthorizeURL(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAdmin(w, r)
	if currentUser == nil {
		return
	}

	if h.oauthService == nil {
		respondError(w, http.StatusServiceUnavailable, "Jira OAuth is not configured")
		return
	}

	// Create state in the state store
	state, err := h.stateStore.Create(r.Context(), currentUser.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate state")
		return
	}

	// Get authorization URL
	authURL := h.oauthService.GetAuthorizationURL(state)

	respondJSON(w, http.StatusOK, map[string]string{
		"authorization_url": authURL,
	})
}

// oauthCallbackParams holds the validated OAuth callback parameters
type oauthCallbackParams struct {
	code   string
	state  string
	userID int64
}

// validateOAuthCallback validates the OAuth callback parameters and state.
// Returns the validated params or an error string for the redirect.
func (h *JiraHandlers) validateOAuthCallback(ctx context.Context, r *http.Request) (*oauthCallbackParams, string) {
	// Guard: Check for OAuth error from provider
	if errorParam := r.URL.Query().Get("error"); errorParam != "" {
		errorDesc := r.URL.Query().Get("error_description")
		return nil, errorParam + ": " + errorDesc
	}

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	// Guard: Require both code and state
	if code == "" || state == "" {
		return nil, "missing_parameters"
	}

	// Guard: Validate state and get userID
	userID, err := h.stateStore.Validate(ctx, state)
	if err != nil {
		if err == oauth.ErrStateNotFound || err == oauth.ErrStateExpired {
			return nil, "invalid_state"
		}
		return nil, "state_validation_failed"
	}

	return &oauthCallbackParams{code: code, state: state, userID: userID}, ""
}

// exchangeAndGetResources exchanges the OAuth code for tokens and retrieves accessible resources.
// Returns the token response, resources, or an error string for the redirect.
func (h *JiraHandlers) exchangeAndGetResources(code string) (*jira.TokenResponse, []jira.AccessibleResource, string) {
	// Guard: OAuth service must be configured
	if h.oauthService == nil {
		return nil, nil, "oauth_not_configured"
	}

	// Exchange code for tokens
	tokenResp, err := h.oauthService.ExchangeCode(code)
	if err != nil {
		return nil, nil, "token_exchange_failed"
	}

	// Get accessible resources to find the cloud ID and site URL
	resources, err := h.oauthService.GetAccessibleResources(tokenResp.AccessToken)
	if err != nil {
		return nil, nil, "resources_failed"
	}

	// Guard: At least one site must be accessible
	if len(resources) == 0 {
		return nil, nil, "no_sites_found"
	}

	return tokenResp, resources, ""
}

// HandleOAuthCallback handles the OAuth callback from Atlassian
// Saves the OAuth tokens as organization-wide Jira settings and redirects to frontend
func (h *JiraHandlers) HandleOAuthCallback(w http.ResponseWriter, r *http.Request) {
	redirectURL := h.frontendURL + "/settings"

	redirectWithError := func(errMsg string) {
		http.Redirect(w, r, redirectURL+"?jira_error="+errMsg, http.StatusFound)
	}

	// Validate callback parameters and state
	params, errMsg := h.validateOAuthCallback(r.Context(), r)
	if errMsg != "" {
		redirectWithError(errMsg)
		return
	}

	// Exchange code for tokens and get accessible resources
	tokenResp, resources, errMsg := h.exchangeAndGetResources(params.code)
	if errMsg != "" {
		redirectWithError(errMsg)
		return
	}

	// Use the first available site (in a real app, you might let the user choose)
	resource := resources[0]

	// Save tokens to org-wide settings
	orgSettings := &models.OrgJiraSettings{
		OAuthAccessToken:    tokenResp.AccessToken,
		OAuthRefreshToken:   tokenResp.RefreshToken,
		OAuthTokenExpiresAt: jira.CalculateExpiry(tokenResp.ExpiresIn),
		CloudID:             resource.ID,
		SiteURL:             resource.URL,
		SiteName:            &resource.Name,
		ConfiguredByID:      params.userID,
	}

	if err := h.orgJiraRepo.Save(r.Context(), orgSettings); err != nil {
		redirectWithError("save_failed")
		return
	}

	// Redirect to settings page with success
	http.Redirect(w, r, redirectURL+"?jira_connected=true", http.StatusFound)
}

// UpdateJiraSettings updates the current user's Jira credentials
// Only supervisors and admins can access Jira features
func (h *JiraHandlers) UpdateJiraSettings(w http.ResponseWriter, r *http.Request) {
	currentUser := requireJiraAccess(w, r)
	if currentUser == nil {
		return
	}

	var req models.UpdateJiraSettingsRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	if err := req.Validate(); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid Jira settings: please check all fields are filled correctly")
		return
	}

	// Test the credentials before saving
	client := jira.NewClient(req.JiraDomain, req.JiraEmail, req.JiraAPIToken)
	if err := client.TestConnection(); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid Jira credentials: unable to connect to Jira")
		return
	}

	// Save the credentials
	if err := h.userRepo.UpdateJiraSettings(r.Context(), currentUser.ID, &req); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to save Jira settings")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "Jira settings saved successfully",
		"configured":  true,
		"jira_domain": req.JiraDomain,
		"jira_email":  req.JiraEmail,
	})
}

// DeleteJiraSettings removes the current user's Jira credentials
// Only supervisors and admins can access Jira features
func (h *JiraHandlers) DeleteJiraSettings(w http.ResponseWriter, r *http.Request) {
	currentUser := requireJiraAccess(w, r)
	if currentUser == nil {
		return
	}

	if err := h.userRepo.ClearJiraSettings(r.Context(), currentUser.ID); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to clear Jira settings")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// JiraIssueWithTimeOff extends JiraIssue with time off impact info
type JiraIssueWithTimeOff struct {
	models.JiraIssue
	TimeOffImpact *models.TimeOffImpact `json:"time_off_impact,omitempty"`
}

// GetMyTasks returns Jira issues assigned to the current user
// Uses org-wide Jira connection and the user's jira_account_id mapping
// Only supervisors and admins can access Jira features
func (h *JiraHandlers) GetMyTasks(w http.ResponseWriter, r *http.Request) {
	currentUser := requireJiraAccess(w, r)
	if currentUser == nil {
		return
	}

	// Check if user has a Jira account ID mapped
	if currentUser.JiraAccountID == nil || *currentUser.JiraAccountID == "" {
		// Return empty array if user is not linked to Jira
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	// Parse max results
	maxResults := 50
	if maxStr := r.URL.Query().Get("max"); maxStr != "" {
		if m, err := strconv.Atoi(maxStr); err == nil && m > 0 && m <= 100 {
			maxResults = m
		}
	}

	// Get Jira client with automatic token refresh
	client, err := h.getJiraClient(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to connect to Jira")
		return
	}

	// Fetch issues by the user's Jira account ID
	issues, err := client.GetIssuesByAccountID(*currentUser.JiraAccountID, maxResults)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch Jira issues")
		return
	}

	// Get user's approved time off for impact calculation
	var timeOffRequests []models.TimeOffRequest
	if h.timeOffRepo != nil {
		timeOffRequests, err = h.timeOffRepo.GetApprovedFutureTimeOffByUser(r.Context(), currentUser.ID)
		if err != nil {
			h.logger.WithContext(r.Context()).Warn("Failed to fetch time off for user", "user_id", currentUser.ID, "error", err)
			// Continue without time off impact
			timeOffRequests = []models.TimeOffRequest{}
		}
	}

	// Add time off impact to issues
	result := make([]JiraIssueWithTimeOff, len(issues))
	for i, issue := range issues {
		result[i] = JiraIssueWithTimeOff{
			JiraIssue:     issue,
			TimeOffImpact: database.CalculateTimeOffImpact(issue.DueDate, timeOffRequests),
		}
	}

	respondJSON(w, http.StatusOK, result)
}

// GetProjectTasks returns Jira issues for a specific project
// Uses org-wide Jira connection
// Only supervisors and admins can access Jira features
func (h *JiraHandlers) GetProjectTasks(w http.ResponseWriter, r *http.Request) {
	if requireJiraAccess(w, r) == nil {
		return
	}

	projectKey := chi.URLParam(r, "projectKey")
	if projectKey == "" {
		respondError(w, http.StatusBadRequest, "Project key is required")
		return
	}

	// Parse max results
	maxResults := 50
	if maxStr := r.URL.Query().Get("max"); maxStr != "" {
		if m, err := strconv.Atoi(maxStr); err == nil && m > 0 && m <= 100 {
			maxResults = m
		}
	}

	// Get Jira client with automatic token refresh
	client, err := h.getJiraClient(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to connect to Jira")
		return
	}

	issues, err := client.GetIssuesByProject(projectKey, maxResults)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch Jira issues")
		return
	}

	respondJSON(w, http.StatusOK, issues)
}

// GetProjects returns all Jira projects accessible via org-wide connection
// Only supervisors and admins can access Jira features
func (h *JiraHandlers) GetProjects(w http.ResponseWriter, r *http.Request) {
	if requireJiraAccess(w, r) == nil {
		return
	}

	// Get Jira client with automatic token refresh
	client, err := h.getJiraClient(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to connect to Jira")
		return
	}

	projects, err := client.GetProjects()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch Jira projects")
		return
	}

	respondJSON(w, http.StatusOK, projects)
}

// GetEpics returns all unresolved Jira epics via org-wide connection
// Only supervisors and admins can access Jira features
func (h *JiraHandlers) GetEpics(w http.ResponseWriter, r *http.Request) {
	if requireJiraAccess(w, r) == nil {
		return
	}

	// Get Jira client with automatic token refresh
	client, err := h.getJiraClient(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to connect to Jira")
		return
	}

	// Parse max results
	maxResults := 100
	if maxStr := r.URL.Query().Get("max"); maxStr != "" {
		if m, err := strconv.Atoi(maxStr); err == nil && m > 0 && m <= 200 {
			maxResults = m
		}
	}

	epics, err := client.GetEpics(maxResults)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch Jira epics")
		return
	}

	respondJSON(w, http.StatusOK, epics)
}

// GetUserTasks returns Jira issues for a specific user using org-wide Jira connection
// Uses the user's jira_account_id to query issues assigned to them
func (h *JiraHandlers) GetUserTasks(w http.ResponseWriter, r *http.Request) {
	currentUser := requireJiraAccess(w, r)
	if currentUser == nil {
		return
	}

	userID, err := parseIDParam(r, "userId")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Get target user
	targetUser, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	// Check if current user can manage target user
	if !currentUser.CanManage(targetUser) {
		respondError(w, http.StatusForbidden, "You don't have permission to view this user's tasks")
		return
	}

	// Check if user has a Jira account ID mapped
	if targetUser.JiraAccountID == nil || *targetUser.JiraAccountID == "" {
		respondError(w, http.StatusBadRequest, "User is not linked to a Jira account")
		return
	}

	// Parse max results
	maxResults := 50
	if maxStr := r.URL.Query().Get("max"); maxStr != "" {
		if m, err := strconv.Atoi(maxStr); err == nil && m > 0 && m <= 100 {
			maxResults = m
		}
	}

	// Get Jira client with automatic token refresh
	client, err := h.getJiraClient(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to connect to Jira")
		return
	}

	// Fetch issues by the user's Jira account ID
	issues, err := client.GetIssuesByAccountID(*targetUser.JiraAccountID, maxResults)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch Jira issues")
		return
	}

	// Get target user's approved time off for impact calculation
	var timeOffRequests []models.TimeOffRequest
	if h.timeOffRepo != nil {
		timeOffRequests, err = h.timeOffRepo.GetApprovedFutureTimeOffByUser(r.Context(), targetUser.ID)
		if err != nil {
			h.logger.WithContext(r.Context()).Warn("Failed to fetch time off for user", "user_id", targetUser.ID, "error", err)
			// Continue without time off impact
			timeOffRequests = []models.TimeOffRequest{}
		}
	}

	// Add time off impact to issues
	result := make([]JiraIssueWithTimeOff, len(issues))
	for i, issue := range issues {
		result[i] = JiraIssueWithTimeOff{
			JiraIssue:     issue,
			TimeOffImpact: database.CalculateTimeOffImpact(issue.DueDate, timeOffRequests),
		}
	}

	respondJSON(w, http.StatusOK, result)
}

// JiraUserWithMapping extends JiraUser with mapping info
type JiraUserWithMapping struct {
	models.JiraUser
	MappedUserID *int64       `json:"mapped_user_id,omitempty"`
	MappedUser   *models.User `json:"mapped_user,omitempty"`
}

// GetJiraUsers returns all Jira users for mapping to employees (admin only)
func (h *JiraHandlers) GetJiraUsers(w http.ResponseWriter, r *http.Request) {
	if requireAdmin(w, r) == nil {
		return
	}

	// Get Jira client with automatic token refresh
	client, err := h.getJiraClient(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to connect to Jira")
		return
	}

	// Fetch all Jira users with configurable pagination limit
	jiraUsers, err := client.GetAllUsers(h.maxUsersPagination)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch Jira users")
		return
	}

	// Fetch all employees to find mappings
	employees, err := h.userRepo.GetAll(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch employees")
		return
	}

	// Build a map of jira account ID to employee
	jiraToEmployee := make(map[string]*models.User)
	for i := range employees {
		if employees[i].JiraAccountID != nil && *employees[i].JiraAccountID != "" {
			jiraToEmployee[*employees[i].JiraAccountID] = &employees[i]
		}
	}

	// Enrich Jira users with mapping info
	result := make([]JiraUserWithMapping, len(jiraUsers))
	for i, ju := range jiraUsers {
		result[i] = JiraUserWithMapping{JiraUser: ju}
		if emp, ok := jiraToEmployee[ju.AccountID]; ok {
			result[i].MappedUserID = &emp.ID
			result[i].MappedUser = emp
		}
	}

	respondJSON(w, http.StatusOK, result)
}

// AutoMatchJiraUsers attempts to match Jira users to employees by email (admin only)
func (h *JiraHandlers) AutoMatchJiraUsers(w http.ResponseWriter, r *http.Request) {
	if requireAdmin(w, r) == nil {
		return
	}

	// Get Jira client with automatic token refresh
	client, err := h.getJiraClient(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to connect to Jira")
		return
	}

	// Fetch all Jira users with configurable pagination limit
	jiraUsers, err := client.GetAllUsers(h.maxUsersPagination)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch Jira users")
		return
	}

	// Get all employees
	employees, err := h.userRepo.GetAll(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch employees")
		return
	}

	// Build a map of email to Jira user for fast lookup
	jiraEmailMap := make(map[string]models.JiraUser)
	for _, ju := range jiraUsers {
		if ju.Email != "" {
			jiraEmailMap[strings.ToLower(ju.Email)] = ju
		}
	}

	// Match employees to Jira users by email
	matched := 0
	for _, emp := range employees {
		// Skip if already matched
		if emp.JiraAccountID != nil && *emp.JiraAccountID != "" {
			continue
		}

		// Try to find a Jira user with matching email
		if jiraUser, ok := jiraEmailMap[strings.ToLower(emp.Email)]; ok {
			if err := h.userRepo.UpdateJiraAccountID(r.Context(), emp.ID, &jiraUser.AccountID); err != nil {
				continue // Skip errors, continue matching others
			}
			matched++
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"matched": matched,
		"total_employees": len(employees),
		"total_jira_users": len(jiraUsers),
	})
}

// UpdateUserJiraMapping manually sets a user's Jira account ID (admin only)
func (h *JiraHandlers) UpdateUserJiraMapping(w http.ResponseWriter, r *http.Request) {
	if requireAdmin(w, r) == nil {
		return
	}

	userID, err := parseIDParam(r, "userId")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var req struct {
		JiraAccountID *string `json:"jira_account_id"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}

	// Update the user's Jira account ID
	if err := h.userRepo.UpdateJiraAccountID(r.Context(), userID, req.JiraAccountID); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update Jira mapping")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
	})
}

// DisconnectJira removes the organization-wide Jira connection (admin only)
func (h *JiraHandlers) DisconnectJira(w http.ResponseWriter, r *http.Request) {
	if requireAdmin(w, r) == nil {
		return
	}

	if err := h.orgJiraRepo.Delete(r.Context()); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to disconnect Jira")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// TeamTaskEmployee represents minimal employee info for team tasks
type TeamTaskEmployee struct {
	ID        int64   `json:"id"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Email     string  `json:"email"`
	AvatarURL *string `json:"avatar_url"`
}

// TeamTask represents a Jira issue with employee info and time off impact
type TeamTask struct {
	models.JiraIssue
	Employee      TeamTaskEmployee      `json:"employee"`
	TimeOffImpact *models.TimeOffImpact `json:"time_off_impact,omitempty"`
}

// GetTeamTasks returns Jira issues for all of a supervisor's direct reports
// Only supervisors and admins can access this endpoint
func (h *JiraHandlers) GetTeamTasks(w http.ResponseWriter, r *http.Request) {
	currentUser := requireJiraAccess(w, r)
	if currentUser == nil {
		return
	}

	// Get direct reports for the supervisor (admins get all users)
	var directReports []models.User
	var err error

	if currentUser.IsAdmin() {
		directReports, err = h.userRepo.GetAll(r.Context())
	} else {
		directReports, err = h.userRepo.GetDirectReportsBySupervisorID(r.Context(), currentUser.ID)
	}

	if err != nil {
		h.logger.WithContext(r.Context()).Error("Failed to fetch direct reports", "user_id", currentUser.ID, "error", err)
		respondError(w, http.StatusInternalServerError, "Failed to fetch direct reports")
		return
	}

	// Filter to only those with Jira account IDs
	var usersWithJira []models.User
	for _, user := range directReports {
		if user.JiraAccountID != nil && *user.JiraAccountID != "" {
			usersWithJira = append(usersWithJira, user)
		}
	}

	if len(usersWithJira) == 0 {
		respondJSON(w, http.StatusOK, []TeamTask{})
		return
	}

	// Parse max results per user
	maxPerUser := 20
	if maxStr := r.URL.Query().Get("max_per_user"); maxStr != "" {
		if m, err := strconv.Atoi(maxStr); err == nil && m > 0 && m <= 50 {
			maxPerUser = m
		}
	}

	// Get Jira client with automatic token refresh
	client, err := h.getJiraClient(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to connect to Jira")
		return
	}

	// Pre-fetch time off for all users (batch query)
	userTimeOffMap := make(map[int64][]models.TimeOffRequest)
	if h.timeOffRepo != nil {
		// Fetch time off for all users in the date range (now to far future for impact calc)
		for _, u := range usersWithJira {
			timeOff, err := h.timeOffRepo.GetApprovedFutureTimeOffByUser(r.Context(), u.ID)
			if err != nil {
				h.logger.WithContext(r.Context()).Warn("Failed to fetch time off for user", "user_id", u.ID, "error", err)
				continue
			}
			userTimeOffMap[u.ID] = timeOff
		}
	}

	// Fetch tasks for each direct report concurrently with bounded parallelism
	// to avoid overwhelming Jira API rate limits
	type userTasks struct {
		user   models.User
		issues []models.JiraIssue
		err    error
	}

	results := make(chan userTasks, len(usersWithJira))
	var wg sync.WaitGroup

	// Semaphore to limit concurrent Jira API requests
	semaphore := make(chan struct{}, h.maxConcurrentAPIReqs)

	for _, user := range usersWithJira {
		wg.Add(1)
		go func(u models.User) {
			defer wg.Done()
			// Acquire semaphore slot (blocks if at capacity)
			semaphore <- struct{}{}
			defer func() { <-semaphore }() // Release slot when done

			issues, err := client.GetIssuesByAccountID(*u.JiraAccountID, maxPerUser)
			results <- userTasks{user: u, issues: issues, err: err}
		}(user)
	}

	// Close results channel when all goroutines complete
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect all tasks with employee info and time off impact
	var teamTasks []TeamTask
	for result := range results {
		if result.err != nil {
			h.logger.WithContext(r.Context()).Error("Failed to fetch Jira issues for user", "user_id", result.user.ID, "error", result.err)
			continue
		}

		employee := TeamTaskEmployee{
			ID:        result.user.ID,
			FirstName: result.user.FirstName,
			LastName:  result.user.LastName,
			Email:     result.user.Email,
			AvatarURL: result.user.AvatarURL,
		}

		// Get time off for this user
		userTimeOff := userTimeOffMap[result.user.ID]

		for _, issue := range result.issues {
			teamTasks = append(teamTasks, TeamTask{
				JiraIssue:     issue,
				Employee:      employee,
				TimeOffImpact: database.CalculateTimeOffImpact(issue.DueDate, userTimeOff),
			})
		}
	}

	respondJSON(w, http.StatusOK, teamTasks)
}
