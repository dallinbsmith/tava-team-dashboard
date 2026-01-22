package services

import (
	"context"

	"github.com/smith-dallin/manager-dashboard/internal/apperrors"
	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository"
)

// AuthorizationService handles authorization logic across the application
type AuthorizationService struct {
	userRepo repository.UserRepository
}

// NewAuthorizationService creates a new authorization service
func NewAuthorizationService(userRepo repository.UserRepository) *AuthorizationService {
	return &AuthorizationService{
		userRepo: userRepo,
	}
}

// isDirectReport checks if targetUserID is a direct report of supervisorID.
// Returns the target user, whether they are a direct report, and any error.
func (s *AuthorizationService) isDirectReport(ctx context.Context, supervisorID, targetUserID int64) (*models.User, bool, error) {
	targetUser, err := s.userRepo.GetByID(ctx, targetUserID)
	if err != nil {
		return nil, false, apperrors.NewInternalError("failed to get user", err)
	}
	if targetUser == nil {
		return nil, false, apperrors.NewNotFoundError("User")
	}
	isReport := targetUser.SupervisorID != nil && *targetUser.SupervisorID == supervisorID
	return targetUser, isReport, nil
}

// CanViewUser checks if the current user can view another user's details
func (s *AuthorizationService) CanViewUser(ctx context.Context, currentUser *models.User, targetUserID int64) error {
	// Guard: Admin can view anyone
	if currentUser.IsAdmin() {
		return nil
	}

	// Guard: Users can view themselves
	if currentUser.ID == targetUserID {
		return nil
	}

	// Guard: Supervisors can view their direct reports
	if currentUser.IsSupervisor() {
		_, isReport, err := s.isDirectReport(ctx, currentUser.ID, targetUserID)
		if err != nil {
			return err
		}
		if isReport {
			return nil
		}
	}

	return apperrors.NewForbiddenError("You do not have permission to view this user")
}

// CanUpdateUser checks if the current user can update another user
func (s *AuthorizationService) CanUpdateUser(ctx context.Context, currentUser *models.User, targetUserID int64) error {
	// Guard: Admin can update anyone
	if currentUser.IsAdmin() {
		return nil
	}

	// Guard: Users can update themselves (limited fields handled by handler)
	if currentUser.ID == targetUserID {
		return nil
	}

	// Guard: Supervisors can update their direct reports
	if currentUser.IsSupervisor() {
		_, isReport, err := s.isDirectReport(ctx, currentUser.ID, targetUserID)
		if err != nil {
			return err
		}
		if isReport {
			return nil
		}
	}

	return apperrors.NewForbiddenError("You do not have permission to update this user")
}

// CanDeleteUser checks if the current user can delete another user
func (s *AuthorizationService) CanDeleteUser(ctx context.Context, currentUser *models.User, targetUserID int64) error {
	// Guard: Nobody can delete themselves
	if currentUser.ID == targetUserID {
		return apperrors.NewForbiddenError("Cannot delete yourself")
	}

	// Guard: Admin can delete anyone (except themselves, checked above)
	if currentUser.IsAdmin() {
		return nil
	}

	// Guard: Supervisors can delete their direct reports
	if currentUser.IsSupervisor() {
		_, isReport, err := s.isDirectReport(ctx, currentUser.ID, targetUserID)
		if err != nil {
			return err
		}
		if isReport {
			return nil
		}
	}

	return apperrors.NewForbiddenError("You do not have permission to delete this user")
}

// CanManageSquads checks if the current user can create/delete squads
func (s *AuthorizationService) CanManageSquads(currentUser *models.User) error {
	if currentUser.IsAdmin() || currentUser.IsSupervisor() {
		return nil
	}
	return apperrors.NewForbiddenError("Only admins and supervisors can manage squads")
}

// CanManageDepartments checks if the current user can create/delete departments
func (s *AuthorizationService) CanManageDepartments(currentUser *models.User) error {
	if currentUser.IsAdmin() || currentUser.IsSupervisor() {
		return nil
	}
	return apperrors.NewForbiddenError("Only admins and supervisors can manage departments")
}

// CanManageInvitations checks if the current user can manage invitations
func (s *AuthorizationService) CanManageInvitations(currentUser *models.User) error {
	if currentUser.IsAdmin() {
		return nil
	}
	return apperrors.NewForbiddenError("Only admins can manage invitations")
}

// CanConfigureJira checks if the current user can configure Jira integration
func (s *AuthorizationService) CanConfigureJira(currentUser *models.User) error {
	if currentUser.IsAdmin() {
		return nil
	}
	return apperrors.NewForbiddenError("Only admins can configure Jira integration")
}

// CanViewTimeOffRequest checks if the current user can view a time-off request
func (s *AuthorizationService) CanViewTimeOffRequest(currentUser *models.User, request *models.TimeOffRequest) error {
	// Admin can view all
	if currentUser.IsAdmin() {
		return nil
	}

	// Owner can view their own
	if request.UserID == currentUser.ID {
		return nil
	}

	// Supervisor can view their direct reports' requests
	if currentUser.IsSupervisor() && request.User != nil && request.User.SupervisorID != nil {
		if *request.User.SupervisorID == currentUser.ID {
			return nil
		}
	}

	return apperrors.NewForbiddenError("You do not have permission to view this time-off request")
}

// CanReviewTimeOffRequest checks if the current user can review a time-off request
func (s *AuthorizationService) CanReviewTimeOffRequest(ctx context.Context, currentUser *models.User, requestingUserID int64) error {
	// Only supervisors and admins can review
	if !currentUser.IsSupervisorOrAdmin() {
		return apperrors.NewForbiddenError("Only supervisors and admins can review time-off requests")
	}

	// Admin can review all
	if currentUser.IsAdmin() {
		return nil
	}

	// Supervisor can only review their direct reports
	requestingUser, err := s.userRepo.GetByID(ctx, requestingUserID)
	if err != nil {
		return apperrors.NewInternalError("failed to get user", err)
	}
	if requestingUser == nil {
		return apperrors.NewNotFoundError("User")
	}

	if requestingUser.SupervisorID == nil || *requestingUser.SupervisorID != currentUser.ID {
		return apperrors.NewForbiddenError("Can only review direct reports' requests")
	}

	return nil
}

// CanCreateTimeOffForOther checks if the current user can create time-off for another user
func (s *AuthorizationService) CanCreateTimeOffForOther(ctx context.Context, currentUser *models.User, targetUserID int64) error {
	// Only supervisors and admins can create for others
	if !currentUser.IsSupervisorOrAdmin() {
		return apperrors.NewForbiddenError("Only supervisors and admins can create time off for others")
	}

	// Admin can create for anyone
	if currentUser.IsAdmin() {
		return nil
	}

	// Supervisor can only create for their direct reports
	targetUser, err := s.userRepo.GetByID(ctx, targetUserID)
	if err != nil {
		return apperrors.NewInternalError("failed to get user", err)
	}
	if targetUser == nil {
		return apperrors.NewNotFoundError("User")
	}

	if targetUser.SupervisorID == nil || *targetUser.SupervisorID != currentUser.ID {
		return apperrors.NewForbiddenError("Can only create time off for direct reports")
	}

	return nil
}

// CanManageOrgChart checks if the current user can manage org chart drafts
func (s *AuthorizationService) CanManageOrgChart(currentUser *models.User) error {
	if currentUser.IsAdmin() || currentUser.IsSupervisor() {
		return nil
	}
	return apperrors.NewForbiddenError("Only admins and supervisors can manage org chart drafts")
}

// CanPublishOrgChart checks if the current user can publish org chart changes
func (s *AuthorizationService) CanPublishOrgChart(currentUser *models.User) error {
	if currentUser.IsAdmin() {
		return nil
	}
	return apperrors.NewForbiddenError("Only admins can publish org chart changes")
}
