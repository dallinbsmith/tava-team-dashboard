package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/smith-dallin/manager-dashboard/internal/database"
	"github.com/smith-dallin/manager-dashboard/internal/jira"
	"github.com/smith-dallin/manager-dashboard/internal/middleware"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

type JiraHandlers struct {
	userRepo     *database.UserRepository
	orgJiraRepo  *database.OrgJiraRepository
	timeOffRepo  *database.TimeOffRepository
	oauthService *jira.OAuthService
	frontendURL  string
	// Simple in-memory state store for OAuth (in production, use Redis or DB)
	oauthStates   map[string]int64 // state -> userID
	oauthStatesMu sync.RWMutex
}

func NewJiraHandlers(userRepo *database.UserRepository, orgJiraRepo *database.OrgJiraRepository, timeOffRepo *database.TimeOffRepository, oauthService *jira.OAuthService, frontendURL string) *JiraHandlers {
	return &JiraHandlers{
		userRepo:     userRepo,
		orgJiraRepo:  orgJiraRepo,
		timeOffRepo:  timeOffRepo,
		oauthService: oauthService,
		frontendURL:  frontendURL,
		oauthStates:  make(map[string]int64),
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
		return nil, fmt.Errorf("Jira is not configured for this organization")
	}

	accessToken := orgSettings.OAuthAccessToken

	// Check if token is expired and refresh if needed
	if orgSettings.IsTokenExpired() {
		if h.oauthService == nil {
			return nil, fmt.Errorf("cannot refresh token: OAuth service not configured")
		}

		log.Printf("Jira OAuth token expired, attempting to refresh...")

		tokenResp, err := h.oauthService.RefreshAccessToken(orgSettings.OAuthRefreshToken)
		if err != nil {
			return nil, fmt.Errorf("failed to refresh token: %w", err)
		}

		// Update both access and refresh tokens in the database
		// Atlassian uses refresh token rotation - each refresh token can only be used once
		newExpiry := jira.CalculateExpiry(tokenResp.ExpiresIn)
		if err := h.orgJiraRepo.UpdateTokens(ctx, tokenResp.AccessToken, tokenResp.RefreshToken, newExpiry); err != nil {
			log.Printf("Warning: Failed to save refreshed tokens: %v", err)
			// Continue with the new token even if save fails
		} else {
			log.Printf("Jira OAuth tokens refreshed successfully")
		}

		accessToken = tokenResp.AccessToken
	}

	return jira.NewOAuthClient(accessToken, orgSettings.CloudID, orgSettings.SiteURL), nil
}

// GetJiraSettings returns the organization-wide Jira settings
// Available to all authenticated users to check connection status
func (h *JiraHandlers) GetJiraSettings(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Check org-wide Jira settings first
	orgSettings, err := h.orgJiraRepo.Get(r.Context())
	if err != nil {
		http.Error(w, "Failed to get Jira settings", http.StatusInternalServerError)
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
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only admins can configure org-wide Jira
	if !currentUser.IsAdmin() {
		http.Error(w, "Only admins can configure Jira integration", http.StatusForbidden)
		return
	}

	if h.oauthService == nil {
		http.Error(w, "Jira OAuth is not configured", http.StatusServiceUnavailable)
		return
	}

	// Generate state parameter
	state, err := jira.GenerateState()
	if err != nil {
		http.Error(w, "Failed to generate state", http.StatusInternalServerError)
		return
	}

	// Store state -> userID mapping
	h.oauthStatesMu.Lock()
	h.oauthStates[state] = currentUser.ID
	h.oauthStatesMu.Unlock()

	// Get authorization URL
	authURL := h.oauthService.GetAuthorizationURL(state)

	respondJSON(w, http.StatusOK, map[string]string{
		"authorization_url": authURL,
	})
}

// HandleOAuthCallback handles the OAuth callback from Atlassian
// Saves the OAuth tokens as organization-wide Jira settings and redirects to frontend
func (h *JiraHandlers) HandleOAuthCallback(w http.ResponseWriter, r *http.Request) {
	redirectURL := h.frontendURL + "/settings"

	// Helper to redirect with error
	redirectWithError := func(errMsg string) {
		http.Redirect(w, r, redirectURL+"?jira_error="+errMsg, http.StatusFound)
	}

	// Get the authorization code and state from query params
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	errorParam := r.URL.Query().Get("error")

	if errorParam != "" {
		errorDesc := r.URL.Query().Get("error_description")
		redirectWithError(errorParam + ": " + errorDesc)
		return
	}

	if code == "" || state == "" {
		redirectWithError("missing_parameters")
		return
	}

	// Validate state and get userID
	h.oauthStatesMu.Lock()
	userID, ok := h.oauthStates[state]
	if ok {
		delete(h.oauthStates, state)
	}
	h.oauthStatesMu.Unlock()

	if !ok {
		redirectWithError("invalid_state")
		return
	}

	if h.oauthService == nil {
		redirectWithError("oauth_not_configured")
		return
	}

	// Exchange code for tokens
	tokenResp, err := h.oauthService.ExchangeCode(code)
	if err != nil {
		redirectWithError("token_exchange_failed")
		return
	}

	// Get accessible resources to find the cloud ID and site URL
	resources, err := h.oauthService.GetAccessibleResources(tokenResp.AccessToken)
	if err != nil {
		redirectWithError("resources_failed")
		return
	}

	if len(resources) == 0 {
		redirectWithError("no_sites_found")
		return
	}

	// Use the first available site (in a real app, you might let the user choose)
	resource := resources[0]

	// Save tokens to org-wide settings
	orgSettings := &database.OrgJiraSettings{
		OAuthAccessToken:    tokenResp.AccessToken,
		OAuthRefreshToken:   tokenResp.RefreshToken,
		OAuthTokenExpiresAt: jira.CalculateExpiry(tokenResp.ExpiresIn),
		CloudID:             resource.ID,
		SiteURL:             resource.URL,
		SiteName:            &resource.Name,
		ConfiguredByID:      userID,
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
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only supervisors and admins can access Jira features
	if !currentUser.IsSupervisorOrAdmin() {
		http.Error(w, "Jira integration is only available for supervisors and admins", http.StatusForbidden)
		return
	}

	var req models.UpdateJiraSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Test the credentials before saving
	client := jira.NewClient(req.JiraDomain, req.JiraEmail, req.JiraAPIToken)
	if err := client.TestConnection(); err != nil {
		http.Error(w, "Invalid Jira credentials: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Save the credentials
	if err := h.userRepo.UpdateJiraSettings(r.Context(), currentUser.ID, &req); err != nil {
		http.Error(w, "Failed to save Jira settings", http.StatusInternalServerError)
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
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only supervisors and admins can access Jira features
	if !currentUser.IsSupervisorOrAdmin() {
		http.Error(w, "Jira integration is only available for supervisors and admins", http.StatusForbidden)
		return
	}

	if err := h.userRepo.ClearJiraSettings(r.Context(), currentUser.ID); err != nil {
		http.Error(w, "Failed to clear Jira settings", http.StatusInternalServerError)
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
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only supervisors and admins can access Jira features
	if !currentUser.IsSupervisorOrAdmin() {
		http.Error(w, "Jira integration is only available for supervisors and admins", http.StatusForbidden)
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
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch issues by the user's Jira account ID
	issues, err := client.GetIssuesByAccountID(*currentUser.JiraAccountID, maxResults)
	if err != nil {
		http.Error(w, "Failed to fetch Jira issues: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get user's approved time off for impact calculation
	var timeOffRequests []models.TimeOffRequest
	if h.timeOffRepo != nil {
		timeOffRequests, err = h.timeOffRepo.GetApprovedFutureTimeOffByUser(r.Context(), currentUser.ID)
		if err != nil {
			log.Printf("Warning: Failed to fetch time off for user %d: %v", currentUser.ID, err)
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
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only supervisors and admins can access Jira features
	if !currentUser.IsSupervisorOrAdmin() {
		http.Error(w, "Jira integration is only available for supervisors and admins", http.StatusForbidden)
		return
	}

	projectKey := chi.URLParam(r, "projectKey")
	if projectKey == "" {
		http.Error(w, "Project key is required", http.StatusBadRequest)
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
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	issues, err := client.GetIssuesByProject(projectKey, maxResults)
	if err != nil {
		http.Error(w, "Failed to fetch Jira issues: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, issues)
}

// GetProjects returns all Jira projects accessible via org-wide connection
// Only supervisors and admins can access Jira features
func (h *JiraHandlers) GetProjects(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only supervisors and admins can access Jira features
	if !currentUser.IsSupervisorOrAdmin() {
		http.Error(w, "Jira integration is only available for supervisors and admins", http.StatusForbidden)
		return
	}

	// Get Jira client with automatic token refresh
	client, err := h.getJiraClient(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	projects, err := client.GetProjects()
	if err != nil {
		http.Error(w, "Failed to fetch Jira projects: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, projects)
}

// GetEpics returns all unresolved Jira epics via org-wide connection
// Only supervisors and admins can access Jira features
func (h *JiraHandlers) GetEpics(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only supervisors and admins can access Jira features
	if !currentUser.IsSupervisorOrAdmin() {
		http.Error(w, "Jira integration is only available for supervisors and admins", http.StatusForbidden)
		return
	}

	// Get Jira client with automatic token refresh
	client, err := h.getJiraClient(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
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
		http.Error(w, "Failed to fetch Jira epics: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, epics)
}

// GetUserTasks returns Jira issues for a specific user using org-wide Jira connection
// Uses the user's jira_account_id to query issues assigned to them
func (h *JiraHandlers) GetUserTasks(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only supervisors and admins can view other users' tasks
	if !currentUser.IsSupervisorOrAdmin() {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	userIDStr := chi.URLParam(r, "userId")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get target user
	targetUser, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Check if current user can manage target user
	if !currentUser.CanManage(targetUser) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Check if user has a Jira account ID mapped
	if targetUser.JiraAccountID == nil || *targetUser.JiraAccountID == "" {
		http.Error(w, "User is not linked to a Jira account", http.StatusBadRequest)
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
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch issues by the user's Jira account ID
	issues, err := client.GetIssuesByAccountID(*targetUser.JiraAccountID, maxResults)
	if err != nil {
		http.Error(w, "Failed to fetch Jira issues: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get target user's approved time off for impact calculation
	var timeOffRequests []models.TimeOffRequest
	if h.timeOffRepo != nil {
		timeOffRequests, err = h.timeOffRepo.GetApprovedFutureTimeOffByUser(r.Context(), targetUser.ID)
		if err != nil {
			log.Printf("Warning: Failed to fetch time off for user %d: %v", targetUser.ID, err)
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
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only admins can fetch Jira users for mapping
	if !currentUser.IsAdmin() {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Get Jira client with automatic token refresh
	client, err := h.getJiraClient(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch all Jira users
	jiraUsers, err := client.GetAllUsers(1000)
	if err != nil {
		http.Error(w, "Failed to fetch Jira users: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch all employees to find mappings
	employees, err := h.userRepo.GetAll(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch employees", http.StatusInternalServerError)
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
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only admins can perform auto-matching
	if !currentUser.IsAdmin() {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Get Jira client with automatic token refresh
	client, err := h.getJiraClient(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch all Jira users
	jiraUsers, err := client.GetAllUsers(1000)
	if err != nil {
		http.Error(w, "Failed to fetch Jira users: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get all employees
	employees, err := h.userRepo.GetAll(r.Context())
	if err != nil {
		http.Error(w, "Failed to get employees", http.StatusInternalServerError)
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
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only admins can update Jira mappings
	if !currentUser.IsAdmin() {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	userIDStr := chi.URLParam(r, "userId")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var req struct {
		JiraAccountID *string `json:"jira_account_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update the user's Jira account ID
	if err := h.userRepo.UpdateJiraAccountID(r.Context(), userID, req.JiraAccountID); err != nil {
		http.Error(w, "Failed to update Jira mapping", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
	})
}

// DisconnectJira removes the organization-wide Jira connection (admin only)
func (h *JiraHandlers) DisconnectJira(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only admins can disconnect Jira
	if !currentUser.IsAdmin() {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if err := h.orgJiraRepo.Delete(r.Context()); err != nil {
		http.Error(w, "Failed to disconnect Jira", http.StatusInternalServerError)
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
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only supervisors and admins can view team tasks
	if !currentUser.IsSupervisorOrAdmin() {
		http.Error(w, "Forbidden", http.StatusForbidden)
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
		log.Printf("Error fetching direct reports for user %d: %v", currentUser.ID, err)
		http.Error(w, "Failed to fetch direct reports", http.StatusInternalServerError)
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
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Pre-fetch time off for all users (batch query)
	userTimeOffMap := make(map[int64][]models.TimeOffRequest)
	if h.timeOffRepo != nil {
		var userIDs []int64
		for _, u := range usersWithJira {
			userIDs = append(userIDs, u.ID)
		}
		// Fetch time off for all users in the date range (now to far future for impact calc)
		for _, u := range usersWithJira {
			timeOff, err := h.timeOffRepo.GetApprovedFutureTimeOffByUser(r.Context(), u.ID)
			if err != nil {
				log.Printf("Warning: Failed to fetch time off for user %d: %v", u.ID, err)
				continue
			}
			userTimeOffMap[u.ID] = timeOff
		}
	}

	// Fetch tasks for each direct report concurrently
	type userTasks struct {
		user   models.User
		issues []models.JiraIssue
		err    error
	}

	results := make(chan userTasks, len(usersWithJira))
	var wg sync.WaitGroup

	for _, user := range usersWithJira {
		wg.Add(1)
		go func(u models.User) {
			defer wg.Done()
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
			log.Printf("Error fetching Jira issues for user %d: %v", result.user.ID, result.err)
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
