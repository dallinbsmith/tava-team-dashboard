package mocks

import (
	"context"

	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// MockSquadRepository is a mock implementation of SquadRepository for testing
type MockSquadRepository struct {
	Squads     map[int64]*models.Squad
	UserSquads map[int64][]int64 // userID -> squadIDs

	// Function hooks for custom behavior
	GetByIDFunc          func(ctx context.Context, id int64) (*models.Squad, error)
	GetAllFunc           func(ctx context.Context) ([]models.Squad, error)
	GetByUserIDFunc      func(ctx context.Context, userID int64) ([]models.Squad, error)
	GetByUserIDsFunc     func(ctx context.Context, userIDs []int64) (map[int64][]models.Squad, error)
	GetSquadIDsByUserIDFunc func(ctx context.Context, userID int64) ([]int64, error)
	CreateFunc           func(ctx context.Context, name string) (*models.Squad, error)
	DeleteFunc           func(ctx context.Context, id int64) error
	SetUserSquadsFunc    func(ctx context.Context, userID int64, squadIDs []int64) error
}

// NewMockSquadRepository creates a new mock squad repository
func NewMockSquadRepository() *MockSquadRepository {
	return &MockSquadRepository{
		Squads:     make(map[int64]*models.Squad),
		UserSquads: make(map[int64][]int64),
	}
}

func (m *MockSquadRepository) GetByID(ctx context.Context, id int64) (*models.Squad, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	if squad, ok := m.Squads[id]; ok {
		return squad, nil
	}
	return nil, nil
}

func (m *MockSquadRepository) GetAll(ctx context.Context) ([]models.Squad, error) {
	if m.GetAllFunc != nil {
		return m.GetAllFunc(ctx)
	}
	squads := make([]models.Squad, 0, len(m.Squads))
	for _, squad := range m.Squads {
		squads = append(squads, *squad)
	}
	return squads, nil
}

func (m *MockSquadRepository) GetByUserID(ctx context.Context, userID int64) ([]models.Squad, error) {
	if m.GetByUserIDFunc != nil {
		return m.GetByUserIDFunc(ctx, userID)
	}
	squadIDs, ok := m.UserSquads[userID]
	if !ok {
		return []models.Squad{}, nil
	}
	squads := make([]models.Squad, 0, len(squadIDs))
	for _, squadID := range squadIDs {
		if squad, ok := m.Squads[squadID]; ok {
			squads = append(squads, *squad)
		}
	}
	return squads, nil
}

func (m *MockSquadRepository) GetByUserIDs(ctx context.Context, userIDs []int64) (map[int64][]models.Squad, error) {
	if m.GetByUserIDsFunc != nil {
		return m.GetByUserIDsFunc(ctx, userIDs)
	}
	result := make(map[int64][]models.Squad)
	for _, userID := range userIDs {
		squadIDs, ok := m.UserSquads[userID]
		if !ok {
			result[userID] = []models.Squad{}
			continue
		}
		squads := make([]models.Squad, 0, len(squadIDs))
		for _, squadID := range squadIDs {
			if squad, ok := m.Squads[squadID]; ok {
				squads = append(squads, *squad)
			}
		}
		result[userID] = squads
	}
	return result, nil
}

func (m *MockSquadRepository) GetSquadIDsByUserID(ctx context.Context, userID int64) ([]int64, error) {
	if m.GetSquadIDsByUserIDFunc != nil {
		return m.GetSquadIDsByUserIDFunc(ctx, userID)
	}
	squadIDs, ok := m.UserSquads[userID]
	if !ok {
		return []int64{}, nil
	}
	return squadIDs, nil
}

func (m *MockSquadRepository) Create(ctx context.Context, name string) (*models.Squad, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, name)
	}
	squad := &models.Squad{
		ID:   int64(len(m.Squads) + 1),
		Name: name,
	}
	m.Squads[squad.ID] = squad
	return squad, nil
}

func (m *MockSquadRepository) Delete(ctx context.Context, id int64) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	delete(m.Squads, id)
	return nil
}

func (m *MockSquadRepository) SetUserSquads(ctx context.Context, userID int64, squadIDs []int64) error {
	if m.SetUserSquadsFunc != nil {
		return m.SetUserSquadsFunc(ctx, userID, squadIDs)
	}
	m.UserSquads[userID] = squadIDs
	return nil
}

// AddSquad is a helper method for setting up test data
func (m *MockSquadRepository) AddSquad(squad *models.Squad) {
	m.Squads[squad.ID] = squad
}

// AssignUserToSquad is a helper method for setting up test data
func (m *MockSquadRepository) AssignUserToSquad(userID, squadID int64) {
	m.UserSquads[userID] = append(m.UserSquads[userID], squadID)
}
