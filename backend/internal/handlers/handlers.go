package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/smith-dallin/manager-dashboard/internal/database"
	"github.com/smith-dallin/manager-dashboard/internal/middleware"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// Handlers handles user-related HTTP requests
type Handlers struct {
	userRepo  *database.UserRepository
	squadRepo *database.SquadRepository
}

// New creates a new user handlers instance
func New(userRepo *database.UserRepository, squadRepo *database.SquadRepository) *Handlers {
	return &Handlers{
		userRepo:  userRepo,
		squadRepo: squadRepo,
	}
}

func (h *Handlers) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	user := requireAuth(w, r)
	if user == nil {
		return
	}

	// Load squads for the user
	squads, err := h.squadRepo.GetByUserID(r.Context(), user.ID)
	if err != nil {
		log.Printf("Error loading squads for user %d: %v", user.ID, err)
		squads = []models.Squad{}
	}
	user.Squads = squads

	respondJSON(w, http.StatusOK, user)
}

func (h *Handlers) GetEmployees(w http.ResponseWriter, r *http.Request) {
	user := requireAuth(w, r)
	if user == nil {
		return
	}

	var employees []models.User
	var err error

	if user.Role == models.RoleAdmin {
		// Admins see all users
		employees, err = h.userRepo.GetAll(r.Context())
		if err != nil {
			log.Printf("Error fetching all users for admin %d: %v", user.ID, err)
			respondError(w, http.StatusInternalServerError, "Failed to fetch employees")
			return
		}
	} else if user.Role == models.RoleSupervisor {
		// Supervisor gets their direct reports (employees and other supervisors)
		employees, err = h.userRepo.GetDirectReportsBySupervisorID(r.Context(), user.ID)
		if err != nil {
			log.Printf("Error fetching direct reports for supervisor %d: %v", user.ID, err)
			respondError(w, http.StatusInternalServerError, "Failed to fetch employees")
			return
		}
	} else {
		// Employees can only see themselves
		employees = []models.User{*user}
	}

	// Load squads for all employees
	if len(employees) > 0 {
		userIDs := make([]int64, len(employees))
		for i, emp := range employees {
			userIDs[i] = emp.ID
		}
		squadsMap, err := h.squadRepo.GetByUserIDs(r.Context(), userIDs)
		if err != nil {
			log.Printf("Error loading squads for employees: %v", err)
		} else {
			for i := range employees {
				if squads, ok := squadsMap[employees[i].ID]; ok {
					employees[i].Squads = squads
				}
			}
		}
	}

	respondJSON(w, http.StatusOK, employees)
}

func (h *Handlers) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.userRepo.GetAll(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch users")
		return
	}

	// Load squads for all users
	if len(users) > 0 {
		userIDs := make([]int64, len(users))
		for i, u := range users {
			userIDs[i] = u.ID
		}
		squadsMap, err := h.squadRepo.GetByUserIDs(r.Context(), userIDs)
		if err != nil {
			log.Printf("Error loading squads for users: %v", err)
		} else {
			for i := range users {
				if squads, ok := squadsMap[users[i].ID]; ok {
					users[i].Squads = squads
				}
			}
		}
	}

	respondJSON(w, http.StatusOK, users)
}

func (h *Handlers) GetUserByID(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	// Employees can only view themselves
	if currentUser.Role == models.RoleEmployee && currentUser.ID != id {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	// Supervisors can only view their own direct reports
	if currentUser.Role == models.RoleSupervisor && user.SupervisorID != nil && *user.SupervisorID != currentUser.ID && user.ID != currentUser.ID {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	// Load squads for the user
	squads, err := h.squadRepo.GetByUserID(r.Context(), user.ID)
	if err != nil {
		log.Printf("Error loading squads for user %d: %v", user.ID, err)
		squads = []models.Squad{}
	}
	user.Squads = squads

	respondJSON(w, http.StatusOK, user)
}

func (h *Handlers) CreateUser(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil || currentUser.Role != models.RoleSupervisor {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	var req models.CreateUserRequest
	if !decodeJSON(w, r, &req) || !validateRequest(w, &req) {
		return
	}

	// Set the supervisor ID to the current supervisor
	if req.SupervisorID == nil {
		req.SupervisorID = &currentUser.ID
	}

	user, err := h.userRepo.Create(r.Context(), &req, "")
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	respondJSON(w, http.StatusCreated, user)
}

func (h *Handlers) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	// Check permissions
	targetUser, err := h.userRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	// Employees can only update themselves (limited fields)
	// Supervisors can update their direct reports
	if currentUser.Role == models.RoleEmployee && currentUser.ID != id {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	if currentUser.Role == models.RoleSupervisor && targetUser.SupervisorID != nil && *targetUser.SupervisorID != currentUser.ID && targetUser.ID != currentUser.ID {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	var req models.UpdateUserRequest
	if !decodeJSON(w, r, &req) || !validateRequest(w, &req) {
		return
	}

	// Employees cannot change their own role
	if currentUser.Role == models.RoleEmployee && req.Role != nil {
		respondError(w, http.StatusForbidden, "Forbidden: cannot change role")
		return
	}

	user, err := h.userRepo.Update(r.Context(), id, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update user")
		return
	}

	// Update squads if squad_ids was provided in the request
	if req.SquadIDs != nil {
		if err := h.squadRepo.SetUserSquads(r.Context(), id, req.SquadIDs); err != nil {
			log.Printf("Error updating squads for user %d: %v", id, err)
			respondError(w, http.StatusInternalServerError, "Failed to update user squads")
			return
		}
	}

	// Load squads for the user before returning
	squads, err := h.squadRepo.GetByUserID(r.Context(), id)
	if err != nil {
		log.Printf("Error loading squads for user %d: %v", id, err)
		// Don't fail the request, just return empty squads
		squads = []models.Squad{}
	}
	user.Squads = squads

	respondJSON(w, http.StatusOK, user)
}

func (h *Handlers) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	currentUser := middleware.GetUserFromContext(r.Context())
	if currentUser == nil || currentUser.Role != models.RoleSupervisor {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	// Check if the user is a direct report of this supervisor
	targetUser, err := h.userRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	if targetUser.SupervisorID == nil || *targetUser.SupervisorID != currentUser.ID {
		respondError(w, http.StatusForbidden, "Forbidden: Can only delete your own direct reports")
		return
	}

	if err := h.userRepo.Delete(r.Context(), id); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete user")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) GetSupervisors(w http.ResponseWriter, r *http.Request) {
	supervisors, err := h.userRepo.GetAllSupervisors(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch supervisors")
		return
	}

	respondJSON(w, http.StatusOK, supervisors)
}

func (h *Handlers) GetSquads(w http.ResponseWriter, r *http.Request) {
	squads, err := h.squadRepo.GetAll(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch squads")
		return
	}

	respondJSON(w, http.StatusOK, squads)
}

func (h *Handlers) CreateSquad(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	// Only admins and supervisors can create squads
	if currentUser.Role == models.RoleEmployee {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}

	// Validate name
	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "Squad name is required")
		return
	}
	if len(req.Name) > 255 {
		respondError(w, http.StatusBadRequest, "Squad name must be 255 characters or less")
		return
	}

	squad, err := h.squadRepo.Create(r.Context(), req.Name)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create squad")
		return
	}

	respondJSON(w, http.StatusCreated, squad)
}

func (h *Handlers) GetDepartments(w http.ResponseWriter, r *http.Request) {
	departments, err := h.userRepo.GetAllDepartments(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch departments")
		return
	}

	respondJSON(w, http.StatusOK, departments)
}

func (h *Handlers) DeleteSquad(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	// Only admins and supervisors can delete squads
	if currentUser.Role == models.RoleEmployee {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid squad ID")
		return
	}

	if err := h.squadRepo.Delete(r.Context(), id); err != nil {
		log.Printf("Error deleting squad %d: %v", id, err)
		respondError(w, http.StatusInternalServerError, "Failed to delete squad")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Squad deleted successfully"})
}

func (h *Handlers) DeleteDepartment(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	// Only admins and supervisors can delete departments
	if currentUser.Role == models.RoleEmployee {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	department := chi.URLParam(r, "name")
	if department == "" {
		respondError(w, http.StatusBadRequest, "Department name is required")
		return
	}

	if err := h.userRepo.ClearDepartment(r.Context(), department); err != nil {
		log.Printf("Error clearing department %s: %v", department, err)
		respondError(w, http.StatusInternalServerError, "Failed to delete department")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Department deleted successfully"})
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
