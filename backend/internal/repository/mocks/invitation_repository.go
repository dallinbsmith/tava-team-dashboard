package mocks

import (
	"context"
	"errors"
	"time"

	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// MockInvitationRepository is a mock implementation of InvitationRepository for testing
type MockInvitationRepository struct {
	Invitations   map[int64]*models.Invitation
	ByToken       map[string]*models.Invitation
	ByEmail       map[string]*models.Invitation
	NextID        int64

	// Function hooks for custom behavior
	CreateFunc        func(ctx context.Context, req *models.CreateInvitationRequest, invitedByID int64) (*models.Invitation, error)
	GetByIDFunc       func(ctx context.Context, id int64) (*models.Invitation, error)
	GetByTokenFunc    func(ctx context.Context, token string) (*models.Invitation, error)
	GetByEmailFunc    func(ctx context.Context, email string) (*models.Invitation, error)
	GetAllFunc        func(ctx context.Context) ([]models.Invitation, error)
	AcceptFunc        func(ctx context.Context, token string, auth0ID string, firstName string, lastName string) (*models.User, error)
	RevokeFunc        func(ctx context.Context, id int64) error
	ExpirePendingFunc func(ctx context.Context) error
}

// NewMockInvitationRepository creates a new mock invitation repository
func NewMockInvitationRepository() *MockInvitationRepository {
	return &MockInvitationRepository{
		Invitations: make(map[int64]*models.Invitation),
		ByToken:     make(map[string]*models.Invitation),
		ByEmail:     make(map[string]*models.Invitation),
		NextID:      1,
	}
}

func (m *MockInvitationRepository) Create(ctx context.Context, req *models.CreateInvitationRequest, invitedByID int64) (*models.Invitation, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, req, invitedByID)
	}
	invitation := &models.Invitation{
		ID:          m.NextID,
		Email:       req.Email,
		Role:        req.Role,
		Token:       "mock-token-" + req.Email,
		Status:      models.InvitationStatusPending,
		InvitedByID: invitedByID,
		ExpiresAt:   time.Now().Add(7 * 24 * time.Hour),
		CreatedAt:   time.Now(),
	}
	m.NextID++
	m.Invitations[invitation.ID] = invitation
	m.ByToken[invitation.Token] = invitation
	m.ByEmail[invitation.Email] = invitation
	return invitation, nil
}

func (m *MockInvitationRepository) GetByID(ctx context.Context, id int64) (*models.Invitation, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	if inv, ok := m.Invitations[id]; ok {
		return inv, nil
	}
	return nil, errors.New("invitation not found")
}

func (m *MockInvitationRepository) GetByToken(ctx context.Context, token string) (*models.Invitation, error) {
	if m.GetByTokenFunc != nil {
		return m.GetByTokenFunc(ctx, token)
	}
	if inv, ok := m.ByToken[token]; ok {
		return inv, nil
	}
	return nil, errors.New("invitation not found")
}

func (m *MockInvitationRepository) GetByEmail(ctx context.Context, email string) (*models.Invitation, error) {
	if m.GetByEmailFunc != nil {
		return m.GetByEmailFunc(ctx, email)
	}
	if inv, ok := m.ByEmail[email]; ok {
		return inv, nil
	}
	return nil, nil
}

func (m *MockInvitationRepository) GetAll(ctx context.Context) ([]models.Invitation, error) {
	if m.GetAllFunc != nil {
		return m.GetAllFunc(ctx)
	}
	invitations := make([]models.Invitation, 0, len(m.Invitations))
	for _, inv := range m.Invitations {
		invitations = append(invitations, *inv)
	}
	return invitations, nil
}

func (m *MockInvitationRepository) Accept(ctx context.Context, token string, auth0ID string, firstName string, lastName string) (*models.User, error) {
	if m.AcceptFunc != nil {
		return m.AcceptFunc(ctx, token, auth0ID, firstName, lastName)
	}
	inv, ok := m.ByToken[token]
	if !ok {
		return nil, errors.New("invitation not found")
	}
	if inv.Status != models.InvitationStatusPending {
		return nil, errors.New("invitation is not pending")
	}
	inv.Status = models.InvitationStatusAccepted
	return &models.User{
		ID:        1,
		Auth0ID:   auth0ID,
		Email:     inv.Email,
		FirstName: firstName,
		LastName:  lastName,
		Role:      inv.Role,
	}, nil
}

func (m *MockInvitationRepository) Revoke(ctx context.Context, id int64) error {
	if m.RevokeFunc != nil {
		return m.RevokeFunc(ctx, id)
	}
	inv, ok := m.Invitations[id]
	if !ok {
		return errors.New("invitation not found")
	}
	inv.Status = models.InvitationStatusRevoked
	return nil
}

func (m *MockInvitationRepository) ExpirePending(ctx context.Context) error {
	if m.ExpirePendingFunc != nil {
		return m.ExpirePendingFunc(ctx)
	}
	now := time.Now()
	for _, inv := range m.Invitations {
		if inv.Status == models.InvitationStatusPending && inv.ExpiresAt.Before(now) {
			inv.Status = models.InvitationStatusExpired
		}
	}
	return nil
}

// AddInvitation is a helper method for setting up test data
func (m *MockInvitationRepository) AddInvitation(inv *models.Invitation) {
	m.Invitations[inv.ID] = inv
	if inv.Token != "" {
		m.ByToken[inv.Token] = inv
	}
	if inv.Email != "" {
		m.ByEmail[inv.Email] = inv
	}
	if inv.ID >= m.NextID {
		m.NextID = inv.ID + 1
	}
}
