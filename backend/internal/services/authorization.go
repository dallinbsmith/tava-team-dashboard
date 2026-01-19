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

// CanViewUser checks if the current user can view another user's details
func (s *AuthorizationService) CanViewUser(currentUser *models.User, targetUserID int64) error {
	// Admin can view anyone
	if currentUser.IsAdmin() {
		return nil
	}

	// Users can view themselves
	if currentUser.ID == targetUserID {
		return nil
	}

	// Supervisors can view their direct reports
	if currentUser.IsSupervisor() {
		targetUser, err := s.userRepo.GetByID(context.Background(), targetUserID)
		if err != nil {
			return apperrors.NewInternalError("failed to get user", err)
		}
		if targetUser == nil {
			return apperrors.NewNotFoundError("User")
		}
		if targetUser.SupervisorID != nil && *targetUser.SupervisorID == currentUser.ID {
			return nil
		}
	}

	return apperrors.NewForbiddenError("You do not have permission to view this user")
}

// CanUpdateUser checks if the current user can update another user
func (s *AuthorizationService) CanUpdateUser(currentUser *models.User, targetUserID int64) error {
	// Admin can update anyone
	if currentUser.IsAdmin() {
		return nil
	}

	// Users can update themselves (limited fields handled by handler)
	if currentUser.ID == targetUserID {
		return nil
	}

	// Supervisors can update their direct reports
	if currentUser.IsSupervisor() {
		targetUser, err := s.userRepo.GetByID(context.Background(), targetUserID)
		if err != nil {
			return apperrors.NewInternalError("failed to get user", err)
		}
		if targetUser == nil {
			return apperrors.NewNotFoundError("User")
		}
		if targetUser.SupervisorID != nil && *targetUser.SupervisorID == currentUser.ID {
			return nil
		}
	}

	return apperrors.NewForbiddenError("You do not have permission to update this user")
}

// CanDeleteUser checks if the current user can delete another user
func (s *AuthorizationService) CanDeleteUser(currentUser *models.User, targetUserID int64) error {
	// Admin can delete anyone except themselves
	if currentUser.IsAdmin() {
		if currentUser.ID == targetUserID {
			return apperrors.NewForbiddenError("Cannot delete yourself")
		}
		return nil
	}

	// Supervisors can delete their direct reports
	if currentUser.IsSupervisor() {
		targetUser, err := s.userRepo.GetByID(context.Background(), targetUserID)
		if err != nil {
			return apperrors.NewInternalError("failed to get user", err)
		}
		if targetUser == nil {
			return apperrors.NewNotFoundError("User")
		}
		if targetUser.SupervisorID != nil && *targetUser.SupervisorID == currentUser.ID {
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
func (s *AuthorizationService) CanReviewTimeOffRequest(currentUser *models.User, requestingUserID int64) error {
	// Only supervisors and admins can review
	if !currentUser.IsSupervisorOrAdmin() {
		return apperrors.NewForbiddenError("Only supervisors and admins can review time-off requests")
	}

	// Admin can review all
	if currentUser.IsAdmin() {
		return nil
	}

	// Supervisor can only review their direct reports
	requestingUser, err := s.userRepo.GetByID(context.Background(), requestingUserID)
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
func (s *AuthorizationService) CanCreateTimeOffForOther(currentUser *models.User, targetUserID int64) error {
	// Only supervisors and admins can create for others
	if !currentUser.IsSupervisorOrAdmin() {
		return apperrors.NewForbiddenError("Only supervisors and admins can create time off for others")
	}

	// Admin can create for anyone
	if currentUser.IsAdmin() {
		return nil
	}

	// Supervisor can only create for their direct reports
	targetUser, err := s.userRepo.GetByID(context.Background(), targetUserID)
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
