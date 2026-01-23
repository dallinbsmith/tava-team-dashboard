// Package sanitize provides input sanitization utilities for user-provided text.
package sanitize

import (
	"regexp"
	"strings"
	"unicode"
)

const MaxNameLength = 100

var (
	// Patterns to remove
	htmlTagPattern    = regexp.MustCompile(`<[^>]*>`)
	jsProtocolPattern = regexp.MustCompile(`(?i)javascript:`)
	eventHandlerPattern = regexp.MustCompile(`(?i)on\w+=`)
	multiSpacePattern = regexp.MustCompile(`\s+`)
)

// Name sanitizes a name field (department, squad, etc.)
// - Trims leading/trailing whitespace
// - Collapses multiple spaces into one
// - Removes HTML tags and script content
// - Removes control characters
// - Limits length
func Name(input string, maxLength int) string {
	if input == "" {
		return ""
	}

	if maxLength <= 0 {
		maxLength = MaxNameLength
	}

	// Remove HTML tags
	result := htmlTagPattern.ReplaceAllString(input, "")

	// Remove javascript: protocol
	result = jsProtocolPattern.ReplaceAllString(result, "")

	// Remove event handlers
	result = eventHandlerPattern.ReplaceAllString(result, "")

	// Remove control characters (except standard whitespace)
	result = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) && r != ' ' && r != '\t' && r != '\n' && r != '\r' {
			return -1
		}
		return r
	}, result)

	// Collapse multiple whitespace to single space
	result = multiSpacePattern.ReplaceAllString(result, " ")

	// Trim whitespace
	result = strings.TrimSpace(result)

	// Limit length
	if len(result) > maxLength {
		result = result[:maxLength]
	}

	return result
}

// ValidateName checks if a sanitized name is acceptable.
// Returns an error message if invalid, or empty string if valid.
func ValidateName(name string, fieldName string, minLength int, maxLength int) string {
	if minLength <= 0 {
		minLength = 1
	}
	if maxLength <= 0 {
		maxLength = MaxNameLength
	}

	if len(name) < minLength {
		if minLength == 1 {
			return fieldName + " is required"
		}
		return fieldName + " must be at least " + string(rune(minLength+'0')) + " characters"
	}

	if len(name) > maxLength {
		return fieldName + " must be less than " + string(rune(maxLength/100+'0')) + string(rune((maxLength/10)%10+'0')) + string(rune(maxLength%10+'0')) + " characters"
	}

	// Check for at least one alphanumeric character
	hasAlphaNum := false
	for _, r := range name {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			hasAlphaNum = true
			break
		}
	}
	if !hasAlphaNum {
		return fieldName + " must contain at least one letter or number"
	}

	return ""
}

// SanitizeAndValidate sanitizes input and validates it
func SanitizeAndValidate(input string, fieldName string, minLength int, maxLength int) (string, string) {
	sanitized := Name(input, maxLength)
	err := ValidateName(sanitized, fieldName, minLength, maxLength)
	return sanitized, err
}
