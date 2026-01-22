package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository/mocks"
)

// Note: ctxWithUser and ctxWithUserFrom helpers are defined in test_helpers_test.go

func TestNewInvitationHandlers(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()

	h := NewInvitationHandlers(invRepo, userRepo, nil)

	if h == nil {
		t.Fatal("expected handlers to be created")
	}
	if h.invitationRepo == nil {
		t.Error("expected invitationRepo to be set")
	}
	if h.userRepo == nil {
		t.Error("expected userRepo to be set")
	}
}

func TestCreateInvitation_Authorization(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	tests := []struct {
		name           string
		user           *models.User
		expectedStatus int
	}{
		{
			name:           "no user - unauthorized",
			user:           nil,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "employee - forbidden",
			user:           &models.User{ID: 1, Role: models.RoleEmployee},
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "supervisor - forbidden",
			user:           &models.User{ID: 1, Role: models.RoleSupervisor},
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body := `{"email":"test@example.com","role":"employee"}`
			req := httptest.NewRequest(http.MethodPost, "/invitations", bytes.NewBufferString(body))
			req.Header.Set("Content-Type", "application/json")
			if tt.user != nil {
				req = req.WithContext(ctxWithUser(tt.user))
			}
			rr := httptest.NewRecorder()

			h.CreateInvitation(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("CreateInvitation() status = %d, want %d", rr.Code, tt.expectedStatus)
			}
		})
	}
}

func TestCreateInvitation_AdminSuccess(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	admin := &models.User{ID: 1, Role: models.RoleAdmin}
	// Note: Only admin and supervisor roles can be invited per validation rules
	body := `{"email":"newuser@example.com","role":"supervisor"}`
	req := httptest.NewRequest(http.MethodPost, "/invitations", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(ctxWithUser(admin))
	rr := httptest.NewRecorder()

	h.CreateInvitation(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("CreateInvitation() status = %d, want %d", rr.Code, http.StatusCreated)
	}

	var response models.Invitation
	if err := json.NewDecoder(rr.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response.Email != "newuser@example.com" {
		t.Errorf("response.Email = %s, want newuser@example.com", response.Email)
	}
	if response.Role != models.RoleSupervisor {
		t.Errorf("response.Role = %s, want supervisor", response.Role)
	}
}

func TestCreateInvitation_DuplicateEmail(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	// Add existing user
	userRepo.AddUser(&models.User{
		ID:    1,
		Email: "existing@example.com",
		Role:  models.RoleSupervisor,
	})

	admin := &models.User{ID: 2, Role: models.RoleAdmin}
	body := `{"email":"existing@example.com","role":"supervisor"}`
	req := httptest.NewRequest(http.MethodPost, "/invitations", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(ctxWithUser(admin))
	rr := httptest.NewRecorder()

	h.CreateInvitation(rr, req)

	if rr.Code != http.StatusConflict {
		t.Errorf("CreateInvitation() status = %d, want %d", rr.Code, http.StatusConflict)
	}
}

func TestCreateInvitation_DuplicateInvitation(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	// Add existing invitation
	invRepo.AddInvitation(&models.Invitation{
		ID:     1,
		Email:  "pending@example.com",
		Token:  "token123",
		Role:   models.RoleSupervisor,
		Status: models.InvitationStatusPending,
	})

	admin := &models.User{ID: 2, Role: models.RoleAdmin}
	body := `{"email":"pending@example.com","role":"supervisor"}`
	req := httptest.NewRequest(http.MethodPost, "/invitations", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(ctxWithUser(admin))
	rr := httptest.NewRecorder()

	h.CreateInvitation(rr, req)

	if rr.Code != http.StatusConflict {
		t.Errorf("CreateInvitation() status = %d, want %d", rr.Code, http.StatusConflict)
	}
}

func TestCreateInvitation_InvalidBody(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	admin := &models.User{ID: 1, Role: models.RoleAdmin}
	body := `{invalid json}`
	req := httptest.NewRequest(http.MethodPost, "/invitations", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(ctxWithUser(admin))
	rr := httptest.NewRecorder()

	h.CreateInvitation(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("CreateInvitation() status = %d, want %d", rr.Code, http.StatusBadRequest)
	}
}

func TestGetInvitations_Authorization(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	tests := []struct {
		name           string
		user           *models.User
		expectedStatus int
	}{
		{
			name:           "no user - unauthorized",
			user:           nil,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "employee - forbidden",
			user:           &models.User{ID: 1, Role: models.RoleEmployee},
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "supervisor - forbidden",
			user:           &models.User{ID: 1, Role: models.RoleSupervisor},
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/invitations", nil)
			if tt.user != nil {
				req = req.WithContext(ctxWithUser(tt.user))
			}
			rr := httptest.NewRecorder()

			h.GetInvitations(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("GetInvitations() status = %d, want %d", rr.Code, tt.expectedStatus)
			}
		})
	}
}

func TestGetInvitations_AdminSuccess(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	// Add some invitations
	invRepo.AddInvitation(&models.Invitation{
		ID:        1,
		Email:     "user1@example.com",
		Token:     "token1",
		Role:      models.RoleEmployee,
		Status:    models.InvitationStatusPending,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})
	invRepo.AddInvitation(&models.Invitation{
		ID:        2,
		Email:     "user2@example.com",
		Token:     "token2",
		Role:      models.RoleSupervisor,
		Status:    models.InvitationStatusAccepted,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})

	admin := &models.User{ID: 1, Role: models.RoleAdmin}
	req := httptest.NewRequest(http.MethodGet, "/invitations", nil)
	req = req.WithContext(ctxWithUser(admin))
	rr := httptest.NewRecorder()

	h.GetInvitations(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("GetInvitations() status = %d, want %d", rr.Code, http.StatusOK)
	}

	var response []models.Invitation
	if err := json.NewDecoder(rr.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(response) != 2 {
		t.Errorf("GetInvitations() returned %d invitations, want 2", len(response))
	}
}

func TestGetInvitations_WithPagination(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	// Add several invitations
	for i := 1; i <= 5; i++ {
		invRepo.AddInvitation(&models.Invitation{
			ID:        int64(i),
			Email:     "user@example.com",
			Token:     "token",
			Role:      models.RoleEmployee,
			Status:    models.InvitationStatusPending,
			ExpiresAt: time.Now().Add(24 * time.Hour),
		})
	}

	admin := &models.User{ID: 1, Role: models.RoleAdmin}
	req := httptest.NewRequest(http.MethodGet, "/invitations?page=1&per_page=2", nil)
	req = req.WithContext(ctxWithUser(admin))
	rr := httptest.NewRecorder()

	h.GetInvitations(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("GetInvitations() status = %d, want %d", rr.Code, http.StatusOK)
	}

	var response PaginatedResponse
	if err := json.NewDecoder(rr.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response.Pagination.Total != 5 {
		t.Errorf("Pagination.Total = %d, want 5", response.Pagination.Total)
	}
	if response.Pagination.TotalPages != 3 {
		t.Errorf("Pagination.TotalPages = %d, want 3", response.Pagination.TotalPages)
	}
}

func TestGetInvitation_Authorization(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	tests := []struct {
		name           string
		user           *models.User
		expectedStatus int
	}{
		{
			name:           "no user - unauthorized",
			user:           nil,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "employee - forbidden",
			user:           &models.User{ID: 1, Role: models.RoleEmployee},
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/invitations/1", nil)
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", "1")
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
			if tt.user != nil {
				req = req.WithContext(context.WithValue(ctxWithUser(tt.user), chi.RouteCtxKey, rctx))
			}
			rr := httptest.NewRecorder()

			h.GetInvitation(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("GetInvitation() status = %d, want %d", rr.Code, tt.expectedStatus)
			}
		})
	}
}

func TestGetInvitation_NotFound(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	admin := &models.User{ID: 1, Role: models.RoleAdmin}
	req := httptest.NewRequest(http.MethodGet, "/invitations/999", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "999")
	ctx := context.WithValue(ctxWithUser(admin), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()

	h.GetInvitation(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("GetInvitation() status = %d, want %d", rr.Code, http.StatusNotFound)
	}
}

func TestRevokeInvitation_Authorization(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	tests := []struct {
		name           string
		user           *models.User
		expectedStatus int
	}{
		{
			name:           "no user - unauthorized",
			user:           nil,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "employee - forbidden",
			user:           &models.User{ID: 1, Role: models.RoleEmployee},
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodDelete, "/invitations/1/revoke", nil)
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", "1")
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
			if tt.user != nil {
				req = req.WithContext(context.WithValue(ctxWithUser(tt.user), chi.RouteCtxKey, rctx))
			}
			rr := httptest.NewRecorder()

			h.RevokeInvitation(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("RevokeInvitation() status = %d, want %d", rr.Code, tt.expectedStatus)
			}
		})
	}
}

func TestRevokeInvitation_AdminSuccess(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	invRepo.AddInvitation(&models.Invitation{
		ID:        1,
		Email:     "user@example.com",
		Token:     "token1",
		Role:      models.RoleEmployee,
		Status:    models.InvitationStatusPending,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})

	admin := &models.User{ID: 1, Role: models.RoleAdmin}
	req := httptest.NewRequest(http.MethodDelete, "/invitations/1/revoke", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "1")
	ctx := context.WithValue(ctxWithUser(admin), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()

	h.RevokeInvitation(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Errorf("RevokeInvitation() status = %d, want %d", rr.Code, http.StatusNoContent)
	}

	// Verify invitation was revoked
	inv := invRepo.Invitations[1]
	if inv.Status != models.InvitationStatusRevoked {
		t.Errorf("invitation status = %s, want revoked", inv.Status)
	}
}

func TestValidateInvitation(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	invRepo.AddInvitation(&models.Invitation{
		ID:        1,
		Email:     "user@example.com",
		Token:     "valid-token",
		Role:      models.RoleEmployee,
		Status:    models.InvitationStatusPending,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})

	t.Run("valid token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/invitations/validate/valid-token", nil)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("token", "valid-token")
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
		rr := httptest.NewRecorder()

		h.ValidateInvitation(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("ValidateInvitation() status = %d, want %d", rr.Code, http.StatusOK)
		}

		var response map[string]interface{}
		_ = json.NewDecoder(rr.Body).Decode(&response)

		if response["valid"] != true {
			t.Error("expected valid=true")
		}
		if response["email"] != "user@example.com" {
			t.Errorf("email = %v, want user@example.com", response["email"])
		}
	})

	t.Run("invalid token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/invitations/validate/invalid-token", nil)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("token", "invalid-token")
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
		rr := httptest.NewRecorder()

		h.ValidateInvitation(rr, req)

		if rr.Code != http.StatusNotFound {
			t.Errorf("ValidateInvitation() status = %d, want %d", rr.Code, http.StatusNotFound)
		}
	})

	t.Run("empty token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/invitations/validate/", nil)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("token", "")
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
		rr := httptest.NewRecorder()

		h.ValidateInvitation(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("ValidateInvitation() status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
	})
}

func TestAcceptInvitation(t *testing.T) {
	invRepo := mocks.NewMockInvitationRepository()
	userRepo := mocks.NewMockUserRepository()
	h := NewInvitationHandlers(invRepo, userRepo, nil)

	invRepo.AddInvitation(&models.Invitation{
		ID:        1,
		Email:     "user@example.com",
		Token:     "accept-token",
		Role:      models.RoleEmployee,
		Status:    models.InvitationStatusPending,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})

	t.Run("successful accept", func(t *testing.T) {
		body := `{"auth0_id":"auth0|123","first_name":"John","last_name":"Doe"}`
		req := httptest.NewRequest(http.MethodPost, "/invitations/accept/accept-token", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("token", "accept-token")
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
		rr := httptest.NewRecorder()

		h.AcceptInvitation(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("AcceptInvitation() status = %d, want %d", rr.Code, http.StatusOK)
		}

		var response models.User
		_ = json.NewDecoder(rr.Body).Decode(&response)

		if response.Email != "user@example.com" {
			t.Errorf("email = %s, want user@example.com", response.Email)
		}
		if response.FirstName != "John" {
			t.Errorf("firstName = %s, want John", response.FirstName)
		}
	})

	t.Run("missing auth0_id", func(t *testing.T) {
		body := `{"first_name":"John","last_name":"Doe"}`
		req := httptest.NewRequest(http.MethodPost, "/invitations/accept/accept-token", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("token", "accept-token")
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
		rr := httptest.NewRecorder()

		h.AcceptInvitation(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("AcceptInvitation() status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
	})

	t.Run("invalid token", func(t *testing.T) {
		body := `{"auth0_id":"auth0|456","first_name":"Jane","last_name":"Doe"}`
		req := httptest.NewRequest(http.MethodPost, "/invitations/accept/invalid-token", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("token", "invalid-token")
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
		rr := httptest.NewRecorder()

		h.AcceptInvitation(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("AcceptInvitation() status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
	})
}
