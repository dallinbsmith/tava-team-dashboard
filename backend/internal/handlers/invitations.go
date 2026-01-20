package handlers

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/smith-dallin/manager-dashboard/internal/logger"
	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository"
)

type InvitationHandlers struct {
	invitationRepo repository.InvitationRepository
	userRepo       repository.UserRepository
	logger         *logger.Logger
}

func NewInvitationHandlers(invitationRepo repository.InvitationRepository, userRepo repository.UserRepository) *InvitationHandlers {
	return &InvitationHandlers{
		invitationRepo: invitationRepo,
		userRepo:       userRepo,
		logger:         logger.Default().WithComponent("invitations"),
	}
}

// NewInvitationHandlersWithLogger creates invitation handlers with a custom logger
func NewInvitationHandlersWithLogger(invitationRepo repository.InvitationRepository, userRepo repository.UserRepository, log *logger.Logger) *InvitationHandlers {
	return &InvitationHandlers{
		invitationRepo: invitationRepo,
		userRepo:       userRepo,
		logger:         log.WithComponent("invitations"),
	}
}

// CreateInvitation godoc
// @Summary Create a new invitation
// @Description Creates a new invitation to onboard a user. Admin only.
// @Tags Invitations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param invitation body models.CreateInvitationRequest true "Invitation request"
// @Success 201 {object} models.Invitation "Created invitation"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin access required"
// @Failure 409 {object} map[string]interface{} "User or invitation already exists"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /invitations [post]
func (h *InvitationHandlers) CreateInvitation(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAdmin(w, r)
	if currentUser == nil {
		return
	}

	var req models.CreateInvitationRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	// Validate the request
	if err := req.Validate(); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid invitation: please check all required fields")
		return
	}

	// Check if user already exists with this email
	existingUser, _ := h.userRepo.GetByEmail(r.Context(), req.Email)
	if existingUser != nil {
		respondError(w, http.StatusConflict, "A user with this email already exists")
		return
	}

	// Check if there's already a pending invitation for this email
	existingInvitation, _ := h.invitationRepo.GetByEmail(r.Context(), req.Email)
	if existingInvitation != nil {
		respondError(w, http.StatusConflict, "A pending invitation already exists for this email")
		return
	}

	// Create the invitation
	invitation, err := h.invitationRepo.Create(r.Context(), &req, currentUser.ID)
	if err != nil {
		h.logger.AuditFailure(r.Context(), logger.AuditActionCreate, "invitation", req.Email, currentUser.ID, currentUser.Email, err.Error())
		respondError(w, http.StatusInternalServerError, "Failed to create invitation")
		return
	}

	// Audit log: invitation created
	h.logger.Audit(r.Context(), logger.AuditEvent{
		Action:     logger.AuditActionCreate,
		Resource:   "invitation",
		ResourceID: fmt.Sprintf("%d", invitation.ID),
		ActorID:    currentUser.ID,
		ActorEmail: currentUser.Email,
		Result:     logger.AuditResultSuccess,
		Details: map[string]any{
			"invitee_email": req.Email,
			"invitee_role":  req.Role,
		},
	})

	respondJSON(w, http.StatusCreated, invitation)
}

// GetInvitations godoc
// @Summary Get all invitations
// @Description Returns all invitations with pagination support. Admin only.
// @Tags Invitations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(50)
// @Success 200 {array} models.Invitation "List of invitations"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin access required"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /invitations [get]
func (h *InvitationHandlers) GetInvitations(w http.ResponseWriter, r *http.Request) {
	if requireAdmin(w, r) == nil {
		return
	}

	// Expire any pending invitations first
	_ = h.invitationRepo.ExpirePending(r.Context())

	invitations, err := h.invitationRepo.GetAll(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch invitations")
		return
	}

	if invitations == nil {
		invitations = []models.Invitation{}
	}

	// Support optional pagination
	if shouldPaginate(r) {
		p := parsePagination(r)
		paginated, total := paginateSlice(invitations, p)
		respondPaginated(w, paginated, total, p)
		return
	}

	respondJSON(w, http.StatusOK, invitations)
}

// GetInvitation godoc
// @Summary Get invitation by ID
// @Description Returns a single invitation by ID. Admin only.
// @Tags Invitations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Invitation ID"
// @Success 200 {object} models.Invitation "Invitation details"
// @Failure 400 {object} map[string]interface{} "Invalid invitation ID"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin access required"
// @Failure 404 {object} map[string]interface{} "Invitation not found"
// @Router /invitations/{id} [get]
func (h *InvitationHandlers) GetInvitation(w http.ResponseWriter, r *http.Request) {
	if requireAdmin(w, r) == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid invitation ID")
		return
	}

	invitation, err := h.invitationRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Invitation not found")
		return
	}

	respondJSON(w, http.StatusOK, invitation)
}

// RevokeInvitation godoc
// @Summary Revoke an invitation
// @Description Revokes a pending invitation. Admin only.
// @Tags Invitations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Invitation ID"
// @Success 204 "Invitation revoked"
// @Failure 400 {object} map[string]interface{} "Invalid invitation ID or already processed"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin access required"
// @Router /invitations/{id} [delete]
func (h *InvitationHandlers) RevokeInvitation(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAdmin(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid invitation ID")
		return
	}

	// Get invitation details before revoking for audit log
	invitation, _ := h.invitationRepo.GetByID(r.Context(), id)
	inviteeEmail := ""
	if invitation != nil {
		inviteeEmail = invitation.Email
	}

	if err := h.invitationRepo.Revoke(r.Context(), id); err != nil {
		h.logger.AuditFailure(r.Context(), logger.AuditActionRevoke, "invitation", fmt.Sprintf("%d", id), currentUser.ID, currentUser.Email, err.Error())
		respondError(w, http.StatusBadRequest, "Failed to revoke invitation")
		return
	}

	// Audit log: invitation revoked
	h.logger.Audit(r.Context(), logger.AuditEvent{
		Action:     logger.AuditActionRevoke,
		Resource:   "invitation",
		ResourceID: fmt.Sprintf("%d", id),
		ActorID:    currentUser.ID,
		ActorEmail: currentUser.Email,
		Result:     logger.AuditResultSuccess,
		Details: map[string]any{
			"invitee_email": inviteeEmail,
		},
	})

	w.WriteHeader(http.StatusNoContent)
}

// ValidateInvitation godoc
// @Summary Validate an invitation token
// @Description Validates an invitation token and returns invitation details. Public endpoint.
// @Tags Invitations
// @Accept json
// @Produce json
// @Param token path string true "Invitation token"
// @Success 200 {object} map[string]interface{} "Invitation validation result"
// @Failure 400 {object} map[string]interface{} "Token is required"
// @Failure 404 {object} map[string]interface{} "Invalid invitation token"
// @Router /invitations/validate/{token} [get]
func (h *InvitationHandlers) ValidateInvitation(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		respondError(w, http.StatusBadRequest, "Token is required")
		return
	}

	invitation, err := h.invitationRepo.GetByToken(r.Context(), token)
	if err != nil {
		respondError(w, http.StatusNotFound, "Invalid invitation token")
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

// AcceptInvitation godoc
// @Summary Accept an invitation
// @Description Accepts an invitation and creates the user account. Called after Auth0 signup.
// @Tags Invitations
// @Accept json
// @Produce json
// @Param token path string true "Invitation token"
// @Param request body object{auth0_id=string,first_name=string,last_name=string} true "User details"
// @Success 200 {object} models.User "Created user"
// @Failure 400 {object} map[string]interface{} "Invalid request or expired token"
// @Router /invitations/accept/{token} [post]
func (h *InvitationHandlers) AcceptInvitation(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		respondError(w, http.StatusBadRequest, "Token is required")
		return
	}

	var req struct {
		Auth0ID   string `json:"auth0_id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
	}

	if !decodeJSON(w, r, &req) {
		return
	}

	if req.Auth0ID == "" {
		respondError(w, http.StatusBadRequest, "auth0_id is required")
		return
	}

	user, err := h.invitationRepo.Accept(r.Context(), token, req.Auth0ID, req.FirstName, req.LastName)
	if err != nil {
		// Log failed accept attempt (we don't have user ID since they're not created yet)
		h.logger.AuditFailure(r.Context(), logger.AuditActionCreate, "user_from_invitation", token[:8]+"...", 0, "", err.Error())
		respondError(w, http.StatusBadRequest, "Failed to accept invitation: invalid or expired token")
		return
	}

	// Audit log: invitation accepted, user created
	h.logger.Audit(r.Context(), logger.AuditEvent{
		Action:     logger.AuditActionCreate,
		Resource:   "user_from_invitation",
		ResourceID: fmt.Sprintf("%d", user.ID),
		ActorID:    user.ID,
		ActorEmail: user.Email,
		Result:     logger.AuditResultSuccess,
		Details: map[string]any{
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"role":       user.Role,
		},
	})

	respondJSON(w, http.StatusOK, user)
}
