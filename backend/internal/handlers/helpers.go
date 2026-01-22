package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/smith-dallin/manager-dashboard/internal/apperrors"
	"github.com/smith-dallin/manager-dashboard/internal/middleware"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// parseIDParam parses an ID from URL parameters
func parseIDParam(r *http.Request, param string) (int64, error) {
	idStr := chi.URLParam(r, param)
	return strconv.ParseInt(idStr, 10, 64)
}

// requireAuth gets the current user from context and returns an error if not authenticated
func requireAuth(w http.ResponseWriter, r *http.Request) *models.User {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		respondErrorWithCode(w, http.StatusUnauthorized, string(apperrors.CodeAuthRequired), "Unauthorized")
		return nil
	}
	return user
}

// requireSupervisor ensures the current user is a supervisor or admin
func requireSupervisor(w http.ResponseWriter, r *http.Request) *models.User {
	user := requireAuth(w, r)
	if user == nil {
		return nil
	}
	if !user.IsSupervisorOrAdmin() {
		respondErrorWithCode(w, http.StatusForbidden, string(apperrors.CodeSupervisorRequired), "Forbidden: supervisor access required")
		return nil
	}
	return user
}

// requireAdmin ensures the current user is an admin
func requireAdmin(w http.ResponseWriter, r *http.Request) *models.User {
	user := requireAuth(w, r)
	if user == nil {
		return nil
	}
	if !user.IsAdmin() {
		respondErrorWithCode(w, http.StatusForbidden, string(apperrors.CodeAdminRequired), "Forbidden: admin access required")
		return nil
	}
	return user
}

// requireJiraAccess ensures the current user has access to Jira integration (supervisor or admin)
func requireJiraAccess(w http.ResponseWriter, r *http.Request) *models.User {
	user := requireAuth(w, r)
	if user == nil {
		return nil
	}
	if !user.IsSupervisorOrAdmin() {
		respondErrorWithCode(w, http.StatusForbidden, string(apperrors.CodeSupervisorRequired), "Jira integration is only available for supervisors and admins")
		return nil
	}
	return user
}

// decodeJSON decodes JSON request body into the provided struct
func decodeJSON(w http.ResponseWriter, r *http.Request, v interface{}) bool {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return false
	}
	return true
}

// validateRequest validates a request struct that implements the Validator interface
type Validator interface {
	Validate() error
}

func validateRequest(w http.ResponseWriter, v Validator) bool {
	if err := v.Validate(); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request: please check all required fields")
		return false
	}
	return true
}

// respondError sends an error response with the given status code
func respondError(w http.ResponseWriter, status int, message string) {
	respondErrorWithCode(w, status, "", message)
}

// respondErrorWithCode sends an error response with a machine-readable error code
func respondErrorWithCode(w http.ResponseWriter, status int, code string, message string) {
	response := map[string]interface{}{
		"error":   message,
		"status":  status,
	}
	if code != "" {
		response["code"] = code
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(response)
}

// Pagination holds pagination parameters
type Pagination struct {
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
	Offset  int `json:"-"`
}

// DefaultPerPage is the default number of items per page
const DefaultPerPage = 50

// MaxPerPage is the maximum allowed items per page
const MaxPerPage = 100

// PaginatedResponse wraps data with pagination metadata
type PaginatedResponse struct {
	Data       interface{}       `json:"data"`
	Pagination PaginationMetadata `json:"pagination"`
}

// PaginationMetadata contains pagination information
type PaginationMetadata struct {
	Page       int  `json:"page"`
	PerPage    int  `json:"per_page"`
	Total      int  `json:"total"`
	TotalPages int  `json:"total_pages"`
	HasMore    bool `json:"has_more"`
}

// parsePagination extracts pagination parameters from the request
func parsePagination(r *http.Request) Pagination {
	page := 1
	perPage := DefaultPerPage

	if p := r.URL.Query().Get("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	if pp := r.URL.Query().Get("per_page"); pp != "" {
		if parsed, err := strconv.Atoi(pp); err == nil && parsed > 0 {
			perPage = parsed
			if perPage > MaxPerPage {
				perPage = MaxPerPage
			}
		}
	}

	return Pagination{
		Page:    page,
		PerPage: perPage,
		Offset:  (page - 1) * perPage,
	}
}

// respondPaginated sends a paginated JSON response
func respondPaginated(w http.ResponseWriter, data interface{}, total int, p Pagination) {
	totalPages := (total + p.PerPage - 1) / p.PerPage
	if totalPages < 1 {
		totalPages = 1
	}

	response := PaginatedResponse{
		Data: data,
		Pagination: PaginationMetadata{
			Page:       p.Page,
			PerPage:    p.PerPage,
			Total:      total,
			TotalPages: totalPages,
			HasMore:    p.Page < totalPages,
		},
	}

	respondJSON(w, http.StatusOK, response)
}

// paginateSlice applies pagination to a slice and returns the paginated portion
// along with the total count. Returns the slice unchanged if pagination results in out of bounds.
func paginateSlice[T any](items []T, p Pagination) ([]T, int) {
	total := len(items)
	if total == 0 {
		return items, 0
	}

	start := p.Offset
	if start >= total {
		return []T{}, total
	}

	end := start + p.PerPage
	if end > total {
		end = total
	}

	return items[start:end], total
}

// shouldPaginate checks if pagination was requested via query params
func shouldPaginate(r *http.Request) bool {
	return r.URL.Query().Has("page") || r.URL.Query().Has("per_page")
}
