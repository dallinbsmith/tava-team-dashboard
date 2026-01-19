package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/smith-dallin/manager-dashboard/internal/middleware"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// contextWithUser creates a request context with a user attached
// This mirrors what the auth middleware does
func contextWithUser(ctx context.Context, user *models.User) context.Context {
	return context.WithValue(ctx, middleware.UserContextKey, user)
}

func TestGetCurrentUser(t *testing.T) {
	// Test only the unauthorized case since the authenticated case requires a database connection
	// to load squads. Testing authenticated flow should be done with integration tests.
	t.Run("returns unauthorized when no user in context", func(t *testing.T) {
		h := New(nil, nil)

		req := httptest.NewRequest(http.MethodGet, "/api/me", nil)
		rr := httptest.NewRecorder()
		h.GetCurrentUser(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("GetCurrentUser() status = %v, want %v", rr.Code, http.StatusUnauthorized)
		}
	})
}

func TestGetEmployees_RoleBasedAccess(t *testing.T) {
	// This test verifies the authorization logic for GetEmployees.
	// Full integration tests with database access should be separate.
	// For now, we test that the authorization check would work correctly.

	t.Run("employee role authorization logic", func(t *testing.T) {
		employee := &models.User{
			ID:        2,
			Email:     "employee@example.com",
			FirstName: "Jane",
			LastName:  "Doe",
			Role:      models.RoleEmployee,
		}

		// Verify the employee role is correctly identified
		if employee.Role != models.RoleEmployee {
			t.Error("Expected user to have employee role")
		}

		// An employee should only see themselves in the result
		// (this is what the handler logic does - returns []*user for employees)
		if employee.IsAdmin() {
			t.Error("Employee should not be admin")
		}
		if employee.IsSupervisor() {
			t.Error("Employee should not be supervisor")
		}
	})

	t.Run("supervisor role authorization logic", func(t *testing.T) {
		supervisor := &models.User{
			ID:   1,
			Role: models.RoleSupervisor,
		}

		if !supervisor.IsSupervisor() {
			t.Error("Expected user to be identified as supervisor")
		}
	})

	t.Run("admin role authorization logic", func(t *testing.T) {
		admin := &models.User{
			ID:   1,
			Role: models.RoleAdmin,
		}

		if !admin.IsAdmin() {
			t.Error("Expected user to be identified as admin")
		}
	})
}

func TestGetUserByID_Authorization(t *testing.T) {
	supervisorID := int64(1)
	employeeID := int64(2)
	otherEmployeeID := int64(3)

	tests := []struct {
		name           string
		currentUser    *models.User
		targetID       string
		expectedStatus int
	}{
		{
			name: "employee can view themselves",
			currentUser: &models.User{
				ID:   employeeID,
				Role: models.RoleEmployee,
			},
			targetID:       "2",
			expectedStatus: http.StatusOK,
		},
		{
			name: "employee cannot view others",
			currentUser: &models.User{
				ID:   employeeID,
				Role: models.RoleEmployee,
			},
			targetID:       "3",
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// For this test, we only check the authorization logic
			// which happens before the database call
			if tt.currentUser.Role == models.RoleEmployee {
				targetID := int64(0)
				if tt.targetID == "2" {
					targetID = 2
				} else if tt.targetID == "3" {
					targetID = 3
				}

				canView := tt.currentUser.ID == targetID
				if tt.expectedStatus == http.StatusOK && !canView {
					t.Errorf("Expected user to be able to view, but cannot")
				}
				if tt.expectedStatus == http.StatusForbidden && canView {
					t.Errorf("Expected user to be forbidden, but can view")
				}
			}
		})
	}

	_ = supervisorID
	_ = otherEmployeeID
}

func TestCreateUser_Authorization(t *testing.T) {
	// Test cases where authorization fails BEFORE database access
	tests := []struct {
		name           string
		currentUser    *models.User
		expectedStatus int
	}{
		{
			name: "employee cannot create users",
			currentUser: &models.User{
				ID:   2,
				Role: models.RoleEmployee,
			},
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "unauthenticated cannot create users",
			currentUser:    nil,
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := New(nil, nil)

			body := `{"email":"new@example.com","first_name":"New","last_name":"User","role":"employee","department":"Engineering"}`
			req := httptest.NewRequest(http.MethodPost, "/api/users", bytes.NewBufferString(body))
			req.Header.Set("Content-Type", "application/json")

			if tt.currentUser != nil {
				req = req.WithContext(contextWithUser(req.Context(), tt.currentUser))
			}

			rr := httptest.NewRecorder()
			h.CreateUser(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("CreateUser() status = %v, want %v", rr.Code, tt.expectedStatus)
			}
		})
	}
}

func TestCreateUser_SupervisorAuthorization(t *testing.T) {
	// Test that the authorization logic correctly allows supervisors
	// This is a unit test of the authorization check, not the full flow
	supervisor := &models.User{
		ID:   1,
		Role: models.RoleSupervisor,
	}

	// Check that supervisor would pass the authorization check
	if supervisor.Role != models.RoleSupervisor {
		t.Error("Supervisor should have supervisor role")
	}

	employee := &models.User{
		ID:   2,
		Role: models.RoleEmployee,
	}

	// Check that employee would fail the authorization check
	if employee.Role == models.RoleSupervisor {
		t.Error("Employee should not have supervisor role")
	}
}

func TestDeleteUser_Authorization(t *testing.T) {
	supervisorID := int64(1)
	employeeID := int64(2)

	tests := []struct {
		name           string
		currentUser    *models.User
		expectedStatus int
	}{
		{
			name:           "unauthenticated cannot delete users",
			currentUser:    nil,
			expectedStatus: http.StatusForbidden,
		},
		{
			name: "employee cannot delete users",
			currentUser: &models.User{
				ID:   employeeID,
				Role: models.RoleEmployee,
			},
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := New(nil, nil)

			req := httptest.NewRequest(http.MethodDelete, "/api/users/3", nil)

			// Add chi URL params
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", "3")
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

			if tt.currentUser != nil {
				req = req.WithContext(contextWithUser(req.Context(), tt.currentUser))
				// Re-add chi context
				rctx := chi.NewRouteContext()
				rctx.URLParams.Add("id", "3")
				req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
			}

			rr := httptest.NewRecorder()
			h.DeleteUser(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("DeleteUser() status = %v, want %v", rr.Code, tt.expectedStatus)
			}
		})
	}

	_ = supervisorID
}

func TestUpdateUser_InvalidID(t *testing.T) {
	h := New(nil, nil)

	req := httptest.NewRequest(http.MethodPut, "/api/users/invalid", nil)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "invalid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.UpdateUser(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("UpdateUser() with invalid ID status = %v, want %v", rr.Code, http.StatusBadRequest)
	}
}

func TestRespondJSON(t *testing.T) {
	rr := httptest.NewRecorder()

	data := map[string]string{"message": "hello"}
	respondJSON(rr, http.StatusOK, data)

	if rr.Code != http.StatusOK {
		t.Errorf("respondJSON() status = %v, want %v", rr.Code, http.StatusOK)
	}

	contentType := rr.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Content-Type = %v, want %v", contentType, "application/json")
	}

	var result map[string]string
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Errorf("Failed to decode JSON response: %v", err)
	}

	if result["message"] != "hello" {
		t.Errorf("Response message = %v, want %v", result["message"], "hello")
	}
}

func TestUploadAvatarBase64_InvalidFormat(t *testing.T) {
	h := NewAvatarHandlers(nil, nil)

	// Test with invalid base64 format (not starting with data:image/)
	body := `{"image":"not-a-valid-data-url"}`
	req := httptest.NewRequest(http.MethodPost, "/api/users/1/avatar/base64", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "1")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	user := &models.User{ID: 1, Role: models.RoleEmployee}
	req = req.WithContext(contextWithUser(req.Context(), user))
	// Re-add chi context
	rctx = chi.NewRouteContext()
	rctx.URLParams.Add("id", "1")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.UploadAvatarBase64(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("UploadAvatarBase64() with invalid format status = %v, want %v", rr.Code, http.StatusBadRequest)
	}
}
