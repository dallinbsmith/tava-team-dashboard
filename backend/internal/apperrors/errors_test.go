package apperrors

import (
	"errors"
	"net/http"
	"testing"
)

func TestAppError_Error(t *testing.T) {
	tests := []struct {
		name     string
		appErr   *AppError
		expected string
	}{
		{
			name: "message only",
			appErr: &AppError{
				Message: "something went wrong",
			},
			expected: "something went wrong",
		},
		{
			name: "message with wrapped error",
			appErr: &AppError{
				Message: "failed to save",
				Err:     errors.New("connection refused"),
			},
			expected: "failed to save: connection refused",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.appErr.Error()
			if result != tt.expected {
				t.Errorf("Error() = %q, want %q", result, tt.expected)
			}
		})
	}
}

func TestAppError_Unwrap(t *testing.T) {
	innerErr := errors.New("inner error")
	appErr := &AppError{
		Message: "outer message",
		Err:     innerErr,
	}

	unwrapped := appErr.Unwrap()
	if unwrapped != innerErr {
		t.Errorf("Unwrap() = %v, want %v", unwrapped, innerErr)
	}

	// Test that errors.Is works through the chain
	if !errors.Is(appErr, innerErr) {
		t.Error("errors.Is() should find wrapped error")
	}
}

func TestAppError_HTTPStatus(t *testing.T) {
	tests := []struct {
		name         string
		errorType    ErrorType
		expectedCode int
	}{
		{"validation", ErrorTypeValidation, http.StatusBadRequest},
		{"not found", ErrorTypeNotFound, http.StatusNotFound},
		{"unauthorized", ErrorTypeUnauthorized, http.StatusUnauthorized},
		{"forbidden", ErrorTypeForbidden, http.StatusForbidden},
		{"conflict", ErrorTypeConflict, http.StatusConflict},
		{"service unavailable", ErrorTypeServiceUnavailable, http.StatusServiceUnavailable},
		{"internal", ErrorTypeInternal, http.StatusInternalServerError},
		{"unknown type", ErrorType(999), http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			appErr := &AppError{Type: tt.errorType}
			result := appErr.HTTPStatus()
			if result != tt.expectedCode {
				t.Errorf("HTTPStatus() = %d, want %d", result, tt.expectedCode)
			}
		})
	}
}

func TestNewValidationError(t *testing.T) {
	err := NewValidationError("invalid input")

	if err.Type != ErrorTypeValidation {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeValidation)
	}
	if err.Code != CodeValidationFailed {
		t.Errorf("Code = %v, want %v", err.Code, CodeValidationFailed)
	}
	if err.Message != "invalid input" {
		t.Errorf("Message = %q, want %q", err.Message, "invalid input")
	}
}

func TestNewValidationErrorWithField(t *testing.T) {
	err := NewValidationErrorWithField("email", "email is required")

	if err.Type != ErrorTypeValidation {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeValidation)
	}
	if err.Field != "email" {
		t.Errorf("Field = %q, want %q", err.Field, "email")
	}
	if err.Code != CodeMissingField {
		t.Errorf("Code = %v, want %v", err.Code, CodeMissingField)
	}
}

func TestNewNotFoundError(t *testing.T) {
	err := NewNotFoundError("User")

	if err.Type != ErrorTypeNotFound {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeNotFound)
	}
	if err.Code != CodeNotFound {
		t.Errorf("Code = %v, want %v", err.Code, CodeNotFound)
	}
	if err.Message != "User not found" {
		t.Errorf("Message = %q, want %q", err.Message, "User not found")
	}
}

func TestNewUnauthorizedError(t *testing.T) {
	tests := []struct {
		name            string
		message         string
		expectedMessage string
	}{
		{"with message", "token expired", "token expired"},
		{"empty message", "", "Unauthorized"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := NewUnauthorizedError(tt.message)
			if err.Type != ErrorTypeUnauthorized {
				t.Errorf("Type = %v, want %v", err.Type, ErrorTypeUnauthorized)
			}
			if err.Message != tt.expectedMessage {
				t.Errorf("Message = %q, want %q", err.Message, tt.expectedMessage)
			}
		})
	}
}

func TestNewForbiddenError(t *testing.T) {
	tests := []struct {
		name            string
		message         string
		expectedMessage string
	}{
		{"with message", "admin access required", "admin access required"},
		{"empty message", "", "Forbidden"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := NewForbiddenError(tt.message)
			if err.Type != ErrorTypeForbidden {
				t.Errorf("Type = %v, want %v", err.Type, ErrorTypeForbidden)
			}
			if err.Message != tt.expectedMessage {
				t.Errorf("Message = %q, want %q", err.Message, tt.expectedMessage)
			}
		})
	}
}

func TestNewConflictError(t *testing.T) {
	err := NewConflictError("resource already modified")

	if err.Type != ErrorTypeConflict {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeConflict)
	}
	if err.Code != CodeConflict {
		t.Errorf("Code = %v, want %v", err.Code, CodeConflict)
	}
}

func TestNewAlreadyExistsError(t *testing.T) {
	err := NewAlreadyExistsError("Email")

	if err.Type != ErrorTypeConflict {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeConflict)
	}
	if err.Code != CodeAlreadyExists {
		t.Errorf("Code = %v, want %v", err.Code, CodeAlreadyExists)
	}
	if err.Message != "Email already exists" {
		t.Errorf("Message = %q, want %q", err.Message, "Email already exists")
	}
}

func TestNewInternalError(t *testing.T) {
	innerErr := errors.New("db connection failed")
	err := NewInternalError("failed to save user", innerErr)

	if err.Type != ErrorTypeInternal {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeInternal)
	}
	if err.Code != CodeInternalError {
		t.Errorf("Code = %v, want %v", err.Code, CodeInternalError)
	}
	if err.Err != innerErr {
		t.Error("Err should contain the wrapped error")
	}
}

func TestNewDatabaseError(t *testing.T) {
	innerErr := errors.New("query timeout")
	err := NewDatabaseError("failed to fetch users", innerErr)

	if err.Type != ErrorTypeInternal {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeInternal)
	}
	if err.Code != CodeDatabaseError {
		t.Errorf("Code = %v, want %v", err.Code, CodeDatabaseError)
	}
}

func TestNewServiceUnavailableError(t *testing.T) {
	err := NewServiceUnavailableError("Jira")

	if err.Type != ErrorTypeServiceUnavailable {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeServiceUnavailable)
	}
	if err.Message != "Jira is not available" {
		t.Errorf("Message = %q, want %q", err.Message, "Jira is not available")
	}
}

func TestNewJiraError(t *testing.T) {
	innerErr := errors.New("API rate limited")
	err := NewJiraError("failed to fetch issues", innerErr)

	if err.Type != ErrorTypeServiceUnavailable {
		t.Errorf("Type = %v, want %v", err.Type, ErrorTypeServiceUnavailable)
	}
	if err.Code != CodeJiraError {
		t.Errorf("Code = %v, want %v", err.Code, CodeJiraError)
	}
}

func TestNewRateLimitError(t *testing.T) {
	err := NewRateLimitError()

	if err.Code != CodeRateLimitExceeded {
		t.Errorf("Code = %v, want %v", err.Code, CodeRateLimitExceeded)
	}
}

func TestWrap(t *testing.T) {
	t.Run("nil error returns nil", func(t *testing.T) {
		result := Wrap(nil, "context")
		if result != nil {
			t.Error("Wrap(nil) should return nil")
		}
	})

	t.Run("wraps AppError preserving type and code", func(t *testing.T) {
		original := NewNotFoundError("User")
		wrapped := Wrap(original, "failed to get user")

		if wrapped.Type != ErrorTypeNotFound {
			t.Errorf("Type = %v, want %v", wrapped.Type, ErrorTypeNotFound)
		}
		if wrapped.Code != CodeNotFound {
			t.Errorf("Code = %v, want %v", wrapped.Code, CodeNotFound)
		}
		if wrapped.Message != "failed to get user" {
			t.Errorf("Message = %q, want %q", wrapped.Message, "failed to get user")
		}
		if !errors.Is(wrapped, original) {
			t.Error("wrapped error should contain original")
		}
	})

	t.Run("wraps AppError preserving field", func(t *testing.T) {
		original := NewValidationErrorWithField("email", "invalid email")
		wrapped := Wrap(original, "validation failed")

		if wrapped.Field != "email" {
			t.Errorf("Field = %q, want %q", wrapped.Field, "email")
		}
	})

	t.Run("wraps standard error as internal", func(t *testing.T) {
		original := errors.New("something broke")
		wrapped := Wrap(original, "operation failed")

		if wrapped.Type != ErrorTypeInternal {
			t.Errorf("Type = %v, want %v", wrapped.Type, ErrorTypeInternal)
		}
		if wrapped.Code != CodeInternalError {
			t.Errorf("Code = %v, want %v", wrapped.Code, CodeInternalError)
		}
	})
}

func TestIsNotFound(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{"not found error", NewNotFoundError("User"), true},
		{"validation error", NewValidationError("bad input"), false},
		{"standard error", errors.New("not found"), false},
		{"nil error", nil, false},
		{"wrapped not found", Wrap(NewNotFoundError("User"), "context"), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsNotFound(tt.err)
			if result != tt.expected {
				t.Errorf("IsNotFound() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestIsValidation(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{"validation error", NewValidationError("bad input"), true},
		{"not found error", NewNotFoundError("User"), false},
		{"standard error", errors.New("invalid"), false},
		{"nil error", nil, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsValidation(tt.err)
			if result != tt.expected {
				t.Errorf("IsValidation() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestIsUnauthorized(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{"unauthorized error", NewUnauthorizedError("token expired"), true},
		{"forbidden error", NewForbiddenError("admin required"), false},
		{"standard error", errors.New("unauthorized"), false},
		{"nil error", nil, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsUnauthorized(tt.err)
			if result != tt.expected {
				t.Errorf("IsUnauthorized() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestIsForbidden(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{"forbidden error", NewForbiddenError("admin required"), true},
		{"unauthorized error", NewUnauthorizedError("token expired"), false},
		{"standard error", errors.New("forbidden"), false},
		{"nil error", nil, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsForbidden(tt.err)
			if result != tt.expected {
				t.Errorf("IsForbidden() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestGetHTTPStatus(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected int
	}{
		{"validation error", NewValidationError("bad"), http.StatusBadRequest},
		{"not found error", NewNotFoundError("User"), http.StatusNotFound},
		{"unauthorized error", NewUnauthorizedError(""), http.StatusUnauthorized},
		{"forbidden error", NewForbiddenError(""), http.StatusForbidden},
		{"conflict error", NewConflictError("dup"), http.StatusConflict},
		{"internal error", NewInternalError("fail", nil), http.StatusInternalServerError},
		{"standard error", errors.New("oops"), http.StatusInternalServerError},
		{"nil error", nil, http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetHTTPStatus(tt.err)
			if result != tt.expected {
				t.Errorf("GetHTTPStatus() = %d, want %d", result, tt.expected)
			}
		})
	}
}

func TestGetUserMessage(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected string
	}{
		{"app error", NewValidationError("invalid email"), "invalid email"},
		{"standard error", errors.New("db error"), "An internal error occurred"},
		{"nil error", nil, "An internal error occurred"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetUserMessage(tt.err)
			if result != tt.expected {
				t.Errorf("GetUserMessage() = %q, want %q", result, tt.expected)
			}
		})
	}
}

func TestGetErrorCode(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected ErrorCode
	}{
		{"error with code", NewValidationError("bad"), CodeValidationFailed},
		{"not found error", NewNotFoundError("User"), CodeNotFound},
		{"error without code", &AppError{Type: ErrorTypeForbidden}, CodeForbidden},
		{"standard error", errors.New("oops"), CodeInternalError},
		{"nil error", nil, CodeInternalError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetErrorCode(tt.err)
			if result != tt.expected {
				t.Errorf("GetErrorCode() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestDefaultCodeForType(t *testing.T) {
	tests := []struct {
		errorType ErrorType
		expected  ErrorCode
	}{
		{ErrorTypeValidation, CodeValidationFailed},
		{ErrorTypeNotFound, CodeNotFound},
		{ErrorTypeUnauthorized, CodeAuthRequired},
		{ErrorTypeForbidden, CodeForbidden},
		{ErrorTypeConflict, CodeConflict},
		{ErrorTypeServiceUnavailable, CodeServiceUnavailable},
		{ErrorTypeInternal, CodeInternalError},
		{ErrorType(999), CodeInternalError},
	}

	for _, tt := range tests {
		t.Run(string(tt.expected), func(t *testing.T) {
			result := defaultCodeForType(tt.errorType)
			if result != tt.expected {
				t.Errorf("defaultCodeForType(%v) = %v, want %v", tt.errorType, result, tt.expected)
			}
		})
	}
}

func TestErrorsAsChain(t *testing.T) {
	// Test that errors.As works correctly through wrapped errors
	original := NewNotFoundError("User")
	wrapped := Wrap(original, "service layer")
	doubleWrapped := Wrap(wrapped, "handler layer")

	var appErr *AppError
	if !errors.As(doubleWrapped, &appErr) {
		t.Error("errors.As should find AppError in chain")
	}

	if appErr.Type != ErrorTypeNotFound {
		t.Errorf("Type should be preserved through wrapping, got %v", appErr.Type)
	}
}
