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

// ErrorCode represents a machine-readable error code
type ErrorCode string

// Standard error codes for consistent API responses
const (
	// Authentication errors
	CodeAuthRequired    ErrorCode = "AUTH_REQUIRED"
	CodeInvalidToken    ErrorCode = "INVALID_TOKEN"
	CodeTokenExpired    ErrorCode = "TOKEN_EXPIRED"

	// Authorization errors
	CodeForbidden          ErrorCode = "FORBIDDEN"
	CodeAdminRequired      ErrorCode = "ADMIN_REQUIRED"
	CodeSupervisorRequired ErrorCode = "SUPERVISOR_REQUIRED"
	CodeNotOwner           ErrorCode = "NOT_OWNER"

	// Resource errors
	CodeNotFound      ErrorCode = "NOT_FOUND"
	CodeAlreadyExists ErrorCode = "ALREADY_EXISTS"
	CodeConflict      ErrorCode = "CONFLICT"

	// Validation errors
	CodeValidationFailed ErrorCode = "VALIDATION_FAILED"
	CodeInvalidInput     ErrorCode = "INVALID_INPUT"
	CodeMissingField     ErrorCode = "MISSING_FIELD"
	CodeInvalidFormat    ErrorCode = "INVALID_FORMAT"
	CodeInvalidEmail     ErrorCode = "INVALID_EMAIL"
	CodeInvalidRole      ErrorCode = "INVALID_ROLE"

	// Rate limiting
	CodeRateLimitExceeded ErrorCode = "RATE_LIMIT_EXCEEDED"

	// External service errors
	CodeServiceUnavailable ErrorCode = "SERVICE_UNAVAILABLE"
	CodeJiraError          ErrorCode = "JIRA_ERROR"
	CodeAuth0Error         ErrorCode = "AUTH0_ERROR"

	// Internal errors
	CodeInternalError ErrorCode = "INTERNAL_ERROR"
	CodeDatabaseError ErrorCode = "DATABASE_ERROR"
)

// AppError is the standard application error type
type AppError struct {
	Type    ErrorType // Error category
	Code    ErrorCode // Machine-readable error code
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
		Code:    CodeValidationFailed,
		Message: message,
	}
}

// NewValidationErrorWithCode creates a validation error with a specific code
func NewValidationErrorWithCode(code ErrorCode, message string) *AppError {
	return &AppError{
		Type:    ErrorTypeValidation,
		Code:    code,
		Message: message,
	}
}

// NewValidationErrorWithField creates a validation error for a specific field
func NewValidationErrorWithField(field, message string) *AppError {
	return &AppError{
		Type:    ErrorTypeValidation,
		Code:    CodeMissingField,
		Message: message,
		Field:   field,
	}
}

// NewNotFoundError creates a not found error
func NewNotFoundError(resource string) *AppError {
	return &AppError{
		Type:    ErrorTypeNotFound,
		Code:    CodeNotFound,
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
		Code:    CodeAuthRequired,
		Message: message,
	}
}

// NewUnauthorizedErrorWithCode creates an unauthorized error with a specific code
func NewUnauthorizedErrorWithCode(code ErrorCode, message string) *AppError {
	if message == "" {
		message = "Unauthorized"
	}
	return &AppError{
		Type:    ErrorTypeUnauthorized,
		Code:    code,
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
		Code:    CodeForbidden,
		Message: message,
	}
}

// NewForbiddenErrorWithCode creates a forbidden error with a specific code
func NewForbiddenErrorWithCode(code ErrorCode, message string) *AppError {
	if message == "" {
		message = "Forbidden"
	}
	return &AppError{
		Type:    ErrorTypeForbidden,
		Code:    code,
		Message: message,
	}
}

// NewConflictError creates a conflict error
func NewConflictError(message string) *AppError {
	return &AppError{
		Type:    ErrorTypeConflict,
		Code:    CodeConflict,
		Message: message,
	}
}

// NewAlreadyExistsError creates an already exists error
func NewAlreadyExistsError(resource string) *AppError {
	return &AppError{
		Type:    ErrorTypeConflict,
		Code:    CodeAlreadyExists,
		Message: fmt.Sprintf("%s already exists", resource),
	}
}

// NewInternalError creates an internal error, wrapping the original error
func NewInternalError(message string, err error) *AppError {
	return &AppError{
		Type:    ErrorTypeInternal,
		Code:    CodeInternalError,
		Message: message,
		Err:     err,
	}
}

// NewDatabaseError creates a database error
func NewDatabaseError(message string, err error) *AppError {
	return &AppError{
		Type:    ErrorTypeInternal,
		Code:    CodeDatabaseError,
		Message: message,
		Err:     err,
	}
}

// NewServiceUnavailableError creates a service unavailable error
func NewServiceUnavailableError(service string) *AppError {
	return &AppError{
		Type:    ErrorTypeServiceUnavailable,
		Code:    CodeServiceUnavailable,
		Message: fmt.Sprintf("%s is not available", service),
	}
}

// NewJiraError creates a Jira service error
func NewJiraError(message string, err error) *AppError {
	return &AppError{
		Type:    ErrorTypeServiceUnavailable,
		Code:    CodeJiraError,
		Message: message,
		Err:     err,
	}
}

// NewRateLimitError creates a rate limit error
func NewRateLimitError() *AppError {
	return &AppError{
		Type:    ErrorTypeValidation, // Use validation since 429 is client-side handling
		Code:    CodeRateLimitExceeded,
		Message: "Too many requests, please try again later",
	}
}

// Wrap wraps an error with additional context
func Wrap(err error, message string) *AppError {
	if err == nil {
		return nil
	}

	// If it's already an AppError, preserve the type and code
	var appErr *AppError
	if errors.As(err, &appErr) {
		return &AppError{
			Type:    appErr.Type,
			Code:    appErr.Code,
			Message: message,
			Err:     err,
			Field:   appErr.Field,
		}
	}

	// Default to internal error for unknown errors
	return &AppError{
		Type:    ErrorTypeInternal,
		Code:    CodeInternalError,
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

// GetErrorCode returns the error code for any error
// Returns CodeInternalError for non-AppError types
func GetErrorCode(err error) ErrorCode {
	var appErr *AppError
	if errors.As(err, &appErr) {
		if appErr.Code != "" {
			return appErr.Code
		}
		// Return default code based on type if not set
		return defaultCodeForType(appErr.Type)
	}
	return CodeInternalError
}

// defaultCodeForType returns the default error code for an error type
func defaultCodeForType(t ErrorType) ErrorCode {
	switch t {
	case ErrorTypeValidation:
		return CodeValidationFailed
	case ErrorTypeNotFound:
		return CodeNotFound
	case ErrorTypeUnauthorized:
		return CodeAuthRequired
	case ErrorTypeForbidden:
		return CodeForbidden
	case ErrorTypeConflict:
		return CodeConflict
	case ErrorTypeServiceUnavailable:
		return CodeServiceUnavailable
	default:
		return CodeInternalError
	}
}
