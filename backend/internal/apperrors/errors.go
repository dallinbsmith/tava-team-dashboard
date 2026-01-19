package apperrors

import (
	"errors"
	"fmt"
	"net/http"
)

// ErrorType represents the category of error
type ErrorType int

const (
	// ErrorTypeValidation indicates invalid input data
	ErrorTypeValidation ErrorType = iota
	// ErrorTypeNotFound indicates a resource was not found
	ErrorTypeNotFound
	// ErrorTypeUnauthorized indicates missing or invalid authentication
	ErrorTypeUnauthorized
	// ErrorTypeForbidden indicates insufficient permissions
	ErrorTypeForbidden
	// ErrorTypeConflict indicates a resource conflict (e.g., duplicate)
	ErrorTypeConflict
	// ErrorTypeInternal indicates an internal server error
	ErrorTypeInternal
	// ErrorTypeServiceUnavailable indicates a dependency is unavailable
	ErrorTypeServiceUnavailable
)

// AppError is the standard application error type
type AppError struct {
	Type    ErrorType // Error category
	Message string    // User-facing message
	Err     error     // Internal error (not exposed to users)
	Field   string    // Optional field name for validation errors
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

// Unwrap returns the wrapped error for errors.Is/As support
func (e *AppError) Unwrap() error {
	return e.Err
}

// HTTPStatus returns the appropriate HTTP status code for this error type
func (e *AppError) HTTPStatus() int {
	switch e.Type {
	case ErrorTypeValidation:
		return http.StatusBadRequest
	case ErrorTypeNotFound:
		return http.StatusNotFound
	case ErrorTypeUnauthorized:
		return http.StatusUnauthorized
	case ErrorTypeForbidden:
		return http.StatusForbidden
	case ErrorTypeConflict:
		return http.StatusConflict
	case ErrorTypeServiceUnavailable:
		return http.StatusServiceUnavailable
	case ErrorTypeInternal:
		fallthrough
	default:
		return http.StatusInternalServerError
	}
}

// Constructor functions for common error types

// NewValidationError creates a validation error
func NewValidationError(message string) *AppError {
	return &AppError{
		Type:    ErrorTypeValidation,
		Message: message,
	}
}

// NewValidationErrorWithField creates a validation error for a specific field
func NewValidationErrorWithField(field, message string) *AppError {
	return &AppError{
		Type:    ErrorTypeValidation,
		Message: message,
		Field:   field,
	}
}

// NewNotFoundError creates a not found error
func NewNotFoundError(resource string) *AppError {
	return &AppError{
		Type:    ErrorTypeNotFound,
		Message: fmt.Sprintf("%s not found", resource),
	}
}

// NewUnauthorizedError creates an unauthorized error
func NewUnauthorizedError(message string) *AppError {
	if message == "" {
		message = "Unauthorized"
	}
	return &AppError{
		Type:    ErrorTypeUnauthorized,
		Message: message,
	}
}

// NewForbiddenError creates a forbidden error
func NewForbiddenError(message string) *AppError {
	if message == "" {
		message = "Forbidden"
	}
	return &AppError{
		Type:    ErrorTypeForbidden,
		Message: message,
	}
}

// NewConflictError creates a conflict error
func NewConflictError(message string) *AppError {
	return &AppError{
		Type:    ErrorTypeConflict,
		Message: message,
	}
}

// NewInternalError creates an internal error, wrapping the original error
func NewInternalError(message string, err error) *AppError {
	return &AppError{
		Type:    ErrorTypeInternal,
		Message: message,
		Err:     err,
	}
}

// NewServiceUnavailableError creates a service unavailable error
func NewServiceUnavailableError(service string) *AppError {
	return &AppError{
		Type:    ErrorTypeServiceUnavailable,
		Message: fmt.Sprintf("%s is not available", service),
	}
}

// Wrap wraps an error with additional context
func Wrap(err error, message string) *AppError {
	if err == nil {
		return nil
	}

	// If it's already an AppError, preserve the type
	var appErr *AppError
	if errors.As(err, &appErr) {
		return &AppError{
			Type:    appErr.Type,
			Message: message,
			Err:     err,
			Field:   appErr.Field,
		}
	}

	// Default to internal error for unknown errors
	return &AppError{
		Type:    ErrorTypeInternal,
		Message: message,
		Err:     err,
	}
}

// IsNotFound checks if the error is a not found error
func IsNotFound(err error) bool {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Type == ErrorTypeNotFound
	}
	return false
}

// IsValidation checks if the error is a validation error
func IsValidation(err error) bool {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Type == ErrorTypeValidation
	}
	return false
}

// IsUnauthorized checks if the error is an unauthorized error
func IsUnauthorized(err error) bool {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Type == ErrorTypeUnauthorized
	}
	return false
}

// IsForbidden checks if the error is a forbidden error
func IsForbidden(err error) bool {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Type == ErrorTypeForbidden
	}
	return false
}

// GetHTTPStatus returns the HTTP status code for any error
// Returns 500 for non-AppError types
func GetHTTPStatus(err error) int {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.HTTPStatus()
	}
	return http.StatusInternalServerError
}

// GetUserMessage returns the user-safe message for any error
// Returns a generic message for non-AppError types
func GetUserMessage(err error) string {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Message
	}
	return "An internal error occurred"
}
