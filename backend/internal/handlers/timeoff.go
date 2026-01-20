package handlers

import (
	"net/http"

	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository"
)

type TimeOffHandlers struct {
	timeOffRepo repository.TimeOffRepository
	userRepo    repository.UserRepository
}

func NewTimeOffHandlers(timeOffRepo repository.TimeOffRepository, userRepo repository.UserRepository) *TimeOffHandlers {
	return &TimeOffHandlers{
		timeOffRepo: timeOffRepo,
		userRepo:    userRepo,
	}
}

// Create creates a new time off request
func (h *TimeOffHandlers) Create(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	var req models.CreateTimeOffRequestInput
	if !decodeJSON(w, r, &req) || !validateRequest(w, &req) {
		return
	}

	// Determine the target user ID
	targetUserID := currentUser.ID
	var targetUser *models.User

	// If user_id is provided, this is a supervisor/admin creating for another user
	if req.UserID != nil && *req.UserID != currentUser.ID {
		// Only supervisors and admins can create time off for others
		if !currentUser.IsSupervisorOrAdmin() {
			respondError(w, http.StatusForbidden, "Forbidden: only supervisors and admins can create time off for others")
			return
		}

		// Get the target user to verify permissions
		var err error
		targetUser, err = h.userRepo.GetByID(r.Context(), *req.UserID)
		if err != nil || targetUser == nil {
			respondError(w, http.StatusBadRequest, "Invalid user ID")
			return
		}

		// For supervisors, verify the target is their direct report
		if !currentUser.IsAdmin() {
			if targetUser.SupervisorID == nil || *targetUser.SupervisorID != currentUser.ID {
				respondError(w, http.StatusForbidden, "Forbidden: can only create time off for direct reports")
				return
			}
		}

		targetUserID = *req.UserID
	} else {
		targetUser = currentUser
	}

	timeOff, err := h.timeOffRepo.Create(r.Context(), targetUserID, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create time off request")
		return
	}

	// If auto_approve is set and requester is supervisor/admin creating for another user
	if req.AutoApprove && req.UserID != nil && *req.UserID != currentUser.ID && currentUser.IsSupervisorOrAdmin() {
		approveReq := &models.ReviewTimeOffRequestInput{
			Status: models.TimeOffStatusApproved,
		}
		if err := h.timeOffRepo.Review(r.Context(), timeOff.ID, currentUser.ID, approveReq); err != nil {
			// Request created but approval failed - log but don't fail the request
			// The request will remain in pending status
		} else {
			timeOff.Status = models.TimeOffStatusApproved
			timeOff.ReviewerID = &currentUser.ID
		}
	}

	// Add user info to response
	timeOff.User = targetUser

	respondJSON(w, http.StatusCreated, timeOff)
}

// GetMyRequests returns the current user's time off requests
func (h *TimeOffHandlers) GetMyRequests(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	// Optional status filter
	var statusFilter *models.TimeOffStatus
	statusStr := r.URL.Query().Get("status")
	if statusStr != "" {
		status := models.TimeOffStatus(statusStr)
		if models.ValidTimeOffStatuses[status] {
			statusFilter = &status
		}
	}

	requests, err := h.timeOffRepo.GetByUserID(r.Context(), currentUser.ID, statusFilter)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch time off requests")
		return
	}

	if requests == nil {
		requests = []models.TimeOffRequest{}
	}

	respondJSON(w, http.StatusOK, requests)
}

// GetByID returns a specific time off request
func (h *TimeOffHandlers) GetByID(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid time off request ID")
		return
	}

	timeOff, err := h.timeOffRepo.GetByIDWithUser(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch time off request")
		return
	}
	if timeOff == nil {
		respondError(w, http.StatusNotFound, "Time off request not found")
		return
	}

	// Check permission: owner, supervisor, or admin
	if !h.canViewTimeOff(currentUser, timeOff) {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	respondJSON(w, http.StatusOK, timeOff)
}

// Cancel cancels a pending time off request
func (h *TimeOffHandlers) Cancel(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid time off request ID")
		return
	}

	err = h.timeOffRepo.Cancel(r.Context(), id, currentUser.ID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Failed to cancel time off request")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GetPending returns pending time off requests for review
func (h *TimeOffHandlers) GetPending(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	// Only supervisors and admins can view pending requests
	if !currentUser.IsSupervisorOrAdmin() {
		respondError(w, http.StatusForbidden, "Forbidden: supervisor or admin access required")
		return
	}

	var requests []models.TimeOffRequest
	var err error

	if currentUser.IsAdmin() {
		// Admin sees all pending
		requests, err = h.timeOffRepo.GetAllPending(r.Context())
	} else {
		// Supervisor sees only direct reports
		requests, err = h.timeOffRepo.GetPendingForSupervisor(r.Context(), currentUser.ID)
	}

	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch pending requests")
		return
	}

	if requests == nil {
		requests = []models.TimeOffRequest{}
	}

	// Support optional pagination
	if shouldPaginate(r) {
		p := parsePagination(r)
		paginated, total := paginateSlice(requests, p)
		respondPaginated(w, paginated, total, p)
		return
	}

	respondJSON(w, http.StatusOK, requests)
}

// Review approves or rejects a time off request
func (h *TimeOffHandlers) Review(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	// Only supervisors and admins can review
	if !currentUser.IsSupervisorOrAdmin() {
		respondError(w, http.StatusForbidden, "Forbidden: supervisor or admin access required")
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid time off request ID")
		return
	}

	// Get the request to check authorization
	timeOff, err := h.timeOffRepo.GetByIDWithUser(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch time off request")
		return
	}
	if timeOff == nil {
		respondError(w, http.StatusNotFound, "Time off request not found")
		return
	}

	// Check if supervisor can review this request (only their direct reports)
	if !currentUser.IsAdmin() {
		// Get the requesting user to check supervisor
		requestingUser, err := h.userRepo.GetByID(r.Context(), timeOff.UserID)
		if err != nil || requestingUser == nil {
			respondError(w, http.StatusInternalServerError, "Failed to verify authorization")
			return
		}
		if requestingUser.SupervisorID == nil || *requestingUser.SupervisorID != currentUser.ID {
			respondError(w, http.StatusForbidden, "Forbidden: can only review direct reports' requests")
			return
		}
	}

	var req models.ReviewTimeOffRequestInput
	if !decodeJSON(w, r, &req) || !validateRequest(w, &req) {
		return
	}

	err = h.timeOffRepo.Review(r.Context(), id, currentUser.ID, &req)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Failed to review time off request")
		return
	}

	// Return updated request
	updated, _ := h.timeOffRepo.GetByIDWithUser(r.Context(), id)
	respondJSON(w, http.StatusOK, updated)
}

// GetTeamTimeOff returns approved time off for supervisor's team
func (h *TimeOffHandlers) GetTeamTimeOff(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	// Only supervisors and admins can view team time off
	if !currentUser.IsSupervisorOrAdmin() {
		respondError(w, http.StatusForbidden, "Forbidden: supervisor or admin access required")
		return
	}

	var requests []models.TimeOffRequest
	var err error

	if currentUser.IsAdmin() {
		// Admin can see all approved time off (we could add a query for this)
		// For now, get all direct reports' time off
		requests = []models.TimeOffRequest{}
	} else {
		// Supervisor sees only direct reports
		requests, err = h.timeOffRepo.GetTeamTimeOff(r.Context(), currentUser.ID)
	}

	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch team time off")
		return
	}

	if requests == nil {
		requests = []models.TimeOffRequest{}
	}

	// Support optional pagination
	if shouldPaginate(r) {
		p := parsePagination(r)
		paginated, total := paginateSlice(requests, p)
		respondPaginated(w, paginated, total, p)
		return
	}

	respondJSON(w, http.StatusOK, requests)
}

// canViewTimeOff checks if a user can view a time off request
func (h *TimeOffHandlers) canViewTimeOff(user *models.User, timeOff *models.TimeOffRequest) bool {
	// Admin can see all
	if user.IsAdmin() {
		return true
	}

	// Owner can see their own
	if timeOff.UserID == user.ID {
		return true
	}

	// Supervisor can see their direct reports' requests
	if user.IsSupervisor() && timeOff.User != nil && timeOff.User.SupervisorID != nil {
		return *timeOff.User.SupervisorID == user.ID
	}

	return false
}
