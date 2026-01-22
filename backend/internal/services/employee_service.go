package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"github.com/smith-dallin/manager-dashboard/internal/constants"
	"github.com/smith-dallin/manager-dashboard/internal/jira"
	"github.com/smith-dallin/manager-dashboard/internal/logger"
	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository"
)

// Auth0Client defines the interface for Auth0 operations needed by EmployeeService.
// This allows for easier testing and decoupling from the concrete implementation.
type Auth0Client interface {
	CreateUser(ctx context.Context, email, firstName, lastName, password string) (*Auth0UserResponse, error)
	CreatePasswordChangeTicket(ctx context.Context, userID, resultURL string, ttlSec int) (*Auth0TicketResponse, error)
	DeleteUser(ctx context.Context, userID string) error
	GenerateSecurePassword(length int) (string, error)
}

// Auth0UserResponse represents the response from Auth0 user creation.
type Auth0UserResponse struct {
	UserID string
}

// Auth0TicketResponse represents the response from Auth0 password ticket creation.
type Auth0TicketResponse struct {
	Ticket string
}

// CreateEmployeeInput contains all the data needed to create a new employee.
type CreateEmployeeInput struct {
	Email        string
	FirstName    string
	LastName     string
	Role         models.Role
	Department   string
	AvatarURL    *string
	SupervisorID *int64
	SquadIDs     []int64
}

// CreateEmployeeResult contains the result of creating an employee.
type CreateEmployeeResult struct {
	User          *models.User
	Auth0UserID   string
	JiraAccountID string
}

// EmployeeService handles complex employee operations that involve
// multiple external services (Auth0, Jira) and repositories.
type EmployeeService struct {
	userRepo    repository.UserRepository
	squadRepo   repository.SquadRepository
	orgJiraRepo repository.OrgJiraRepository
	auth0Client Auth0Client
	frontendURL string
	logger      *logger.Logger
}

// NewEmployeeService creates a new employee service.
// auth0Client and orgJiraRepo can be nil if those integrations are not configured.
func NewEmployeeService(
	userRepo repository.UserRepository,
	squadRepo repository.SquadRepository,
	orgJiraRepo repository.OrgJiraRepository,
	auth0Client Auth0Client,
	frontendURL string,
	log *logger.Logger,
) *EmployeeService {
	return &EmployeeService{
		userRepo:    userRepo,
		squadRepo:   squadRepo,
		orgJiraRepo: orgJiraRepo,
		auth0Client: auth0Client,
		frontendURL: frontendURL,
		logger:      log.WithComponent("employee_service"),
	}
}

// CreateEmployee creates a new employee, handling Auth0 user creation,
// Jira user creation (if configured), and database persistence.
func (s *EmployeeService) CreateEmployee(ctx context.Context, input CreateEmployeeInput) (*CreateEmployeeResult, error) {
	result := &CreateEmployeeResult{}

	// Step 1: Create Auth0 user (or generate placeholder ID)
	auth0UserID, err := s.createAuth0User(ctx, input)
	if err != nil {
		return nil, err
	}
	result.Auth0UserID = auth0UserID

	// Step 2: Create Jira user if configured
	jiraAccountID := s.createJiraUser(ctx, input)
	result.JiraAccountID = jiraAccountID

	// Step 3: Create user in database
	user, err := s.createDatabaseUser(ctx, input, auth0UserID)
	if err != nil {
		// Cleanup: delete Auth0 user if DB creation failed
		s.cleanupAuth0User(ctx, auth0UserID)
		return nil, err
	}
	result.User = user

	// Step 4: Update Jira account ID mapping if Jira user was created
	if jiraAccountID != "" {
		s.updateJiraMapping(ctx, user.ID, jiraAccountID)
		user.JiraAccountID = &jiraAccountID
	}

	// Step 5: Assign squads to the user
	if len(input.SquadIDs) > 0 {
		s.assignSquads(ctx, user, input.SquadIDs)
	}

	return result, nil
}

// createAuth0User creates a user in Auth0 or generates a placeholder ID if Auth0 is not configured.
func (s *EmployeeService) createAuth0User(ctx context.Context, input CreateEmployeeInput) (string, error) {
	if s.auth0Client == nil {
		// Auth0 not configured - generate a unique placeholder auth0_id
		return s.generatePlaceholderAuth0ID(input.Email)
	}

	// Generate a secure temporary password
	tempPassword, err := s.auth0Client.GenerateSecurePassword(16)
	if err != nil {
		return "", fmt.Errorf("failed to generate temporary password: %w", err)
	}

	// Create user in Auth0
	auth0User, err := s.auth0Client.CreateUser(ctx, input.Email, input.FirstName, input.LastName, tempPassword)
	if err != nil {
		return "", fmt.Errorf("failed to create user in Auth0: %w", err)
	}

	// Create a password change ticket so the user can set their own password
	s.createPasswordChangeTicket(ctx, auth0User.UserID, input.Email)

	return auth0User.UserID, nil
}

// createPasswordChangeTicket creates a password reset ticket for a new user.
// Errors are logged but don't fail the operation (user can use "forgot password" flow).
func (s *EmployeeService) createPasswordChangeTicket(ctx context.Context, auth0UserID, email string) {
	resultURL := s.frontendURL + "/login"
	ticket, err := s.auth0Client.CreatePasswordChangeTicket(ctx, auth0UserID, resultURL, constants.PasswordResetTicketExpiry)
	if err != nil {
		s.logger.Warn("Failed to create password change ticket", "user_id", auth0UserID, "error", err)
		return
	}
	// TODO: Send this ticket URL to the user via email
	s.logger.Info("Password reset ticket created", "email", email, "ticket", ticket.Ticket)
}

// generatePlaceholderAuth0ID generates a placeholder Auth0 ID when Auth0 is not configured.
func (s *EmployeeService) generatePlaceholderAuth0ID(email string) (string, error) {
	randomBytes := make([]byte, 16)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", fmt.Errorf("failed to generate unique ID: %w", err)
	}
	auth0UserID := fmt.Sprintf("placeholder|%s", hex.EncodeToString(randomBytes))
	s.logger.Info("Auth0 not configured - created placeholder auth0_id", "email", email)
	return auth0UserID, nil
}

// createJiraUser creates a user in Jira if organization Jira is configured.
// Returns the Jira account ID on success, empty string otherwise.
// Errors are logged but don't fail the operation.
func (s *EmployeeService) createJiraUser(ctx context.Context, input CreateEmployeeInput) string {
	if s.orgJiraRepo == nil {
		return ""
	}

	orgJiraSettings, err := s.orgJiraRepo.Get(ctx)
	if err != nil {
		s.logger.Warn("Failed to get org Jira settings", "error", err)
		return ""
	}
	if orgJiraSettings == nil {
		return ""
	}

	// Create Jira client with org OAuth credentials
	jiraClient := jira.NewOAuthClient(
		orgJiraSettings.OAuthAccessToken,
		orgJiraSettings.CloudID,
		orgJiraSettings.SiteURL,
	)

	// Create user in Jira
	displayName := fmt.Sprintf("%s %s", input.FirstName, input.LastName)
	jiraUser, err := jiraClient.CreateUser(input.Email, displayName)
	if err != nil {
		s.logger.Warn("Failed to create Jira user", "email", input.Email, "error", err)
		return ""
	}

	s.logger.Info("Jira user created", "email", input.Email, "jira_account_id", jiraUser.AccountID)
	return jiraUser.AccountID
}

// createDatabaseUser creates the user record in the database.
func (s *EmployeeService) createDatabaseUser(ctx context.Context, input CreateEmployeeInput, auth0UserID string) (*models.User, error) {
	req := &models.CreateUserRequest{
		Email:        input.Email,
		FirstName:    input.FirstName,
		LastName:     input.LastName,
		Role:         input.Role,
		Department:   input.Department,
		AvatarURL:    input.AvatarURL,
		SupervisorID: input.SupervisorID,
		SquadIDs:     input.SquadIDs,
	}

	user, err := s.userRepo.Create(ctx, req, auth0UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to create employee: %w", err)
	}

	return user, nil
}

// cleanupAuth0User deletes an Auth0 user after a failed database creation.
func (s *EmployeeService) cleanupAuth0User(ctx context.Context, auth0UserID string) {
	if auth0UserID == "" || s.auth0Client == nil {
		return
	}
	if deleteErr := s.auth0Client.DeleteUser(ctx, auth0UserID); deleteErr != nil {
		s.logger.Warn("Failed to delete Auth0 user after DB creation failure", "auth0_user_id", auth0UserID, "error", deleteErr)
	}
}

// updateJiraMapping updates the user's Jira account ID mapping.
func (s *EmployeeService) updateJiraMapping(ctx context.Context, userID int64, jiraAccountID string) {
	if err := s.userRepo.UpdateJiraAccountID(ctx, userID, &jiraAccountID); err != nil {
		s.logger.Warn("Failed to save Jira account ID mapping", "user_id", userID, "error", err)
	}
}

// assignSquads assigns squads to the user and loads them into the user object.
func (s *EmployeeService) assignSquads(ctx context.Context, user *models.User, squadIDs []int64) {
	if s.squadRepo == nil {
		return
	}

	if err := s.squadRepo.SetUserSquads(ctx, user.ID, squadIDs); err != nil {
		s.logger.Warn("Failed to assign squads to user", "user_id", user.ID, "error", err)
		return
	}

	// Load the squads into the user object for the response
	squads, err := s.squadRepo.GetByUserID(ctx, user.ID)
	if err != nil {
		s.logger.Warn("Failed to load squads for user", "user_id", user.ID, "error", err)
		return
	}
	user.Squads = squads
}
