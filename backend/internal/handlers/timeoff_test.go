package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository/mocks"
)

// Test helper to create chi route context
func chiCtxWithID(ctx context.Context, paramName, paramValue string) context.Context {
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add(paramName, paramValue)
	return context.WithValue(ctx, chi.RouteCtxKey, rctx)
}

func TestTimeOffHandlers_Create_Authorization(t *testing.T) {
	tests := []struct {
		name           string
		currentUser    *models.User
		requestBody    string
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot create time off",
			currentUser:    nil,
			requestBody:    `{"start_date":"2024-01-15","end_date":"2024-01-16","request_type":"vacation"}`,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "authenticated user can create own time off request",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleEmployee,
			},
			requestBody:    `{"start_date":"2024-01-15","end_date":"2024-01-16","request_type":"vacation"}`,
			expectedStatus: http.StatusCreated,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			timeOffRepo := mocks.NewMockTimeOffRepository()
			userRepo := mocks.NewMockUserRepository()
			h := NewTimeOffHandlers(timeOffRepo, userRepo)

			req := httptest.NewRequest(http.MethodPost, "/api/time-off", bytes.NewBufferString(tt.requestBody))
			req.Header.Set("Content-Type", "application/json")

			if tt.currentUser != nil {
				req = req.WithContext(ctxWithUserFrom(req.Context(), tt.currentUser))
			}

			rr := httptest.NewRecorder()
			h.Create(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("Create() status = %v, want %v, body = %s", rr.Code, tt.expectedStatus, rr.Body.String())
			}
		})
	}
}

func TestTimeOffHandlers_Create_ForOther_Authorization(t *testing.T) {
	// This test focuses on auth-level checks that don't require mocked repositories
	tests := []struct {
		name           string
		currentUser    *models.User
		forUserID      string
		expectedStatus int
	}{
		{
			name: "employee cannot create time off for others",
			currentUser: &models.User{
				ID:   2,
				Role: models.RoleEmployee,
			},
			forUserID:      "3",
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewTimeOffHandlers(nil, nil)

			// user_id is passed in the JSON body, not as a query param
			body := fmt.Sprintf(`{"start_date":"2024-01-15","end_date":"2024-01-16","request_type":"vacation","user_id":%s}`, tt.forUserID)
			req := httptest.NewRequest(http.MethodPost, "/api/time-off", bytes.NewBufferString(body))
			req.Header.Set("Content-Type", "application/json")

			if tt.currentUser != nil {
				req = req.WithContext(ctxWithUserFrom(req.Context(), tt.currentUser))
			}

			rr := httptest.NewRecorder()
			h.Create(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("Create() status = %v, want %v, body = %s", rr.Code, tt.expectedStatus, rr.Body.String())
			}
		})
	}
}

func TestTimeOffHandlers_Create_SupervisorForDirectReport(t *testing.T) {
	supervisorID := int64(1)
	employeeID := int64(2)

	timeOffRepo := mocks.NewMockTimeOffRepository()
	userRepo := mocks.NewMockUserRepository()

	// Set up the employee as a direct report
	userRepo.AddUser(&models.User{
		ID:           employeeID,
		Email:        "employee@test.com",
		FirstName:    "Test",
		LastName:     "Employee",
		Role:         models.RoleEmployee,
		SupervisorID: &supervisorID,
	})

	h := NewTimeOffHandlers(timeOffRepo, userRepo)

	supervisor := &models.User{
		ID:   supervisorID,
		Role: models.RoleSupervisor,
	}

	body := fmt.Sprintf(`{"start_date":"2024-01-15","end_date":"2024-01-16","request_type":"vacation","user_id":%d}`, employeeID)
	req := httptest.NewRequest(http.MethodPost, "/api/time-off", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(ctxWithUserFrom(req.Context(), supervisor))

	rr := httptest.NewRecorder()
	h.Create(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("Create() status = %v, want %v, body = %s", rr.Code, http.StatusCreated, rr.Body.String())
	}
}

func TestTimeOffHandlers_Create_SupervisorCannotCreateForNonDirectReport(t *testing.T) {
	supervisorID := int64(1)
	otherSupervisorID := int64(3)
	employeeID := int64(2)

	timeOffRepo := mocks.NewMockTimeOffRepository()
	userRepo := mocks.NewMockUserRepository()

	// Set up the employee under a different supervisor
	userRepo.AddUser(&models.User{
		ID:           employeeID,
		Email:        "employee@test.com",
		FirstName:    "Test",
		LastName:     "Employee",
		Role:         models.RoleEmployee,
		SupervisorID: &otherSupervisorID,
	})

	h := NewTimeOffHandlers(timeOffRepo, userRepo)

	supervisor := &models.User{
		ID:   supervisorID,
		Role: models.RoleSupervisor,
	}

	body := fmt.Sprintf(`{"start_date":"2024-01-15","end_date":"2024-01-16","request_type":"vacation","user_id":%d}`, employeeID)
	req := httptest.NewRequest(http.MethodPost, "/api/time-off", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(ctxWithUserFrom(req.Context(), supervisor))

	rr := httptest.NewRecorder()
	h.Create(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("Create() status = %v, want %v, body = %s", rr.Code, http.StatusForbidden, rr.Body.String())
	}
}

func TestTimeOffHandlers_Create_AdminCanCreateForAnyone(t *testing.T) {
	adminID := int64(1)
	employeeID := int64(2)

	timeOffRepo := mocks.NewMockTimeOffRepository()
	userRepo := mocks.NewMockUserRepository()

	// Set up an employee with no supervisor (admin should still be able to create)
	userRepo.AddUser(&models.User{
		ID:           employeeID,
		Email:        "employee@test.com",
		FirstName:    "Test",
		LastName:     "Employee",
		Role:         models.RoleEmployee,
		SupervisorID: nil,
	})

	h := NewTimeOffHandlers(timeOffRepo, userRepo)

	admin := &models.User{
		ID:   adminID,
		Role: models.RoleAdmin,
	}

	body := fmt.Sprintf(`{"start_date":"2024-01-15","end_date":"2024-01-16","request_type":"vacation","user_id":%d}`, employeeID)
	req := httptest.NewRequest(http.MethodPost, "/api/time-off", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(ctxWithUserFrom(req.Context(), admin))

	rr := httptest.NewRecorder()
	h.Create(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("Create() status = %v, want %v, body = %s", rr.Code, http.StatusCreated, rr.Body.String())
	}
}

func TestTimeOffHandlers_Cancel_Authorization(t *testing.T) {
	tests := []struct {
		name           string
		currentUser    *models.User
		requestID      string
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot cancel time off",
			currentUser:    nil,
			requestID:      "1",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "invalid request ID returns bad request",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleEmployee,
			},
			requestID:      "invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewTimeOffHandlers(nil, nil)

			req := httptest.NewRequest(http.MethodPost, "/api/time-off/"+tt.requestID+"/cancel", nil)

			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", tt.requestID)
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

			if tt.currentUser != nil {
				ctx := ctxWithUserFrom(req.Context(), tt.currentUser)
				// Re-add chi context
				ctx = context.WithValue(ctx, chi.RouteCtxKey, rctx)
				req = req.WithContext(ctx)
			}

			rr := httptest.NewRecorder()
			h.Cancel(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("Cancel() status = %v, want %v", rr.Code, tt.expectedStatus)
			}
		})
	}
}

func TestTimeOffHandlers_Cancel_Success(t *testing.T) {
	userID := int64(1)
	requestID := int64(1)

	timeOffRepo := mocks.NewMockTimeOffRepository()
	timeOffRepo.AddRequest(&models.TimeOffRequest{
		ID:        requestID,
		UserID:    userID,
		StartDate: time.Now().AddDate(0, 0, 7),
		EndDate:   time.Now().AddDate(0, 0, 8),
		Status:    models.TimeOffStatusPending,
	})

	h := NewTimeOffHandlers(timeOffRepo, nil)

	user := &models.User{
		ID:   userID,
		Role: models.RoleEmployee,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/time-off/1/cancel", nil)
	ctx := ctxWithUserFrom(req.Context(), user)
	ctx = chiCtxWithID(ctx, "id", "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.Cancel(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Errorf("Cancel() status = %v, want %v, body = %s", rr.Code, http.StatusNoContent, rr.Body.String())
	}

	// Verify the request was cancelled
	cancelled := timeOffRepo.Requests[requestID]
	if cancelled.Status != models.TimeOffStatusCancelled {
		t.Errorf("Request status = %v, want %v", cancelled.Status, models.TimeOffStatusCancelled)
	}
}

func TestTimeOffHandlers_GetByID_Authorization(t *testing.T) {
	tests := []struct {
		name           string
		currentUser    *models.User
		requestID      string
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot get time off",
			currentUser:    nil,
			requestID:      "1",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "invalid request ID returns bad request",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleEmployee,
			},
			requestID:      "invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewTimeOffHandlers(nil, nil)

			req := httptest.NewRequest(http.MethodGet, "/api/time-off/"+tt.requestID, nil)

			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", tt.requestID)
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

			if tt.currentUser != nil {
				ctx := ctxWithUserFrom(req.Context(), tt.currentUser)
				ctx = context.WithValue(ctx, chi.RouteCtxKey, rctx)
				req = req.WithContext(ctx)
			}

			rr := httptest.NewRecorder()
			h.GetByID(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("GetByID() status = %v, want %v", rr.Code, tt.expectedStatus)
			}
		})
	}
}

func TestTimeOffHandlers_GetByID_Success(t *testing.T) {
	userID := int64(1)
	requestID := int64(1)

	timeOffRepo := mocks.NewMockTimeOffRepository()
	timeOffRepo.AddRequest(&models.TimeOffRequest{
		ID:        requestID,
		UserID:    userID,
		StartDate: time.Now().AddDate(0, 0, 7),
		EndDate:   time.Now().AddDate(0, 0, 8),
		Status:    models.TimeOffStatusPending,
		User: &models.User{
			ID:   userID,
			Role: models.RoleEmployee,
		},
	})

	h := NewTimeOffHandlers(timeOffRepo, nil)

	user := &models.User{
		ID:   userID,
		Role: models.RoleEmployee,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/time-off/1", nil)
	ctx := ctxWithUserFrom(req.Context(), user)
	ctx = chiCtxWithID(ctx, "id", "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.GetByID(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("GetByID() status = %v, want %v, body = %s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestTimeOffHandlers_GetByID_NotFound(t *testing.T) {
	timeOffRepo := mocks.NewMockTimeOffRepository()
	h := NewTimeOffHandlers(timeOffRepo, nil)

	user := &models.User{
		ID:   1,
		Role: models.RoleEmployee,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/time-off/999", nil)
	ctx := ctxWithUserFrom(req.Context(), user)
	ctx = chiCtxWithID(ctx, "id", "999")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.GetByID(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("GetByID() status = %v, want %v", rr.Code, http.StatusNotFound)
	}
}

func TestTimeOffHandlers_GetByID_Forbidden(t *testing.T) {
	ownerID := int64(1)
	otherUserID := int64(2)
	requestID := int64(1)

	timeOffRepo := mocks.NewMockTimeOffRepository()
	timeOffRepo.AddRequest(&models.TimeOffRequest{
		ID:        requestID,
		UserID:    ownerID,
		StartDate: time.Now().AddDate(0, 0, 7),
		EndDate:   time.Now().AddDate(0, 0, 8),
		Status:    models.TimeOffStatusPending,
		User: &models.User{
			ID:           ownerID,
			Role:         models.RoleEmployee,
			SupervisorID: nil,
		},
	})

	h := NewTimeOffHandlers(timeOffRepo, nil)

	// Different employee trying to view
	otherUser := &models.User{
		ID:   otherUserID,
		Role: models.RoleEmployee,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/time-off/1", nil)
	ctx := ctxWithUserFrom(req.Context(), otherUser)
	ctx = chiCtxWithID(ctx, "id", "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.GetByID(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("GetByID() status = %v, want %v", rr.Code, http.StatusForbidden)
	}
}

func TestTimeOffHandlers_GetPending_Authorization(t *testing.T) {
	tests := []struct {
		name           string
		currentUser    *models.User
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot get pending requests",
			currentUser:    nil,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "employee cannot get pending requests",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleEmployee,
			},
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewTimeOffHandlers(nil, nil)

			req := httptest.NewRequest(http.MethodGet, "/api/time-off/pending", nil)

			if tt.currentUser != nil {
				req = req.WithContext(ctxWithUserFrom(req.Context(), tt.currentUser))
			}

			rr := httptest.NewRecorder()
			h.GetPending(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("GetPending() status = %v, want %v", rr.Code, tt.expectedStatus)
			}
		})
	}
}

func TestTimeOffHandlers_GetPending_SupervisorSuccess(t *testing.T) {
	supervisorID := int64(1)
	employeeID := int64(2)

	timeOffRepo := mocks.NewMockTimeOffRepository()
	timeOffRepo.AddRequest(&models.TimeOffRequest{
		ID:        1,
		UserID:    employeeID,
		StartDate: time.Now().AddDate(0, 0, 7),
		EndDate:   time.Now().AddDate(0, 0, 8),
		Status:    models.TimeOffStatusPending,
	})

	h := NewTimeOffHandlers(timeOffRepo, nil)

	supervisor := &models.User{
		ID:   supervisorID,
		Role: models.RoleSupervisor,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/time-off/pending", nil)
	req = req.WithContext(ctxWithUserFrom(req.Context(), supervisor))

	rr := httptest.NewRecorder()
	h.GetPending(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("GetPending() status = %v, want %v, body = %s", rr.Code, http.StatusOK, rr.Body.String())
	}

	var response []models.TimeOffRequest
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(response) != 1 {
		t.Errorf("GetPending() returned %d requests, want 1", len(response))
	}
}

func TestTimeOffHandlers_GetPending_AdminSuccess(t *testing.T) {
	adminID := int64(1)

	timeOffRepo := mocks.NewMockTimeOffRepository()
	timeOffRepo.AddRequest(&models.TimeOffRequest{
		ID:        1,
		UserID:    2,
		StartDate: time.Now().AddDate(0, 0, 7),
		EndDate:   time.Now().AddDate(0, 0, 8),
		Status:    models.TimeOffStatusPending,
	})
	timeOffRepo.AddRequest(&models.TimeOffRequest{
		ID:        2,
		UserID:    3,
		StartDate: time.Now().AddDate(0, 0, 14),
		EndDate:   time.Now().AddDate(0, 0, 15),
		Status:    models.TimeOffStatusPending,
	})

	h := NewTimeOffHandlers(timeOffRepo, nil)

	admin := &models.User{
		ID:   adminID,
		Role: models.RoleAdmin,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/time-off/pending", nil)
	req = req.WithContext(ctxWithUserFrom(req.Context(), admin))

	rr := httptest.NewRecorder()
	h.GetPending(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("GetPending() status = %v, want %v, body = %s", rr.Code, http.StatusOK, rr.Body.String())
	}

	var response []models.TimeOffRequest
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(response) != 2 {
		t.Errorf("GetPending() returned %d requests, want 2", len(response))
	}
}

func TestTimeOffHandlers_Review_Authorization(t *testing.T) {
	tests := []struct {
		name           string
		currentUser    *models.User
		requestID      string
		requestBody    string
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot review time off",
			currentUser:    nil,
			requestID:      "1",
			requestBody:    `{"status":"approved"}`,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "employee cannot review time off",
			currentUser: &models.User{
				ID:   2,
				Role: models.RoleEmployee,
			},
			requestID:      "1",
			requestBody:    `{"status":"approved"}`,
			expectedStatus: http.StatusForbidden,
		},
		{
			name: "invalid request ID returns bad request",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleSupervisor,
			},
			requestID:      "invalid",
			requestBody:    `{"status":"approved"}`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewTimeOffHandlers(nil, nil)

			req := httptest.NewRequest(http.MethodPost, "/api/time-off/"+tt.requestID+"/review", bytes.NewBufferString(tt.requestBody))
			req.Header.Set("Content-Type", "application/json")

			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", tt.requestID)
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

			if tt.currentUser != nil {
				ctx := ctxWithUserFrom(req.Context(), tt.currentUser)
				ctx = context.WithValue(ctx, chi.RouteCtxKey, rctx)
				req = req.WithContext(ctx)
			}

			rr := httptest.NewRecorder()
			h.Review(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("Review() status = %v, want %v", rr.Code, tt.expectedStatus)
			}
		})
	}
}

func TestTimeOffHandlers_Review_SupervisorApprove(t *testing.T) {
	supervisorID := int64(1)
	employeeID := int64(2)
	requestID := int64(1)

	timeOffRepo := mocks.NewMockTimeOffRepository()
	userRepo := mocks.NewMockUserRepository()

	// Set up employee as direct report
	userRepo.AddUser(&models.User{
		ID:           employeeID,
		Email:        "employee@test.com",
		FirstName:    "Test",
		LastName:     "Employee",
		Role:         models.RoleEmployee,
		SupervisorID: &supervisorID,
	})

	timeOffRepo.AddRequest(&models.TimeOffRequest{
		ID:        requestID,
		UserID:    employeeID,
		StartDate: time.Now().AddDate(0, 0, 7),
		EndDate:   time.Now().AddDate(0, 0, 8),
		Status:    models.TimeOffStatusPending,
		User: &models.User{
			ID:           employeeID,
			SupervisorID: &supervisorID,
		},
	})

	h := NewTimeOffHandlers(timeOffRepo, userRepo)

	supervisor := &models.User{
		ID:   supervisorID,
		Role: models.RoleSupervisor,
	}

	body := `{"status":"approved"}`
	req := httptest.NewRequest(http.MethodPost, "/api/time-off/1/review", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := ctxWithUserFrom(req.Context(), supervisor)
	ctx = chiCtxWithID(ctx, "id", "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.Review(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Review() status = %v, want %v, body = %s", rr.Code, http.StatusOK, rr.Body.String())
	}

	// Verify the request was approved
	approved := timeOffRepo.Requests[requestID]
	if approved.Status != models.TimeOffStatusApproved {
		t.Errorf("Request status = %v, want %v", approved.Status, models.TimeOffStatusApproved)
	}
}

func TestTimeOffHandlers_Review_SupervisorCannotReviewNonDirectReport(t *testing.T) {
	supervisorID := int64(1)
	otherSupervisorID := int64(3)
	employeeID := int64(2)
	requestID := int64(1)

	timeOffRepo := mocks.NewMockTimeOffRepository()
	userRepo := mocks.NewMockUserRepository()

	// Set up employee under different supervisor
	userRepo.AddUser(&models.User{
		ID:           employeeID,
		Email:        "employee@test.com",
		FirstName:    "Test",
		LastName:     "Employee",
		Role:         models.RoleEmployee,
		SupervisorID: &otherSupervisorID,
	})

	timeOffRepo.AddRequest(&models.TimeOffRequest{
		ID:        requestID,
		UserID:    employeeID,
		StartDate: time.Now().AddDate(0, 0, 7),
		EndDate:   time.Now().AddDate(0, 0, 8),
		Status:    models.TimeOffStatusPending,
		User: &models.User{
			ID:           employeeID,
			SupervisorID: &otherSupervisorID,
		},
	})

	h := NewTimeOffHandlers(timeOffRepo, userRepo)

	supervisor := &models.User{
		ID:   supervisorID,
		Role: models.RoleSupervisor,
	}

	body := `{"status":"approved"}`
	req := httptest.NewRequest(http.MethodPost, "/api/time-off/1/review", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := ctxWithUserFrom(req.Context(), supervisor)
	ctx = chiCtxWithID(ctx, "id", "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.Review(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("Review() status = %v, want %v, body = %s", rr.Code, http.StatusForbidden, rr.Body.String())
	}
}

func TestTimeOffHandlers_GetTeamTimeOff_Authorization(t *testing.T) {
	tests := []struct {
		name           string
		currentUser    *models.User
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot get team time off",
			currentUser:    nil,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "employee cannot get team time off",
			currentUser: &models.User{
				ID:   1,
				Role: models.RoleEmployee,
			},
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewTimeOffHandlers(nil, nil)

			req := httptest.NewRequest(http.MethodGet, "/api/time-off/team", nil)

			if tt.currentUser != nil {
				req = req.WithContext(ctxWithUserFrom(req.Context(), tt.currentUser))
			}

			rr := httptest.NewRecorder()
			h.GetTeamTimeOff(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("GetTeamTimeOff() status = %v, want %v", rr.Code, tt.expectedStatus)
			}
		})
	}
}

func TestTimeOffHandlers_GetTeamTimeOff_SupervisorSuccess(t *testing.T) {
	supervisorID := int64(1)

	timeOffRepo := mocks.NewMockTimeOffRepository()
	timeOffRepo.AddRequest(&models.TimeOffRequest{
		ID:        1,
		UserID:    2,
		StartDate: time.Now().AddDate(0, 0, 7),
		EndDate:   time.Now().AddDate(0, 0, 8),
		Status:    models.TimeOffStatusApproved,
	})

	h := NewTimeOffHandlers(timeOffRepo, nil)

	supervisor := &models.User{
		ID:   supervisorID,
		Role: models.RoleSupervisor,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/time-off/team", nil)
	req = req.WithContext(ctxWithUserFrom(req.Context(), supervisor))

	rr := httptest.NewRecorder()
	h.GetTeamTimeOff(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("GetTeamTimeOff() status = %v, want %v, body = %s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestTimeOffHandlers_GetMyRequests_Success(t *testing.T) {
	userID := int64(1)

	timeOffRepo := mocks.NewMockTimeOffRepository()
	timeOffRepo.AddRequest(&models.TimeOffRequest{
		ID:        1,
		UserID:    userID,
		StartDate: time.Now().AddDate(0, 0, 7),
		EndDate:   time.Now().AddDate(0, 0, 8),
		Status:    models.TimeOffStatusPending,
	})
	timeOffRepo.AddRequest(&models.TimeOffRequest{
		ID:        2,
		UserID:    userID,
		StartDate: time.Now().AddDate(0, 0, 14),
		EndDate:   time.Now().AddDate(0, 0, 15),
		Status:    models.TimeOffStatusApproved,
	})

	h := NewTimeOffHandlers(timeOffRepo, nil)

	user := &models.User{
		ID:   userID,
		Role: models.RoleEmployee,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/time-off", nil)
	req = req.WithContext(ctxWithUserFrom(req.Context(), user))

	rr := httptest.NewRecorder()
	h.GetMyRequests(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("GetMyRequests() status = %v, want %v, body = %s", rr.Code, http.StatusOK, rr.Body.String())
	}

	var response []models.TimeOffRequest
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(response) != 2 {
		t.Errorf("GetMyRequests() returned %d requests, want 2", len(response))
	}
}

func TestTimeOffHandlers_GetMyRequests_WithStatusFilter(t *testing.T) {
	userID := int64(1)

	timeOffRepo := mocks.NewMockTimeOffRepository()
	timeOffRepo.GetVisibleRequestsFunc = func(ctx context.Context, user *models.User, status *models.TimeOffStatus) ([]models.TimeOffRequest, error) {
		var requests []models.TimeOffRequest
		for _, req := range timeOffRepo.Requests {
			if status == nil || req.Status == *status {
				requests = append(requests, *req)
			}
		}
		return requests, nil
	}

	timeOffRepo.AddRequest(&models.TimeOffRequest{
		ID:        1,
		UserID:    userID,
		StartDate: time.Now().AddDate(0, 0, 7),
		EndDate:   time.Now().AddDate(0, 0, 8),
		Status:    models.TimeOffStatusPending,
	})
	timeOffRepo.AddRequest(&models.TimeOffRequest{
		ID:        2,
		UserID:    userID,
		StartDate: time.Now().AddDate(0, 0, 14),
		EndDate:   time.Now().AddDate(0, 0, 15),
		Status:    models.TimeOffStatusApproved,
	})

	h := NewTimeOffHandlers(timeOffRepo, nil)

	user := &models.User{
		ID:   userID,
		Role: models.RoleEmployee,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/time-off?status=pending", nil)
	req = req.WithContext(ctxWithUserFrom(req.Context(), user))

	rr := httptest.NewRecorder()
	h.GetMyRequests(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("GetMyRequests() status = %v, want %v, body = %s", rr.Code, http.StatusOK, rr.Body.String())
	}

	var response []models.TimeOffRequest
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(response) != 1 {
		t.Errorf("GetMyRequests() returned %d requests, want 1", len(response))
	}
}

func TestTimeOffHandlers_Create_Validation(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing start_date",
			requestBody:    `{"end_date":"2024-01-16","request_type":"vacation"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "missing end_date",
			requestBody:    `{"start_date":"2024-01-15","request_type":"vacation"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "missing request_type",
			requestBody:    `{"start_date":"2024-01-15","end_date":"2024-01-16"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "invalid request_type",
			requestBody:    `{"start_date":"2024-01-15","end_date":"2024-01-16","request_type":"invalid"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "end_date before start_date",
			requestBody:    `{"start_date":"2024-01-16","end_date":"2024-01-15","request_type":"vacation"}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "invalid date format",
			requestBody:    `{"start_date":"01-15-2024","end_date":"2024-01-16","request_type":"vacation"}`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			timeOffRepo := mocks.NewMockTimeOffRepository()
			h := NewTimeOffHandlers(timeOffRepo, nil)

			user := &models.User{
				ID:   1,
				Role: models.RoleEmployee,
			}

			req := httptest.NewRequest(http.MethodPost, "/api/time-off", bytes.NewBufferString(tt.requestBody))
			req.Header.Set("Content-Type", "application/json")
			req = req.WithContext(ctxWithUserFrom(req.Context(), user))

			rr := httptest.NewRecorder()
			h.Create(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("Create() status = %v, want %v, body = %s", rr.Code, tt.expectedStatus, rr.Body.String())
			}
		})
	}
}
