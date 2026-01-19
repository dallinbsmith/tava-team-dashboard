package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/smith-dallin/manager-dashboard/internal/database"
	"github.com/smith-dallin/manager-dashboard/internal/middleware"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

type InvitationHandlers struct {
	invitationRepo *database.InvitationRepository
	userRepo       *database.UserRepository
}

func NewInvitationHandlers(invitationRepo *database.InvitationRepository, userRepo *database.UserRepository) *InvitationHandlers {
	return &InvitationHandlers{
		invitationRepo: invitationRepo,
		userRepo:       userRepo,
	}
}

// CreateInvitation creates a new invitation (admin only)
func (h *InvitationHandlers) CreateInvitation(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only admins can create invitations
	if !currentUser.IsAdmin() {
		http.Error(w, "Forbidden: admin access required", http.StatusForbidden)
		return
	}

	var req models.CreateInvitationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate the request
	if err := req.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Check if user already exists with this email
	existingUser, _ := h.userRepo.GetByEmail(r.Context(), req.Email)
	if existingUser != nil {
		http.Error(w, "A user with this email already exists", http.StatusConflict)
		return
	}

	// Check if there's already a pending invitation for this email
	existingInvitation, _ := h.invitationRepo.GetByEmail(r.Context(), req.Email)
	if existingInvitation != nil {
		http.Error(w, "A pending invitation already exists for this email", http.StatusConflict)
		return
	}

	// Create the invitation
	invitation, err := h.invitationRepo.Create(r.Context(), &req, currentUser.ID)
	if err != nil {
		http.Error(w, "Failed to create invitation", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, invitation)
}

// GetInvitations returns all invitations (admin only)
func (h *InvitationHandlers) GetInvitations(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only admins can view all invitations
	if !currentUser.IsAdmin() {
		http.Error(w, "Forbidden: admin access required", http.StatusForbidden)
		return
	}

	// Expire any pending invitations first
	_ = h.invitationRepo.ExpirePending(r.Context())

	invitations, err := h.invitationRepo.GetAll(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch invitations", http.StatusInternalServerError)
		return
	}

	if invitations == nil {
		invitations = []models.Invitation{}
	}

	respondJSON(w, http.StatusOK, invitations)
}

// GetInvitation returns a single invitation (admin only)
func (h *InvitationHandlers) GetInvitation(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only admins can view invitations
	if !currentUser.IsAdmin() {
		http.Error(w, "Forbidden: admin access required", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid invitation ID", http.StatusBadRequest)
		return
	}

	invitation, err := h.invitationRepo.GetByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Invitation not found", http.StatusNotFound)
		return
	}

	respondJSON(w, http.StatusOK, invitation)
}

// RevokeInvitation revokes an invitation (admin only)
func (h *InvitationHandlers) RevokeInvitation(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Only admins can revoke invitations
	if !currentUser.IsAdmin() {
		http.Error(w, "Forbidden: admin access required", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid invitation ID", http.StatusBadRequest)
		return
	}

	if err := h.invitationRepo.Revoke(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ValidateInvitation validates an invitation token (public endpoint)
func (h *InvitationHandlers) ValidateInvitation(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		http.Error(w, "Token is required", http.StatusBadRequest)
		return
	}

	invitation, err := h.invitationRepo.GetByToken(r.Context(), token)
	if err != nil {
		http.Error(w, "Invalid invitation token", http.StatusNotFound)
		return
	}

	// Don't expose the token in the response
	invitation.Token = ""

	// Return invitation info (without sensitive data)
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"valid":      invitation.Status == models.InvitationStatusPending,
		"email":      invitation.Email,
		"role":       invitation.Role,
		"expires_at": invitation.ExpiresAt,
		"status":     invitation.Status,
	})
}

// AcceptInvitation accepts an invitation and creates the user (called after Auth0 signup)
func (h *InvitationHandlers) AcceptInvitation(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		http.Error(w, "Token is required", http.StatusBadRequest)
		return
	}

	var req struct {
		Auth0ID   string `json:"auth0_id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Auth0ID == "" {
		http.Error(w, "auth0_id is required", http.StatusBadRequest)
		return
	}

	user, err := h.invitationRepo.Accept(r.Context(), token, req.Auth0ID, req.FirstName, req.LastName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondJSON(w, http.StatusOK, user)
}
