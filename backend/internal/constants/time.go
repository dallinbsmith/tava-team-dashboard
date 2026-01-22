// Package constants provides shared constant values used across the application.
// Centralizes magic numbers for easier maintenance and consistency.
package constants

// =============================================================================
// TIME DURATIONS (in seconds)
// =============================================================================

const (
	// SecondsPerMinute is the number of seconds in a minute.
	SecondsPerMinute = 60

	// SecondsPerHour is the number of seconds in an hour.
	SecondsPerHour = 60 * SecondsPerMinute

	// SecondsPerDay is the number of seconds in a day.
	SecondsPerDay = 24 * SecondsPerHour

	// SecondsPerWeek is the number of seconds in a week.
	SecondsPerWeek = 7 * SecondsPerDay
)

// =============================================================================
// AUTH0 CONFIGURATION
// =============================================================================

const (
	// PasswordResetTicketExpiry is how long a password reset ticket is valid (7 days).
	// Used when creating new employees via Auth0 Management API.
	PasswordResetTicketExpiry = 7 * SecondsPerDay // 604800 seconds
)
