package services

import (
	"context"

	"github.com/smith-dallin/manager-dashboard/internal/auth0"
)

// Auth0ManagementAdapter adapts auth0.ManagementClient to the Auth0Client interface
// used by EmployeeService. This allows decoupling the service from the concrete
// Auth0 implementation.
type Auth0ManagementAdapter struct {
	client *auth0.ManagementClient
}

// NewAuth0ManagementAdapter creates a new adapter wrapping the given ManagementClient.
// Returns nil if client is nil.
func NewAuth0ManagementAdapter(client *auth0.ManagementClient) *Auth0ManagementAdapter {
	if client == nil {
		return nil
	}
	return &Auth0ManagementAdapter{client: client}
}

// CreateUser creates a new user in Auth0 and returns the user ID.
func (a *Auth0ManagementAdapter) CreateUser(ctx context.Context, email, firstName, lastName, password string) (*Auth0UserResponse, error) {
	resp, err := a.client.CreateUser(ctx, email, firstName, lastName, password)
	if err != nil {
		return nil, err
	}
	return &Auth0UserResponse{UserID: resp.UserID}, nil
}

// CreatePasswordChangeTicket creates a password change ticket for a user.
func (a *Auth0ManagementAdapter) CreatePasswordChangeTicket(ctx context.Context, userID, resultURL string, ttlSec int) (*Auth0TicketResponse, error) {
	resp, err := a.client.CreatePasswordChangeTicket(ctx, userID, resultURL, ttlSec)
	if err != nil {
		return nil, err
	}
	return &Auth0TicketResponse{Ticket: resp.Ticket}, nil
}

// DeleteUser deletes a user from Auth0.
func (a *Auth0ManagementAdapter) DeleteUser(ctx context.Context, userID string) error {
	return a.client.DeleteUser(ctx, userID)
}

// GenerateSecurePassword generates a cryptographically secure random password.
func (a *Auth0ManagementAdapter) GenerateSecurePassword(length int) (string, error) {
	return auth0.GenerateSecurePassword(length)
}
