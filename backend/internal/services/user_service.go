package services

import (
	"context"

	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository"
	"github.com/smith-dallin/manager-dashboard/internal/sanitize"
)

// UserService handles user-related business logic
type UserService struct {
	userRepo  repository.UserRepository
	squadRepo repository.SquadRepository
}

// NewUserService creates a new user service
func NewUserService(userRepo repository.UserRepository, squadRepo repository.SquadRepository) *UserService {
	return &UserService{
		userRepo:  userRepo,
		squadRepo: squadRepo,
	}
}

// GetByID retrieves a user by ID with squads loaded
func (s *UserService) GetByID(ctx context.Context, id int64) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	squads, err := s.squadRepo.GetByUserID(ctx, user.ID)
	if err != nil {
		// Don't fail the request, just return empty squads
		squads = []models.Squad{}
	}
	user.Squads = squads

	return user, nil
}

// GetAll retrieves all users with squads loaded (batch optimized)
func (s *UserService) GetAll(ctx context.Context) ([]models.User, error) {
	users, err := s.userRepo.GetAll(ctx)
	if err != nil {
		return nil, err
	}

	return s.loadSquadsForUsers(ctx, users)
}

// GetDirectReports retrieves direct reports for a supervisor with squads loaded
func (s *UserService) GetDirectReports(ctx context.Context, supervisorID int64) ([]models.User, error) {
	users, err := s.userRepo.GetDirectReportsBySupervisorID(ctx, supervisorID)
	if err != nil {
		return nil, err
	}

	return s.loadSquadsForUsers(ctx, users)
}

// GetEmployeesForUser returns the appropriate list of users based on the current user's role
// - Admin: all users
// - Supervisor: direct reports
// - Employee: only themselves
func (s *UserService) GetEmployeesForUser(ctx context.Context, currentUser *models.User) ([]models.User, error) {
	var users []models.User
	var err error

	switch currentUser.Role {
	case models.RoleAdmin:
		users, err = s.userRepo.GetAll(ctx)
	case models.RoleSupervisor:
		users, err = s.userRepo.GetDirectReportsBySupervisorID(ctx, currentUser.ID)
	default:
		// Employees can only see themselves
		user, err := s.GetByID(ctx, currentUser.ID)
		if err != nil {
			return nil, err
		}
		return []models.User{*user}, nil
	}

	if err != nil {
		return nil, err
	}

	return s.loadSquadsForUsers(ctx, users)
}

// loadSquadsForUsers batch loads squads for a list of users
// This is the key optimization that prevents N+1 queries
func (s *UserService) loadSquadsForUsers(ctx context.Context, users []models.User) ([]models.User, error) {
	if len(users) == 0 {
		return users, nil
	}

	// Collect all user IDs
	userIDs := make([]int64, len(users))
	for i, u := range users {
		userIDs[i] = u.ID
	}

	// Batch load squads for all users in a single query
	squadsMap, err := s.squadRepo.GetByUserIDs(ctx, userIDs)
	if err != nil {
		// Don't fail the request, just return users without squads
		return users, nil
	}

	// Assign squads to users
	for i := range users {
		if squads, ok := squadsMap[users[i].ID]; ok {
			users[i].Squads = squads
		} else {
			users[i].Squads = []models.Squad{}
		}
	}

	return users, nil
}

// Update updates a user and optionally their squad assignments
func (s *UserService) Update(ctx context.Context, id int64, req *models.UpdateUserRequest) (*models.User, error) {
	// Sanitize department field if provided
	if req.Department != nil {
		sanitized := sanitize.Name(*req.Department, 100)
		req.Department = &sanitized
	}

	user, err := s.userRepo.Update(ctx, id, req)
	if err != nil {
		return nil, err
	}

	// Update squads if provided
	if req.SquadIDs != nil {
		if err := s.squadRepo.SetUserSquads(ctx, id, req.SquadIDs); err != nil {
			return nil, err
		}
	}

	// Load squads for the response
	squads, err := s.squadRepo.GetByUserID(ctx, id)
	if err != nil {
		squads = []models.Squad{}
	}
	user.Squads = squads

	return user, nil
}
