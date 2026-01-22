package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/smith-dallin/manager-dashboard/internal/cache"
	"github.com/smith-dallin/manager-dashboard/internal/logger"
	"github.com/smith-dallin/manager-dashboard/internal/middleware"
	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository"
	"github.com/smith-dallin/manager-dashboard/internal/services"
)

// Cache key prefixes
const (
	cacheKeyAllUsers     = "users:all"
	cacheKeySupervisors  = "users:supervisors"
	cacheKeyAllSquads    = "squads:all"
	cacheKeyEmployees    = "users:employees:"
)

// Handlers handles user-related HTTP requests
type Handlers struct {
	userRepo    repository.UserRepository
	squadRepo   repository.SquadRepository
	userService *services.UserService
	cache       *cache.Cache
	logger      *logger.Logger
}

// New creates a new user handlers instance
func New(userRepo repository.UserRepository, squadRepo repository.SquadRepository) *Handlers {
	return &Handlers{
		userRepo:    userRepo,
		squadRepo:   squadRepo,
		userService: services.NewUserService(userRepo, squadRepo),
		logger:      logger.Default().WithComponent("handlers"),
	}
}

// NewWithCache creates a new user handlers instance with caching support
func NewWithCache(userRepo repository.UserRepository, squadRepo repository.SquadRepository, c *cache.Cache) *Handlers {
	return &Handlers{
		userRepo:    userRepo,
		squadRepo:   squadRepo,
		userService: services.NewUserService(userRepo, squadRepo),
		cache:       c,
		logger:      logger.Default().WithComponent("handlers"),
	}
}

// NewWithLogger creates a new user handlers instance with custom logger
func NewWithLogger(userRepo repository.UserRepository, squadRepo repository.SquadRepository, c *cache.Cache, log *logger.Logger) *Handlers {
	return &Handlers{
		userRepo:    userRepo,
		squadRepo:   squadRepo,
		userService: services.NewUserService(userRepo, squadRepo),
		cache:       c,
		logger:      log.WithComponent("handlers"),
	}
}

// InvalidateUserCache clears user-related cache entries
func (h *Handlers) InvalidateUserCache() {
	if h.cache == nil {
		return
	}
	h.cache.Delete(cacheKeyAllUsers)
	h.cache.Delete(cacheKeySupervisors)
	h.cache.DeletePrefix(cacheKeyEmployees)
}

// InvalidateSquadCache clears squad-related cache entries
func (h *Handlers) InvalidateSquadCache() {
	if h.cache == nil {
		return
	}
	h.cache.Delete(cacheKeyAllSquads)
}

// GetCurrentUser godoc
// @Summary Get current user
// @Description Returns the authenticated user's profile with their squads
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.User "User profile"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /me [get]
func (h *Handlers) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	user := requireAuth(w, r)
	if user == nil {
		return
	}

	// Load user with squads using service
	userWithSquads, err := h.userService.GetByID(r.Context(), user.ID)
	if err != nil {
		h.logger.LogError(r.Context(), "Failed to load user", err, "user_id", user.ID)
		respondError(w, http.StatusInternalServerError, "Failed to load user")
		return
	}

	respondJSON(w, http.StatusOK, userWithSquads.ToUserResponse())
}

// GetEmployees godoc
// @Summary Get employees
// @Description Returns employees based on user role: admins see all, supervisors see direct reports, employees see themselves
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(50)
// @Success 200 {array} models.User "List of employees"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /employees [get]
func (h *Handlers) GetEmployees(w http.ResponseWriter, r *http.Request) {
	user := requireAuth(w, r)
	if user == nil {
		return
	}

	// Use service to get employees with squads loaded based on role
	employees, err := h.userService.GetEmployeesForUser(r.Context(), user)
	if err != nil {
		h.logger.LogError(r.Context(), "Failed to fetch employees", err, "user_id", user.ID)
		respondError(w, http.StatusInternalServerError, "Failed to fetch employees")
		return
	}

	// Convert to response DTOs to avoid exposing sensitive fields
	employeeResponses := models.ToUserResponses(employees)

	// Support optional pagination
	if shouldPaginate(r) {
		p := parsePagination(r)
		paginated, total := paginateSlice(employeeResponses, p)
		respondPaginated(w, paginated, total, p)
		return
	}

	respondJSON(w, http.StatusOK, employeeResponses)
}

// GetAllUsers godoc
// @Summary Get all users
// @Description Returns all users in the system with their squads
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(50)
// @Success 200 {array} models.User "List of users"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /users [get]
func (h *Handlers) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	var err error

	// Try cache first
	if h.cache != nil {
		if cached, found := h.cache.Get(cacheKeyAllUsers); found {
			users = cached.([]models.User)
		}
	}

	// Fetch from database if not cached
	if users == nil {
		users, err = h.userService.GetAll(r.Context())
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch users")
			return
		}
		// Cache the result
		if h.cache != nil {
			h.cache.Set(cacheKeyAllUsers, users)
		}
	}

	// Convert to response DTOs to avoid exposing sensitive fields
	userResponses := models.ToUserResponses(users)

	// Support optional pagination
	if shouldPaginate(r) {
		p := parsePagination(r)
		paginated, total := paginateSlice(userResponses, p)
		respondPaginated(w, paginated, total, p)
		return
	}

	respondJSON(w, http.StatusOK, userResponses)
}

// GetUserByID godoc
// @Summary Get user by ID
// @Description Returns a specific user by their ID. Employees can only view themselves, supervisors can view their direct reports.
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 200 {object} models.User "User profile"
// @Failure 400 {object} map[string]interface{} "Invalid user ID"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Router /users/{id} [get]
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

	// Use service to get user with squads loaded
	user, err := h.userService.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	// Supervisors can only view their own direct reports
	if currentUser.Role == models.RoleSupervisor && user.SupervisorID != nil && *user.SupervisorID != currentUser.ID && user.ID != currentUser.ID {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	respondJSON(w, http.StatusOK, user.ToUserResponse())
}

// CreateUser godoc
// @Summary Create a new user
// @Description Creates a new user. Only supervisors can create users, and they will be assigned as the supervisor.
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param user body models.CreateUserRequest true "User creation request"
// @Success 201 {object} models.User "Created user"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /users [post]
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

	respondJSON(w, http.StatusCreated, user.ToUserResponse())
}

// UpdateUser godoc
// @Summary Update a user
// @Description Updates a user's profile. Employees can update themselves (limited fields), supervisors can update their direct reports.
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Param user body models.UpdateUserRequest true "User update request"
// @Success 200 {object} models.User "Updated user"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /users/{id} [put]
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

	// Use service to update user and squads
	user, err := h.userService.Update(r.Context(), id, &req)
	if err != nil {
		h.logger.LogError(r.Context(), "Failed to update user", err, "user_id", id)
		respondError(w, http.StatusInternalServerError, "Failed to update user")
		return
	}

	// Invalidate user cache on successful update
	h.InvalidateUserCache()

	respondJSON(w, http.StatusOK, user.ToUserResponse())
}

// DeleteUser godoc
// @Summary Delete a user
// @Description Deletes a user. Supervisors can only delete their own direct reports.
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 204 "User deleted"
// @Failure 400 {object} map[string]interface{} "Invalid user ID"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /users/{id} [delete]
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

	// Invalidate user cache on successful delete
	h.InvalidateUserCache()

	w.WriteHeader(http.StatusNoContent)
}

// DeactivateUser godoc
// @Summary Deactivate a user
// @Description Deactivates a user (soft delete). Admins can deactivate anyone except themselves. Supervisors can deactivate their direct reports.
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 204 "User deactivated"
// @Failure 400 {object} map[string]interface{} "Invalid user ID or cannot deactivate yourself"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /users/{id}/deactivate [post]
func (h *Handlers) DeactivateUser(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	// Only admins and supervisors can deactivate users
	if currentUser.Role == models.RoleEmployee {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	// Cannot deactivate yourself
	if currentUser.ID == id {
		respondError(w, http.StatusBadRequest, "Cannot deactivate yourself")
		return
	}

	// Get the target user
	targetUser, err := h.userRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	// Check if user is already inactive
	if !targetUser.IsActive {
		respondError(w, http.StatusBadRequest, "User is already inactive")
		return
	}

	// Supervisors can only deactivate their direct reports
	if currentUser.Role == models.RoleSupervisor {
		if targetUser.SupervisorID == nil || *targetUser.SupervisorID != currentUser.ID {
			respondError(w, http.StatusForbidden, "Forbidden: Can only deactivate your own direct reports")
			return
		}
	}

	// Deactivate the user (this also cleans up tasks, time-off, etc.)
	if err := h.userRepo.Deactivate(r.Context(), id); err != nil {
		h.logger.LogError(r.Context(), "Failed to deactivate user", err, "user_id", id)
		respondError(w, http.StatusInternalServerError, "Failed to deactivate user")
		return
	}

	// Invalidate user cache on successful deactivation
	h.InvalidateUserCache()

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) GetSupervisors(w http.ResponseWriter, r *http.Request) {
	var supervisors []models.User
	var err error

	// Try cache first
	if h.cache != nil {
		if cached, found := h.cache.Get(cacheKeySupervisors); found {
			supervisors = cached.([]models.User)
		}
	}

	// Fetch from database if not cached
	if supervisors == nil {
		supervisors, err = h.userRepo.GetAllSupervisors(r.Context())
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch supervisors")
			return
		}
		// Cache the result
		if h.cache != nil {
			h.cache.Set(cacheKeySupervisors, supervisors)
		}
	}

	// Support optional pagination
	if shouldPaginate(r) {
		p := parsePagination(r)
		paginated, total := paginateSlice(supervisors, p)
		respondPaginated(w, paginated, total, p)
		return
	}

	respondJSON(w, http.StatusOK, supervisors)
}

// GetSquads godoc
// @Summary Get all squads
// @Description Returns all squads/teams in the organization
// @Tags Squads
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(50)
// @Success 200 {array} models.Squad "List of squads"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /squads [get]
func (h *Handlers) GetSquads(w http.ResponseWriter, r *http.Request) {
	var squads []models.Squad
	var err error

	// Try cache first
	if h.cache != nil {
		if cached, found := h.cache.Get(cacheKeyAllSquads); found {
			squads = cached.([]models.Squad)
		}
	}

	// Fetch from database if not cached
	if squads == nil {
		squads, err = h.squadRepo.GetAll(r.Context())
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch squads")
			return
		}
		// Cache the result
		if h.cache != nil {
			h.cache.Set(cacheKeyAllSquads, squads)
		}
	}

	// Support optional pagination
	if shouldPaginate(r) {
		p := parsePagination(r)
		paginated, total := paginateSlice(squads, p)
		respondPaginated(w, paginated, total, p)
		return
	}

	respondJSON(w, http.StatusOK, squads)
}

// CreateSquad godoc
// @Summary Create a new squad
// @Description Creates a new squad/team. Only admins and supervisors can create squads.
// @Tags Squads
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param squad body object{name=string} true "Squad creation request"
// @Success 201 {object} models.Squad "Created squad"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /squads [post]
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

	// Invalidate squad cache on successful create
	h.InvalidateSquadCache()

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
		h.logger.LogError(r.Context(), "Failed to delete squad", err, "squad_id", id)
		respondError(w, http.StatusInternalServerError, "Failed to delete squad")
		return
	}

	// Invalidate squad cache on successful delete
	h.InvalidateSquadCache()

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
		h.logger.LogError(r.Context(), "Failed to clear department", err, "department", department)
		respondError(w, http.StatusInternalServerError, "Failed to delete department")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Department deleted successfully"})
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
