package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository/mocks"
)

func TestCalendarHandlers_CreateTask_Authorization(t *testing.T) {
	tests := []struct {
		name           string
		currentUser    *models.User
		requestBody    string
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot create task",
			currentUser:    nil,
			requestBody:    `{"title":"Test Task","due_date":"2024-01-15T10:00:00Z","assignment_type":"user","assigned_user_id":1}`,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "authenticated user can create task",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleEmployee,
			},
			requestBody:    `{"title":"Test Task","due_date":"2024-01-15T10:00:00Z","assignment_type":"user","assigned_user_id":1}`,
			expectedStatus: http.StatusCreated,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := mocks.NewMockTaskRepository()
			meetingRepo := mocks.NewMockMeetingRepository()
			h := NewCalendarHandlers(nil, taskRepo, meetingRepo)

			req := httptest.NewRequest(http.MethodPost, "/api/calendar/tasks", bytes.NewBufferString(tt.requestBody))
			req.Header.Set("Content-Type", "application/json")

			if tt.currentUser != nil {
				req = req.WithContext(ctxWithUserFrom(req.Context(), tt.currentUser))
			}

			rr := httptest.NewRecorder()
			h.CreateTask(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("CreateTask() status = %v, want %v, body = %s", rr.Code, tt.expectedStatus, rr.Body.String())
			}
		})
	}
}

func TestCalendarHandlers_GetTask_Authorization(t *testing.T) {
	tests := []struct {
		name           string
		currentUser    *models.User
		taskID         string
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot get task",
			currentUser:    nil,
			taskID:         "1",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "invalid task ID returns bad request",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleEmployee,
			},
			taskID:         "invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := mocks.NewMockTaskRepository()
			h := NewCalendarHandlers(nil, taskRepo, nil)

			req := httptest.NewRequest(http.MethodGet, "/api/calendar/tasks/"+tt.taskID, nil)
			ctx := req.Context()
			if tt.currentUser != nil {
				ctx = ctxWithUserFrom(ctx, tt.currentUser)
			}
			ctx = chiCtxWithID(ctx, "id", tt.taskID)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			h.GetTask(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("GetTask() status = %v, want %v", rr.Code, tt.expectedStatus)
			}
		})
	}
}

func TestCalendarHandlers_GetTask_Success(t *testing.T) {
	userID := int64(1)
	taskID := int64(1)

	taskRepo := mocks.NewMockTaskRepository()
	dueDate := time.Now().AddDate(0, 0, 7)
	taskRepo.AddTask(&models.Task{
		ID:          taskID,
		Title:       "Test Task",
		DueDate:     dueDate,
		Status:      models.TaskStatusPending,
		CreatedByID: userID,
	})

	h := NewCalendarHandlers(nil, taskRepo, nil)

	user := &models.User{
		ID:   userID,
		Role: models.RoleEmployee,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/calendar/tasks/1", nil)
	ctx := ctxWithUserFrom(req.Context(), user)
	ctx = chiCtxWithID(ctx, "id", "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.GetTask(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("GetTask() status = %v, want %v, body = %s", rr.Code, http.StatusOK, rr.Body.String())
	}

	var response models.Task
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response.Title != "Test Task" {
		t.Errorf("GetTask() title = %v, want %v", response.Title, "Test Task")
	}
}

func TestCalendarHandlers_GetTask_Forbidden(t *testing.T) {
	ownerID := int64(1)
	otherUserID := int64(2)
	taskID := int64(1)

	taskRepo := mocks.NewMockTaskRepository()
	dueDate := time.Now().AddDate(0, 0, 7)
	taskRepo.AddTask(&models.Task{
		ID:          taskID,
		Title:       "Test Task",
		DueDate:     dueDate,
		Status:      models.TaskStatusPending,
		CreatedByID: ownerID,
		// No assigned user - only creator can view
	})

	h := NewCalendarHandlers(nil, taskRepo, nil)

	// Different employee trying to view
	otherUser := &models.User{
		ID:   otherUserID,
		Role: models.RoleEmployee,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/calendar/tasks/1", nil)
	ctx := ctxWithUserFrom(req.Context(), otherUser)
	ctx = chiCtxWithID(ctx, "id", "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.GetTask(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("GetTask() status = %v, want %v", rr.Code, http.StatusForbidden)
	}
}

func TestCalendarHandlers_UpdateTask_Authorization(t *testing.T) {
	userID := int64(1)
	otherUserID := int64(2)
	taskID := int64(1)

	taskRepo := mocks.NewMockTaskRepository()
	dueDate := time.Now().AddDate(0, 0, 7)
	taskRepo.AddTask(&models.Task{
		ID:          taskID,
		Title:       "Test Task",
		DueDate:     dueDate,
		Status:      models.TaskStatusPending,
		CreatedByID: userID,
	})

	tests := []struct {
		name           string
		currentUser    *models.User
		taskID         string
		requestBody    string
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot update task",
			currentUser:    nil,
			taskID:         "1",
			requestBody:    `{"title":"Updated Task"}`,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "non-creator cannot update task",
			currentUser: &models.User{
				ID:   otherUserID,
				Role: models.RoleEmployee,
			},
			taskID:         "1",
			requestBody:    `{"title":"Updated Task"}`,
			expectedStatus: http.StatusForbidden,
		},
		{
			name: "creator can update task",
			currentUser: &models.User{
				ID:   userID,
				Role: models.RoleEmployee,
			},
			taskID:         "1",
			requestBody:    `{"title":"Updated Task"}`,
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewCalendarHandlers(nil, taskRepo, nil)

			req := httptest.NewRequest(http.MethodPut, "/api/calendar/tasks/"+tt.taskID, bytes.NewBufferString(tt.requestBody))
			req.Header.Set("Content-Type", "application/json")
			ctx := req.Context()
			if tt.currentUser != nil {
				ctx = ctxWithUserFrom(ctx, tt.currentUser)
			}
			ctx = chiCtxWithID(ctx, "id", tt.taskID)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			h.UpdateTask(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("UpdateTask() status = %v, want %v, body = %s", rr.Code, tt.expectedStatus, rr.Body.String())
			}
		})
	}
}

func TestCalendarHandlers_UpdateTask_AdminCanUpdate(t *testing.T) {
	userID := int64(1)
	adminID := int64(2)
	taskID := int64(1)

	taskRepo := mocks.NewMockTaskRepository()
	dueDate := time.Now().AddDate(0, 0, 7)
	taskRepo.AddTask(&models.Task{
		ID:          taskID,
		Title:       "Test Task",
		DueDate:     dueDate,
		Status:      models.TaskStatusPending,
		CreatedByID: userID,
	})

	h := NewCalendarHandlers(nil, taskRepo, nil)

	admin := &models.User{
		ID:   adminID,
		Role: models.RoleAdmin,
	}

	req := httptest.NewRequest(http.MethodPut, "/api/calendar/tasks/1", bytes.NewBufferString(`{"title":"Admin Updated"}`))
	req.Header.Set("Content-Type", "application/json")
	ctx := ctxWithUserFrom(req.Context(), admin)
	ctx = chiCtxWithID(ctx, "id", "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.UpdateTask(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("UpdateTask() status = %v, want %v, body = %s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestCalendarHandlers_DeleteTask_Authorization(t *testing.T) {
	userID := int64(1)
	otherUserID := int64(2)
	taskID := int64(1)

	tests := []struct {
		name           string
		currentUser    *models.User
		taskID         string
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot delete task",
			currentUser:    nil,
			taskID:         "1",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "non-creator cannot delete task",
			currentUser: &models.User{
				ID:   otherUserID,
				Role: models.RoleEmployee,
			},
			taskID:         "1",
			expectedStatus: http.StatusForbidden,
		},
		{
			name: "creator can delete task",
			currentUser: &models.User{
				ID:   userID,
				Role: models.RoleEmployee,
			},
			taskID:         "1",
			expectedStatus: http.StatusNoContent,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := mocks.NewMockTaskRepository()
			dueDate := time.Now().AddDate(0, 0, 7)
			taskRepo.AddTask(&models.Task{
				ID:          taskID,
				Title:       "Test Task",
				DueDate:     dueDate,
				Status:      models.TaskStatusPending,
				CreatedByID: userID,
			})

			h := NewCalendarHandlers(nil, taskRepo, nil)

			req := httptest.NewRequest(http.MethodDelete, "/api/calendar/tasks/"+tt.taskID, nil)
			ctx := req.Context()
			if tt.currentUser != nil {
				ctx = ctxWithUserFrom(ctx, tt.currentUser)
			}
			ctx = chiCtxWithID(ctx, "id", tt.taskID)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			h.DeleteTask(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("DeleteTask() status = %v, want %v", rr.Code, tt.expectedStatus)
			}
		})
	}
}

func TestCalendarHandlers_CreateMeeting_Authorization(t *testing.T) {
	tests := []struct {
		name           string
		currentUser    *models.User
		requestBody    string
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot create meeting",
			currentUser:    nil,
			requestBody:    `{"title":"Test Meeting","start_time":"2024-01-15T10:00:00Z","end_time":"2024-01-15T11:00:00Z"}`,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "authenticated user can create meeting",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleEmployee,
			},
			requestBody:    `{"title":"Test Meeting","start_time":"2024-01-15T10:00:00Z","end_time":"2024-01-15T11:00:00Z"}`,
			expectedStatus: http.StatusCreated,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			meetingRepo := mocks.NewMockMeetingRepository()
			h := NewCalendarHandlers(nil, nil, meetingRepo)

			req := httptest.NewRequest(http.MethodPost, "/api/calendar/meetings", bytes.NewBufferString(tt.requestBody))
			req.Header.Set("Content-Type", "application/json")

			if tt.currentUser != nil {
				req = req.WithContext(ctxWithUserFrom(req.Context(), tt.currentUser))
			}

			rr := httptest.NewRecorder()
			h.CreateMeeting(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("CreateMeeting() status = %v, want %v, body = %s", rr.Code, tt.expectedStatus, rr.Body.String())
			}
		})
	}
}

func TestCalendarHandlers_GetMeeting_Success(t *testing.T) {
	userID := int64(1)
	meetingID := int64(1)

	meetingRepo := mocks.NewMockMeetingRepository()
	startTime := time.Now().AddDate(0, 0, 7)
	endTime := startTime.Add(time.Hour)
	meetingRepo.AddMeeting(&models.Meeting{
		ID:          meetingID,
		Title:       "Test Meeting",
		StartTime:   startTime,
		EndTime:     endTime,
		CreatedByID: userID,
	})

	h := NewCalendarHandlers(nil, nil, meetingRepo)

	user := &models.User{
		ID:   userID,
		Role: models.RoleEmployee,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/calendar/meetings/1", nil)
	ctx := ctxWithUserFrom(req.Context(), user)
	ctx = chiCtxWithID(ctx, "id", "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.GetMeeting(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("GetMeeting() status = %v, want %v, body = %s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestCalendarHandlers_GetMeeting_AttendeeCanView(t *testing.T) {
	creatorID := int64(1)
	attendeeID := int64(2)
	meetingID := int64(1)

	meetingRepo := mocks.NewMockMeetingRepository()
	startTime := time.Now().AddDate(0, 0, 7)
	endTime := startTime.Add(time.Hour)
	meetingRepo.AddMeeting(&models.Meeting{
		ID:          meetingID,
		Title:       "Test Meeting",
		StartTime:   startTime,
		EndTime:     endTime,
		CreatedByID: creatorID,
	})
	meetingRepo.AddAttendee(meetingID, attendeeID, models.ResponseStatusPending)

	h := NewCalendarHandlers(nil, nil, meetingRepo)

	attendee := &models.User{
		ID:   attendeeID,
		Role: models.RoleEmployee,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/calendar/meetings/1", nil)
	ctx := ctxWithUserFrom(req.Context(), attendee)
	ctx = chiCtxWithID(ctx, "id", "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.GetMeeting(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("GetMeeting() status = %v, want %v", rr.Code, http.StatusOK)
	}
}

func TestCalendarHandlers_GetMeeting_Forbidden(t *testing.T) {
	creatorID := int64(1)
	otherUserID := int64(2)
	meetingID := int64(1)

	meetingRepo := mocks.NewMockMeetingRepository()
	startTime := time.Now().AddDate(0, 0, 7)
	endTime := startTime.Add(time.Hour)
	meetingRepo.AddMeeting(&models.Meeting{
		ID:          meetingID,
		Title:       "Test Meeting",
		StartTime:   startTime,
		EndTime:     endTime,
		CreatedByID: creatorID,
	})
	// No attendees added

	h := NewCalendarHandlers(nil, nil, meetingRepo)

	otherUser := &models.User{
		ID:   otherUserID,
		Role: models.RoleEmployee,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/calendar/meetings/1", nil)
	ctx := ctxWithUserFrom(req.Context(), otherUser)
	ctx = chiCtxWithID(ctx, "id", "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.GetMeeting(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("GetMeeting() status = %v, want %v", rr.Code, http.StatusForbidden)
	}
}

func TestCalendarHandlers_UpdateMeeting_Authorization(t *testing.T) {
	creatorID := int64(1)
	otherUserID := int64(2)
	meetingID := int64(1)

	tests := []struct {
		name           string
		currentUser    *models.User
		meetingID      string
		requestBody    string
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot update meeting",
			currentUser:    nil,
			meetingID:      "1",
			requestBody:    `{"title":"Updated Meeting"}`,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "non-creator cannot update meeting",
			currentUser: &models.User{
				ID:   otherUserID,
				Role: models.RoleEmployee,
			},
			meetingID:      "1",
			requestBody:    `{"title":"Updated Meeting"}`,
			expectedStatus: http.StatusForbidden,
		},
		{
			name: "creator can update meeting",
			currentUser: &models.User{
				ID:   creatorID,
				Role: models.RoleEmployee,
			},
			meetingID:      "1",
			requestBody:    `{"title":"Updated Meeting"}`,
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			meetingRepo := mocks.NewMockMeetingRepository()
			startTime := time.Now().AddDate(0, 0, 7)
			endTime := startTime.Add(time.Hour)
			meetingRepo.AddMeeting(&models.Meeting{
				ID:          meetingID,
				Title:       "Test Meeting",
				StartTime:   startTime,
				EndTime:     endTime,
				CreatedByID: creatorID,
			})

			h := NewCalendarHandlers(nil, nil, meetingRepo)

			req := httptest.NewRequest(http.MethodPut, "/api/calendar/meetings/"+tt.meetingID, bytes.NewBufferString(tt.requestBody))
			req.Header.Set("Content-Type", "application/json")
			ctx := req.Context()
			if tt.currentUser != nil {
				ctx = ctxWithUserFrom(ctx, tt.currentUser)
			}
			ctx = chiCtxWithID(ctx, "id", tt.meetingID)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			h.UpdateMeeting(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("UpdateMeeting() status = %v, want %v, body = %s", rr.Code, tt.expectedStatus, rr.Body.String())
			}
		})
	}
}

func TestCalendarHandlers_DeleteMeeting_Authorization(t *testing.T) {
	creatorID := int64(1)
	otherUserID := int64(2)
	meetingID := int64(1)

	tests := []struct {
		name           string
		currentUser    *models.User
		meetingID      string
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot delete meeting",
			currentUser:    nil,
			meetingID:      "1",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "non-creator cannot delete meeting",
			currentUser: &models.User{
				ID:   otherUserID,
				Role: models.RoleEmployee,
			},
			meetingID:      "1",
			expectedStatus: http.StatusForbidden,
		},
		{
			name: "creator can delete meeting",
			currentUser: &models.User{
				ID:   creatorID,
				Role: models.RoleEmployee,
			},
			meetingID:      "1",
			expectedStatus: http.StatusNoContent,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			meetingRepo := mocks.NewMockMeetingRepository()
			startTime := time.Now().AddDate(0, 0, 7)
			endTime := startTime.Add(time.Hour)
			meetingRepo.AddMeeting(&models.Meeting{
				ID:          meetingID,
				Title:       "Test Meeting",
				StartTime:   startTime,
				EndTime:     endTime,
				CreatedByID: creatorID,
			})

			h := NewCalendarHandlers(nil, nil, meetingRepo)

			req := httptest.NewRequest(http.MethodDelete, "/api/calendar/meetings/"+tt.meetingID, nil)
			ctx := req.Context()
			if tt.currentUser != nil {
				ctx = ctxWithUserFrom(ctx, tt.currentUser)
			}
			ctx = chiCtxWithID(ctx, "id", tt.meetingID)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			h.DeleteMeeting(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("DeleteMeeting() status = %v, want %v", rr.Code, tt.expectedStatus)
			}
		})
	}
}

func TestCalendarHandlers_RespondToMeeting_Success(t *testing.T) {
	creatorID := int64(1)
	attendeeID := int64(2)
	meetingID := int64(1)

	meetingRepo := mocks.NewMockMeetingRepository()
	startTime := time.Now().AddDate(0, 0, 7)
	endTime := startTime.Add(time.Hour)
	meetingRepo.AddMeeting(&models.Meeting{
		ID:          meetingID,
		Title:       "Test Meeting",
		StartTime:   startTime,
		EndTime:     endTime,
		CreatedByID: creatorID,
	})
	meetingRepo.AddAttendee(meetingID, attendeeID, models.ResponseStatusPending)

	h := NewCalendarHandlers(nil, nil, meetingRepo)

	attendee := &models.User{
		ID:   attendeeID,
		Role: models.RoleEmployee,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/calendar/meetings/1/respond", bytes.NewBufferString(`{"response":"accepted"}`))
	req.Header.Set("Content-Type", "application/json")
	ctx := ctxWithUserFrom(req.Context(), attendee)
	ctx = chiCtxWithID(ctx, "id", "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.RespondToMeeting(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("RespondToMeeting() status = %v, want %v, body = %s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestCalendarHandlers_RespondToMeeting_NotAttendee(t *testing.T) {
	creatorID := int64(1)
	nonAttendeeID := int64(3)
	meetingID := int64(1)

	meetingRepo := mocks.NewMockMeetingRepository()
	startTime := time.Now().AddDate(0, 0, 7)
	endTime := startTime.Add(time.Hour)
	meetingRepo.AddMeeting(&models.Meeting{
		ID:          meetingID,
		Title:       "Test Meeting",
		StartTime:   startTime,
		EndTime:     endTime,
		CreatedByID: creatorID,
	})
	// No attendees added

	h := NewCalendarHandlers(nil, nil, meetingRepo)

	nonAttendee := &models.User{
		ID:   nonAttendeeID,
		Role: models.RoleEmployee,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/calendar/meetings/1/respond", bytes.NewBufferString(`{"response":"accepted"}`))
	req.Header.Set("Content-Type", "application/json")
	ctx := ctxWithUserFrom(req.Context(), nonAttendee)
	ctx = chiCtxWithID(ctx, "id", "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.RespondToMeeting(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("RespondToMeeting() status = %v, want %v", rr.Code, http.StatusForbidden)
	}
}

func TestCalendarHandlers_canViewTask_SquadAssignment(t *testing.T) {
	squadID := int64(1)
	userID := int64(1)

	user := &models.User{
		ID:   userID,
		Role: models.RoleEmployee,
		Squads: []models.Squad{
			{ID: squadID, Name: "Test Squad"},
		},
	}

	task := &models.Task{
		ID:              1,
		Title:           "Squad Task",
		CreatedByID:     2, // Different creator
		AssignmentType:  models.AssignmentTypeSquad,
		AssignedSquadID: &squadID,
	}

	h := NewCalendarHandlers(nil, nil, nil)

	if !h.canViewTask(user, task) {
		t.Error("canViewTask() should return true for user in assigned squad")
	}
}

func TestCalendarHandlers_canViewTask_DepartmentAssignment(t *testing.T) {
	department := "Engineering"
	userID := int64(1)

	user := &models.User{
		ID:         userID,
		Role:       models.RoleEmployee,
		Department: department,
	}

	task := &models.Task{
		ID:                 1,
		Title:              "Department Task",
		CreatedByID:        2, // Different creator
		AssignmentType:     models.AssignmentTypeDepartment,
		AssignedDepartment: &department,
	}

	h := NewCalendarHandlers(nil, nil, nil)

	if !h.canViewTask(user, task) {
		t.Error("canViewTask() should return true for user in assigned department")
	}
}

func TestCalendarHandlers_canViewTask_AdminCanSeeAll(t *testing.T) {
	adminID := int64(1)

	admin := &models.User{
		ID:   adminID,
		Role: models.RoleAdmin,
	}

	task := &models.Task{
		ID:          1,
		Title:       "Any Task",
		CreatedByID: 2, // Different creator
	}

	h := NewCalendarHandlers(nil, nil, nil)

	if !h.canViewTask(admin, task) {
		t.Error("canViewTask() should return true for admin")
	}
}
