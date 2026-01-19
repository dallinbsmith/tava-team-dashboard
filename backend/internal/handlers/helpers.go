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
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
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
		http.Error(w, "Forbidden: supervisor access required", http.StatusForbidden)
		return nil
	}
	return user
}

// decodeJSON decodes JSON request body into the provided struct
func decodeJSON(w http.ResponseWriter, r *http.Request, v interface{}) bool {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
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
		http.Error(w, err.Error(), http.StatusBadRequest)
		return false
	}
	return true
}

// respondError sends an error response with the given status code
func respondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error":   message,
		"status":  status,
	})
}

// respondAppError sends an error response based on an AppError
func respondAppError(w http.ResponseWriter, err error) {
	status := apperrors.GetHTTPStatus(err)
	message := apperrors.GetUserMessage(err)

	response := map[string]interface{}{
		"error":  message,
		"status": status,
	}

	// Include field information for validation errors
	if apperrors.IsValidation(err) {
		if appErr, ok := err.(*apperrors.AppError); ok && appErr.Field != "" {
			response["field"] = appErr.Field
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(response)
}
