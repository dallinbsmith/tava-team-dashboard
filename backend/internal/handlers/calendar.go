package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository"
	"github.com/smith-dallin/manager-dashboard/internal/services"
)

type CalendarHandlers struct {
	bffService  *services.CalendarBFFService
	taskRepo    repository.TaskRepository
	meetingRepo repository.MeetingRepository
}

func NewCalendarHandlers(
	bffService *services.CalendarBFFService,
	taskRepo repository.TaskRepository,
	meetingRepo repository.MeetingRepository,
) *CalendarHandlers {
	return &CalendarHandlers{
		bffService:  bffService,
		taskRepo:    taskRepo,
		meetingRepo: meetingRepo,
	}
}

// GetEvents returns all calendar events (tasks, meetings, jira issues) within a date range
// This endpoint uses the BFF service to aggregate data from multiple sources
func (h *CalendarHandlers) GetEvents(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	// Parse start and end dates from query params
	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")

	var start, end time.Time
	var err error

	if startStr != "" {
		start, err = time.Parse(time.RFC3339, startStr)
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid start date format (use RFC3339)")
			return
		}
	} else {
		// Default to beginning of current month
		now := time.Now()
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	}

	if endStr != "" {
		end, err = time.Parse(time.RFC3339, endStr)
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid end date format (use RFC3339)")
			return
		}
	} else {
		// Default to end of current month
		now := time.Now()
		end = time.Date(now.Year(), now.Month()+1, 0, 23, 59, 59, 0, time.UTC)
	}

	// Use BFF service to aggregate all calendar data
	response, err := h.bffService.GetCalendarEvents(r.Context(), services.CalendarEventsRequest{
		User:  currentUser,
		Start: start,
		End:   end,
	})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch calendar events")
		return
	}

	respondJSON(w, http.StatusOK, response)
}

// CreateTask creates a new task
func (h *CalendarHandlers) CreateTask(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	var req models.CreateTaskRequest
	if !decodeJSON(w, r, &req) || !validateRequest(w, &req) {
		return
	}

	task, err := h.taskRepo.Create(r.Context(), &req, currentUser.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create task")
		return
	}

	respondJSON(w, http.StatusCreated, task)
}

// GetTask retrieves a task by ID
func (h *CalendarHandlers) GetTask(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid task ID")
		return
	}

	task, err := h.taskRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Task not found")
		return
	}

	// Check visibility - user must be creator, assignee, or admin
	if !h.canViewTask(currentUser, task) {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	respondJSON(w, http.StatusOK, task)
}

// UpdateTask updates a task
func (h *CalendarHandlers) UpdateTask(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid task ID")
		return
	}

	task, err := h.taskRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Task not found")
		return
	}

	// Only creator or admin can update
	if task.CreatedByID != currentUser.ID && !currentUser.IsAdmin() {
		respondError(w, http.StatusForbidden, "Forbidden: not task creator")
		return
	}

	var req models.UpdateTaskRequest
	if !decodeJSON(w, r, &req) || !validateRequest(w, &req) {
		return
	}

	updatedTask, err := h.taskRepo.Update(r.Context(), id, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update task")
		return
	}

	respondJSON(w, http.StatusOK, updatedTask)
}

// DeleteTask deletes a task
func (h *CalendarHandlers) DeleteTask(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid task ID")
		return
	}

	task, err := h.taskRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Task not found")
		return
	}

	// Only creator or admin can delete
	if task.CreatedByID != currentUser.ID && !currentUser.IsAdmin() {
		respondError(w, http.StatusForbidden, "Forbidden: not task creator")
		return
	}

	if err := h.taskRepo.Delete(r.Context(), id); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete task")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// CreateMeeting creates a new meeting
func (h *CalendarHandlers) CreateMeeting(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	var req models.CreateMeetingRequest
	if !decodeJSON(w, r, &req) || !validateRequest(w, &req) {
		return
	}

	meeting, err := h.meetingRepo.Create(r.Context(), &req, currentUser.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create meeting")
		return
	}

	respondJSON(w, http.StatusCreated, meeting)
}

// GetMeeting retrieves a meeting by ID
func (h *CalendarHandlers) GetMeeting(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid meeting ID")
		return
	}

	meeting, err := h.meetingRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Meeting not found")
		return
	}

	// Check visibility - user must be creator, attendee, or admin
	if !h.canViewMeeting(r.Context(), currentUser, meeting) {
		respondError(w, http.StatusForbidden, "Forbidden")
		return
	}

	respondJSON(w, http.StatusOK, meeting)
}

// UpdateMeeting updates a meeting
func (h *CalendarHandlers) UpdateMeeting(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid meeting ID")
		return
	}

	meeting, err := h.meetingRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Meeting not found")
		return
	}

	// Only creator or admin can update
	if meeting.CreatedByID != currentUser.ID && !currentUser.IsAdmin() {
		respondError(w, http.StatusForbidden, "Forbidden: not meeting creator")
		return
	}

	var req models.UpdateMeetingRequest
	if !decodeJSON(w, r, &req) || !validateRequest(w, &req) {
		return
	}

	updatedMeeting, err := h.meetingRepo.Update(r.Context(), id, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update meeting")
		return
	}

	respondJSON(w, http.StatusOK, updatedMeeting)
}

// DeleteMeeting deletes a meeting
func (h *CalendarHandlers) DeleteMeeting(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid meeting ID")
		return
	}

	meeting, err := h.meetingRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Meeting not found")
		return
	}

	// Only creator or admin can delete
	if meeting.CreatedByID != currentUser.ID && !currentUser.IsAdmin() {
		respondError(w, http.StatusForbidden, "Forbidden: not meeting creator")
		return
	}

	if err := h.meetingRepo.Delete(r.Context(), id); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete meeting")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// RespondToMeeting updates the user's response to a meeting invitation
func (h *CalendarHandlers) RespondToMeeting(w http.ResponseWriter, r *http.Request) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return
	}

	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid meeting ID")
		return
	}

	// Check if user is an attendee
	isAttendee, err := h.meetingRepo.IsAttendee(r.Context(), id, currentUser.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to check attendee status")
		return
	}
	if !isAttendee {
		respondError(w, http.StatusForbidden, "Not an attendee of this meeting")
		return
	}

	var req models.MeetingResponseRequest
	if !decodeJSON(w, r, &req) || !validateRequest(w, &req) {
		return
	}

	if err := h.meetingRepo.RespondToMeeting(r.Context(), id, currentUser.ID, req.Response); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update response")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// canViewTask checks if a user can view a task
func (h *CalendarHandlers) canViewTask(user *models.User, task *models.Task) bool {
	// Admin can see all
	if user.IsAdmin() {
		return true
	}

	// Creator can see their own tasks
	if task.CreatedByID == user.ID {
		return true
	}

	// Assignee can see tasks assigned to them
	if task.AssignedUserID != nil && *task.AssignedUserID == user.ID {
		return true
	}

	// Squad assignment - if user is in the assigned squad
	if task.AssignmentType == models.AssignmentTypeSquad {
		if task.AssignedSquadID != nil {
			for _, squad := range user.Squads {
				if squad.ID == *task.AssignedSquadID {
					return true
				}
			}
		}
	}

	// Department assignment - if user is in the department
	if task.AssignmentType == models.AssignmentTypeDepartment {
		if task.AssignedDepartment != nil && *task.AssignedDepartment == user.Department {
			return true
		}
	}

	return false
}

// canViewMeeting checks if a user can view a meeting
func (h *CalendarHandlers) canViewMeeting(ctx context.Context, user *models.User, meeting *models.Meeting) bool {
	// Admin can see all
	if user.IsAdmin() {
		return true
	}

	// Creator can see their own meetings
	if meeting.CreatedByID == user.ID {
		return true
	}

	// Attendee can see meetings they're invited to
	isAttendee, err := h.meetingRepo.IsAttendee(ctx, meeting.ID, user.ID)
	if err == nil && isAttendee {
		return true
	}

	return false
}
