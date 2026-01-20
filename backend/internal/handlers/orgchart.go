package handlers

import (
	"net/http"

	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository"
)

type OrgChartHandlers struct {
	orgChartRepo repository.OrgChartRepository
	userRepo     repository.UserRepository
}

func NewOrgChartHandlers(orgChartRepo repository.OrgChartRepository, userRepo repository.UserRepository) *OrgChartHandlers {
	return &OrgChartHandlers{
		orgChartRepo: orgChartRepo,
		userRepo:     userRepo,
	}
}

// CreateDraft creates a new org chart draft (supervisor only)
func (h *OrgChartHandlers) CreateDraft(w http.ResponseWriter, r *http.Request) {
	currentUser := requireSupervisor(w, r)
	if currentUser == nil {
		return
	}

	var req models.CreateDraftRequest
	if !decodeJSON(w, r, &req) || !validateRequest(w, &req) {
		return
	}

	draft, err := h.orgChartRepo.CreateDraft(r.Context(), &req, currentUser.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create draft")
		return
	}

	respondJSON(w, http.StatusCreated, draft)
}

// GetDrafts returns all drafts for the current user (supervisor) or all drafts (admin)
func (h *OrgChartHandlers) GetDrafts(w http.ResponseWriter, r *http.Request) {
	currentUser := requireSupervisor(w, r)
	if currentUser == nil {
		return
	}

	var drafts []models.OrgChartDraft
	var err error

	// Admins can see all drafts, supervisors only see their own
	if currentUser.IsAdmin() {
		drafts, err = h.orgChartRepo.GetAllDrafts(r.Context())
	} else {
		drafts, err = h.orgChartRepo.GetDraftsByCreator(r.Context(), currentUser.ID)
	}

	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch drafts")
		return
	}

	if drafts == nil {
		drafts = []models.OrgChartDraft{}
	}

	respondJSON(w, http.StatusOK, drafts)
}

// GetDraft returns a single draft with its changes (owner or admin)
func (h *OrgChartHandlers) GetDraft(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid draft ID")
		return
	}

	draft, err := h.orgChartRepo.GetDraftByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Draft not found")
		return
	}

	// Only draft owner or admin can view
	if draft.CreatedByID != currentUser.ID && !currentUser.IsAdmin() {
		respondError(w, http.StatusForbidden, "Forbidden: not draft owner")
		return
	}

	respondJSON(w, http.StatusOK, draft)
}

// UpdateDraft updates a draft's name/description (owner or admin)
func (h *OrgChartHandlers) UpdateDraft(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid draft ID")
		return
	}

	// Check ownership or admin
	draft, err := h.orgChartRepo.GetDraftByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Draft not found")
		return
	}
	if draft.CreatedByID != currentUser.ID && !currentUser.IsAdmin() {
		respondError(w, http.StatusForbidden, "Forbidden: not draft owner")
		return
	}

	var req models.UpdateDraftRequest
	if !decodeJSON(w, r, &req) || !validateRequest(w, &req) {
		return
	}

	updatedDraft, err := h.orgChartRepo.UpdateDraft(r.Context(), id, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update draft")
		return
	}

	respondJSON(w, http.StatusOK, updatedDraft)
}

// DeleteDraft deletes a draft (owner or admin)
func (h *OrgChartHandlers) DeleteDraft(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid draft ID")
		return
	}

	// Check ownership or admin
	draft, err := h.orgChartRepo.GetDraftByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Draft not found")
		return
	}
	if draft.CreatedByID != currentUser.ID && !currentUser.IsAdmin() {
		respondError(w, http.StatusForbidden, "Forbidden: not draft owner")
		return
	}

	if err := h.orgChartRepo.DeleteDraft(r.Context(), id); err != nil {
		respondError(w, http.StatusBadRequest, "Failed to delete draft")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// AddChange adds or updates a change in a draft (owner or admin, must be able to manage target user)
func (h *OrgChartHandlers) AddChange(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	draftID, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid draft ID")
		return
	}

	// Check ownership or admin
	draft, err := h.orgChartRepo.GetDraftByID(r.Context(), draftID)
	if err != nil {
		respondError(w, http.StatusNotFound, "Draft not found")
		return
	}
	if draft.CreatedByID != currentUser.ID && !currentUser.IsAdmin() {
		respondError(w, http.StatusForbidden, "Forbidden: not draft owner")
		return
	}

	var req models.AddDraftChangeRequest
	if !decodeJSON(w, r, &req) || !validateRequest(w, &req) {
		return
	}

	// Verify the user is a direct report of the current supervisor
	targetUser, err := h.userRepo.GetByID(r.Context(), req.UserID)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	if !currentUser.CanManage(targetUser) {
		respondError(w, http.StatusForbidden, "Forbidden: can only modify direct reports")
		return
	}

	change, err := h.orgChartRepo.AddOrUpdateChange(r.Context(), draftID, &req, h.userRepo)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to add change")
		return
	}

	respondJSON(w, http.StatusOK, change)
}

// RemoveChange removes a change from a draft (owner or admin)
func (h *OrgChartHandlers) RemoveChange(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	draftID, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid draft ID")
		return
	}

	userID, err := parseIDParam(r, "userId")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Check ownership or admin
	draft, err := h.orgChartRepo.GetDraftByID(r.Context(), draftID)
	if err != nil {
		respondError(w, http.StatusNotFound, "Draft not found")
		return
	}
	if draft.CreatedByID != currentUser.ID && !currentUser.IsAdmin() {
		respondError(w, http.StatusForbidden, "Forbidden: not draft owner")
		return
	}

	if err := h.orgChartRepo.RemoveChange(r.Context(), draftID, userID); err != nil {
		respondError(w, http.StatusBadRequest, "Failed to remove change from draft")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// PublishDraft publishes a draft, applying all changes (owner or admin)
func (h *OrgChartHandlers) PublishDraft(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid draft ID")
		return
	}

	// Check ownership or admin
	draft, err := h.orgChartRepo.GetDraftByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Draft not found")
		return
	}
	if draft.CreatedByID != currentUser.ID && !currentUser.IsAdmin() {
		respondError(w, http.StatusForbidden, "Forbidden: not draft owner")
		return
	}

	if err := h.orgChartRepo.PublishDraft(r.Context(), id); err != nil {
		respondError(w, http.StatusBadRequest, "Failed to publish draft")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "published"})
}

// GetOrgTree returns the org chart tree for the current supervisor or full org tree for admins
func (h *OrgChartHandlers) GetOrgTree(w http.ResponseWriter, r *http.Request) {
	currentUser := requireSupervisor(w, r)
	if currentUser == nil {
		return
	}

	// Admins get the full org tree, supervisors get their subtree
	if currentUser.IsAdmin() {
		trees, err := h.orgChartRepo.GetFullOrgTree(r.Context())
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to get org tree")
			return
		}
		respondJSON(w, http.StatusOK, trees)
		return
	}

	tree, err := h.orgChartRepo.GetOrgTree(r.Context(), currentUser.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to get org tree")
		return
	}

	respondJSON(w, http.StatusOK, tree)
}
