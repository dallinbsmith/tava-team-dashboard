package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/smith-dallin/manager-dashboard/internal/middleware"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// Test helper to create context with user
func ctxWithUser(user *models.User) context.Context {
	return context.WithValue(context.Background(), middleware.UserContextKey, user)
}

// ============================================
// Pagination Helper Tests
// ============================================

func TestParsePagination(t *testing.T) {
	tests := []struct {
		name            string
		queryString     string
		expectedPage    int
		expectedPerPage int
		expectedOffset  int
	}{
		{
			name:            "default values when no params",
			queryString:     "",
			expectedPage:    1,
			expectedPerPage: DefaultPerPage,
			expectedOffset:  0,
		},
		{
			name:            "page param only",
			queryString:     "page=3",
			expectedPage:    3,
			expectedPerPage: DefaultPerPage,
			expectedOffset:  (3 - 1) * DefaultPerPage,
		},
		{
			name:            "per_page param only",
			queryString:     "per_page=25",
			expectedPage:    1,
			expectedPerPage: 25,
			expectedOffset:  0,
		},
		{
			name:            "both params",
			queryString:     "page=2&per_page=10",
			expectedPage:    2,
			expectedPerPage: 10,
			expectedOffset:  10,
		},
		{
			name:            "per_page capped at MaxPerPage",
			queryString:     "per_page=500",
			expectedPage:    1,
			expectedPerPage: MaxPerPage,
			expectedOffset:  0,
		},
		{
			name:            "invalid page defaults to 1",
			queryString:     "page=invalid",
			expectedPage:    1,
			expectedPerPage: DefaultPerPage,
			expectedOffset:  0,
		},
		{
			name:            "invalid per_page uses default",
			queryString:     "per_page=invalid",
			expectedPage:    1,
			expectedPerPage: DefaultPerPage,
			expectedOffset:  0,
		},
		{
			name:            "negative page defaults to 1",
			queryString:     "page=-5",
			expectedPage:    1,
			expectedPerPage: DefaultPerPage,
			expectedOffset:  0,
		},
		{
			name:            "zero page defaults to 1",
			queryString:     "page=0",
			expectedPage:    1,
			expectedPerPage: DefaultPerPage,
			expectedOffset:  0,
		},
		{
			name:            "zero per_page uses default",
			queryString:     "per_page=0",
			expectedPage:    1,
			expectedPerPage: DefaultPerPage,
			expectedOffset:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test?"+tt.queryString, nil)
			p := parsePagination(req)

			if p.Page != tt.expectedPage {
				t.Errorf("parsePagination() Page = %d, want %d", p.Page, tt.expectedPage)
			}
			if p.PerPage != tt.expectedPerPage {
				t.Errorf("parsePagination() PerPage = %d, want %d", p.PerPage, tt.expectedPerPage)
			}
			if p.Offset != tt.expectedOffset {
				t.Errorf("parsePagination() Offset = %d, want %d", p.Offset, tt.expectedOffset)
			}
		})
	}
}

func TestShouldPaginate(t *testing.T) {
	tests := []struct {
		name        string
		queryString string
		expected    bool
	}{
		{"no params", "", false},
		{"page only", "page=1", true},
		{"per_page only", "per_page=10", true},
		{"both params", "page=1&per_page=10", true},
		{"other params only", "filter=active&sort=name", false},
		{"mixed params", "filter=active&page=1", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test?"+tt.queryString, nil)
			result := shouldPaginate(req)
			if result != tt.expected {
				t.Errorf("shouldPaginate() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestPaginateSlice(t *testing.T) {
	items := []string{"a", "b", "c", "d", "e", "f", "g", "h", "i", "j"}

	tests := []struct {
		name          string
		pagination    Pagination
		expectedItems []string
		expectedTotal int
	}{
		{
			name:          "first page",
			pagination:    Pagination{Page: 1, PerPage: 3, Offset: 0},
			expectedItems: []string{"a", "b", "c"},
			expectedTotal: 10,
		},
		{
			name:          "second page",
			pagination:    Pagination{Page: 2, PerPage: 3, Offset: 3},
			expectedItems: []string{"d", "e", "f"},
			expectedTotal: 10,
		},
		{
			name:          "last partial page",
			pagination:    Pagination{Page: 4, PerPage: 3, Offset: 9},
			expectedItems: []string{"j"},
			expectedTotal: 10,
		},
		{
			name:          "page beyond data",
			pagination:    Pagination{Page: 5, PerPage: 3, Offset: 12},
			expectedItems: []string{},
			expectedTotal: 10,
		},
		{
			name:          "large per_page",
			pagination:    Pagination{Page: 1, PerPage: 100, Offset: 0},
			expectedItems: items,
			expectedTotal: 10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, total := paginateSlice(items, tt.pagination)

			if total != tt.expectedTotal {
				t.Errorf("paginateSlice() total = %d, want %d", total, tt.expectedTotal)
			}

			if len(result) != len(tt.expectedItems) {
				t.Errorf("paginateSlice() len = %d, want %d", len(result), len(tt.expectedItems))
				return
			}

			for i, item := range result {
				if item != tt.expectedItems[i] {
					t.Errorf("paginateSlice()[%d] = %s, want %s", i, item, tt.expectedItems[i])
				}
			}
		})
	}
}

func TestPaginateSlice_EmptySlice(t *testing.T) {
	var items []string
	p := Pagination{Page: 1, PerPage: 10, Offset: 0}

	result, total := paginateSlice(items, p)

	if total != 0 {
		t.Errorf("paginateSlice() total = %d, want 0", total)
	}
	if len(result) != 0 {
		t.Errorf("paginateSlice() len = %d, want 0", len(result))
	}
}

func TestPaginateSlice_WithStructs(t *testing.T) {
	type User struct {
		ID   int
		Name string
	}
	users := []User{
		{ID: 1, Name: "Alice"},
		{ID: 2, Name: "Bob"},
		{ID: 3, Name: "Charlie"},
	}

	p := Pagination{Page: 1, PerPage: 2, Offset: 0}
	result, total := paginateSlice(users, p)

	if total != 3 {
		t.Errorf("paginateSlice() total = %d, want 3", total)
	}
	if len(result) != 2 {
		t.Errorf("paginateSlice() len = %d, want 2", len(result))
	}
	if result[0].Name != "Alice" || result[1].Name != "Bob" {
		t.Error("paginateSlice() returned wrong users")
	}
}

func TestRespondPaginated(t *testing.T) {
	items := []string{"a", "b", "c"}
	p := Pagination{Page: 1, PerPage: 10, Offset: 0}
	total := 3

	rr := httptest.NewRecorder()
	respondPaginated(rr, items, total, p)

	if rr.Code != http.StatusOK {
		t.Errorf("respondPaginated() status = %d, want %d", rr.Code, http.StatusOK)
	}

	if ct := rr.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("respondPaginated() Content-Type = %s, want application/json", ct)
	}

	var response PaginatedResponse
	if err := json.NewDecoder(rr.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response.Pagination.Page != 1 {
		t.Errorf("Pagination.Page = %d, want 1", response.Pagination.Page)
	}
	if response.Pagination.PerPage != 10 {
		t.Errorf("Pagination.PerPage = %d, want 10", response.Pagination.PerPage)
	}
	if response.Pagination.Total != 3 {
		t.Errorf("Pagination.Total = %d, want 3", response.Pagination.Total)
	}
	if response.Pagination.TotalPages != 1 {
		t.Errorf("Pagination.TotalPages = %d, want 1", response.Pagination.TotalPages)
	}
	if response.Pagination.HasMore {
		t.Error("Pagination.HasMore should be false")
	}
}

func TestRespondPaginated_HasMore(t *testing.T) {
	items := []string{"a", "b"}
	p := Pagination{Page: 1, PerPage: 2, Offset: 0}
	total := 5

	rr := httptest.NewRecorder()
	respondPaginated(rr, items, total, p)

	var response PaginatedResponse
	json.NewDecoder(rr.Body).Decode(&response)

	if !response.Pagination.HasMore {
		t.Error("Pagination.HasMore should be true")
	}
	if response.Pagination.TotalPages != 3 {
		t.Errorf("Pagination.TotalPages = %d, want 3", response.Pagination.TotalPages)
	}
}

// ============================================
// Permission Helper Tests
// ============================================

func TestRequireAuth(t *testing.T) {
	t.Run("returns nil and 401 when no user", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		user := requireAuth(rr, req)

		if user != nil {
			t.Error("expected nil user")
		}
		if rr.Code != http.StatusUnauthorized {
			t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
		}
	})

	t.Run("returns user when authenticated", func(t *testing.T) {
		testUser := &models.User{ID: 1, Email: "test@example.com", Role: models.RoleEmployee}
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req = req.WithContext(ctxWithUser(testUser))
		rr := httptest.NewRecorder()

		user := requireAuth(rr, req)

		if user == nil {
			t.Fatal("expected user, got nil")
		}
		if user.ID != 1 {
			t.Errorf("expected user ID 1, got %d", user.ID)
		}
	})
}

func TestRequireSupervisor(t *testing.T) {
	tests := []struct {
		name           string
		user           *models.User
		expectedUser   bool
		expectedStatus int
	}{
		{
			name:           "no user",
			user:           nil,
			expectedUser:   false,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "employee denied",
			user:           &models.User{ID: 1, Role: models.RoleEmployee},
			expectedUser:   false,
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "supervisor allowed",
			user:           &models.User{ID: 1, Role: models.RoleSupervisor},
			expectedUser:   true,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "admin allowed",
			user:           &models.User{ID: 1, Role: models.RoleAdmin},
			expectedUser:   true,
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			if tt.user != nil {
				req = req.WithContext(ctxWithUser(tt.user))
			}
			rr := httptest.NewRecorder()

			user := requireSupervisor(rr, req)

			if tt.expectedUser && user == nil {
				t.Error("expected user, got nil")
			}
			if !tt.expectedUser && user != nil {
				t.Error("expected nil user")
			}
			if !tt.expectedUser && rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}
		})
	}
}

func TestRequireAdmin(t *testing.T) {
	tests := []struct {
		name           string
		user           *models.User
		expectedUser   bool
		expectedStatus int
	}{
		{
			name:           "no user",
			user:           nil,
			expectedUser:   false,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "employee denied",
			user:           &models.User{ID: 1, Role: models.RoleEmployee},
			expectedUser:   false,
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "supervisor denied",
			user:           &models.User{ID: 1, Role: models.RoleSupervisor},
			expectedUser:   false,
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "admin allowed",
			user:           &models.User{ID: 1, Role: models.RoleAdmin},
			expectedUser:   true,
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			if tt.user != nil {
				req = req.WithContext(ctxWithUser(tt.user))
			}
			rr := httptest.NewRecorder()

			user := requireAdmin(rr, req)

			if tt.expectedUser && user == nil {
				t.Error("expected user, got nil")
			}
			if !tt.expectedUser && user != nil {
				t.Error("expected nil user")
			}
			if !tt.expectedUser && rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}
		})
	}
}

func TestRequireJiraAccess(t *testing.T) {
	tests := []struct {
		name           string
		user           *models.User
		expectedUser   bool
		expectedStatus int
	}{
		{
			name:           "no user",
			user:           nil,
			expectedUser:   false,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "employee denied",
			user:           &models.User{ID: 1, Role: models.RoleEmployee},
			expectedUser:   false,
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "supervisor allowed",
			user:           &models.User{ID: 1, Role: models.RoleSupervisor},
			expectedUser:   true,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "admin allowed",
			user:           &models.User{ID: 1, Role: models.RoleAdmin},
			expectedUser:   true,
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			if tt.user != nil {
				req = req.WithContext(ctxWithUser(tt.user))
			}
			rr := httptest.NewRecorder()

			user := requireJiraAccess(rr, req)

			if tt.expectedUser && user == nil {
				t.Error("expected user, got nil")
			}
			if !tt.expectedUser && user != nil {
				t.Error("expected nil user")
			}
			if !tt.expectedUser && rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}
		})
	}
}

// ============================================
// Response Helper Tests
// ============================================

func TestRespondError(t *testing.T) {
	rr := httptest.NewRecorder()
	respondError(rr, http.StatusBadRequest, "test error message")

	if rr.Code != http.StatusBadRequest {
		t.Errorf("respondError() status = %d, want %d", rr.Code, http.StatusBadRequest)
	}

	if ct := rr.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("respondError() Content-Type = %s, want application/json", ct)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if msg, ok := response["error"].(string); !ok || msg != "test error message" {
		t.Errorf("error = %v, want 'test error message'", response["error"])
	}
	if status, ok := response["status"].(float64); !ok || int(status) != http.StatusBadRequest {
		t.Errorf("status = %v, want %d", response["status"], http.StatusBadRequest)
	}
}

func TestRespondJSON_Helpers(t *testing.T) {
	type TestData struct {
		Name  string `json:"name"`
		Count int    `json:"count"`
	}

	rr := httptest.NewRecorder()
	data := TestData{Name: "test", Count: 42}
	respondJSON(rr, http.StatusCreated, data)

	if rr.Code != http.StatusCreated {
		t.Errorf("respondJSON() status = %d, want %d", rr.Code, http.StatusCreated)
	}

	if ct := rr.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("respondJSON() Content-Type = %s, want application/json", ct)
	}

	var response TestData
	if err := json.NewDecoder(rr.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response.Name != "test" || response.Count != 42 {
		t.Errorf("response = %+v, want {Name:test Count:42}", response)
	}
}
