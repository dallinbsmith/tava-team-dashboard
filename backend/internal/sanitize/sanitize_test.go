package sanitize

import (
	"strings"
	"testing"
)

func TestName(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		maxLength int
		expected  string
	}{
		// Basic sanitization
		{
			name:      "trims leading and trailing whitespace",
			input:     "  Engineering  ",
			maxLength: 100,
			expected:  "Engineering",
		},
		{
			name:      "collapses multiple spaces",
			input:     "Product   Design",
			maxLength: 100,
			expected:  "Product Design",
		},
		{
			name:      "returns empty for empty input",
			input:     "",
			maxLength: 100,
			expected:  "",
		},
		{
			name:      "returns empty for whitespace only",
			input:     "   ",
			maxLength: 100,
			expected:  "",
		},

		// HTML tag removal
		{
			name:      "removes script tags",
			input:     "<script>alert('xss')</script>Engineering",
			maxLength: 100,
			expected:  "alert('xss')Engineering",
		},
		{
			name:      "removes HTML tags",
			input:     "<b>Bold</b> Team",
			maxLength: 100,
			expected:  "Bold Team",
		},
		{
			name:      "removes nested tags",
			input:     "<div><span>Nested</span></div>",
			maxLength: 100,
			expected:  "Nested",
		},
		{
			name:      "removes self-closing tags",
			input:     "Before<br/>After",
			maxLength: 100,
			expected:  "BeforeAfter",
		},

		// Script injection prevention
		{
			name:      "removes javascript protocol",
			input:     "javascript:alert('xss')",
			maxLength: 100,
			expected:  "alert('xss')",
		},
		{
			name:      "removes javascript protocol case insensitive",
			input:     "JAVASCRIPT:alert('xss')",
			maxLength: 100,
			expected:  "alert('xss')",
		},
		{
			name:      "removes onclick handler",
			input:     "onclick=alert('xss')",
			maxLength: 100,
			expected:  "alert('xss')",
		},
		{
			name:      "removes onmouseover handler",
			input:     "onmouseover=hack()",
			maxLength: 100,
			expected:  "hack()",
		},

		// Length limiting
		{
			name:      "limits to max length",
			input:     strings.Repeat("A", 150),
			maxLength: 100,
			expected:  strings.Repeat("A", 100),
		},
		{
			name:      "respects custom max length",
			input:     "Engineering",
			maxLength: 5,
			expected:  "Engin",
		},
		{
			name:      "does not truncate within limit",
			input:     "Short",
			maxLength: 100,
			expected:  "Short",
		},
		{
			name:      "uses default max length when zero",
			input:     strings.Repeat("B", 150),
			maxLength: 0,
			expected:  strings.Repeat("B", MaxNameLength),
		},

		// Real-world examples
		{
			name:      "handles department name",
			input:     "Product & Design",
			maxLength: 100,
			expected:  "Product & Design",
		},
		{
			name:      "handles squad name with hyphen",
			input:     "Backend-API",
			maxLength: 100,
			expected:  "Backend-API",
		},
		{
			name:      "handles squad name with underscore",
			input:     "DevOps_Infra",
			maxLength: 100,
			expected:  "DevOps_Infra",
		},
		{
			name:      "handles unicode characters",
			input:     "Équipe Française",
			maxLength: 100,
			expected:  "Équipe Française",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := Name(tt.input, tt.maxLength)
			if result != tt.expected {
				t.Errorf("Name(%q, %d) = %q, expected %q", tt.input, tt.maxLength, result, tt.expected)
			}
		})
	}
}

func TestValidateName(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		fieldName   string
		minLength   int
		maxLength   int
		expectError bool
		errorPrefix string
	}{
		// Minimum length validation
		{
			name:        "returns error for empty string",
			input:       "",
			fieldName:   "Squad name",
			minLength:   1,
			maxLength:   100,
			expectError: true,
			errorPrefix: "Squad name",
		},
		{
			name:        "passes for valid length",
			input:       "Engineering",
			fieldName:   "Squad name",
			minLength:   1,
			maxLength:   100,
			expectError: false,
		},
		{
			name:        "respects custom minimum length",
			input:       "AB",
			fieldName:   "Name",
			minLength:   3,
			maxLength:   100,
			expectError: true,
			errorPrefix: "Name",
		},
		{
			name:        "passes for string at min length",
			input:       "ABC",
			fieldName:   "Name",
			minLength:   3,
			maxLength:   100,
			expectError: false,
		},

		// Maximum length validation
		{
			name:        "returns error for string exceeding max",
			input:       strings.Repeat("A", 101),
			fieldName:   "Name",
			minLength:   1,
			maxLength:   100,
			expectError: true,
			errorPrefix: "Name",
		},
		{
			name:        "passes for string at max length",
			input:       strings.Repeat("A", 100),
			fieldName:   "Name",
			minLength:   1,
			maxLength:   100,
			expectError: false,
		},

		// Alphanumeric requirement
		{
			name:        "returns error for only special chars",
			input:       "---",
			fieldName:   "Name",
			minLength:   1,
			maxLength:   100,
			expectError: true,
			errorPrefix: "Name",
		},
		{
			name:        "passes for string with letter",
			input:       "A",
			fieldName:   "Name",
			minLength:   1,
			maxLength:   100,
			expectError: false,
		},
		{
			name:        "passes for string with number",
			input:       "123",
			fieldName:   "Name",
			minLength:   1,
			maxLength:   100,
			expectError: false,
		},
		{
			name:        "passes for mixed content",
			input:       "Team-1",
			fieldName:   "Name",
			minLength:   1,
			maxLength:   100,
			expectError: false,
		},

		// Default values
		{
			name:        "uses default min length when zero",
			input:       "",
			fieldName:   "Name",
			minLength:   0,
			maxLength:   100,
			expectError: true,
		},
		{
			name:        "uses default max length when zero",
			input:       strings.Repeat("A", MaxNameLength+1),
			fieldName:   "Name",
			minLength:   1,
			maxLength:   0,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateName(tt.input, tt.fieldName, tt.minLength, tt.maxLength)
			if tt.expectError {
				if result == "" {
					t.Errorf("ValidateName(%q) expected error, got none", tt.input)
				} else if tt.errorPrefix != "" && !strings.HasPrefix(result, tt.errorPrefix) {
					t.Errorf("ValidateName(%q) error should start with %q, got %q", tt.input, tt.errorPrefix, result)
				}
			} else {
				if result != "" {
					t.Errorf("ValidateName(%q) expected no error, got %q", tt.input, result)
				}
			}
		})
	}
}

func TestSanitizeAndValidate(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		fieldName   string
		minLength   int
		maxLength   int
		expected    string
		expectError bool
	}{
		{
			name:        "sanitizes and validates valid input",
			input:       "  Engineering  ",
			fieldName:   "Department",
			minLength:   1,
			maxLength:   100,
			expected:    "Engineering",
			expectError: false,
		},
		{
			name:        "sanitizes and returns error for invalid",
			input:       "   ",
			fieldName:   "Department",
			minLength:   1,
			maxLength:   100,
			expected:    "",
			expectError: true,
		},
		{
			name:        "sanitizes XSS attempt",
			input:       "<script>test</script>",
			fieldName:   "Name",
			minLength:   1,
			maxLength:   100,
			expected:    "test",
			expectError: false,
		},
		{
			name:        "applies length limit",
			input:       strings.Repeat("A", 150),
			fieldName:   "Name",
			minLength:   1,
			maxLength:   100,
			expected:    strings.Repeat("A", 100),
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			value, err := SanitizeAndValidate(tt.input, tt.fieldName, tt.minLength, tt.maxLength)
			if value != tt.expected {
				t.Errorf("SanitizeAndValidate(%q) value = %q, expected %q", tt.input, value, tt.expected)
			}
			if tt.expectError && err == "" {
				t.Errorf("SanitizeAndValidate(%q) expected error, got none", tt.input)
			}
			if !tt.expectError && err != "" {
				t.Errorf("SanitizeAndValidate(%q) expected no error, got %q", tt.input, err)
			}
		})
	}
}

func TestXSSPrevention(t *testing.T) {
	xssAttempts := []string{
		"<script>alert('xss')</script>",
		"javascript:alert('xss')",
		"onclick=alert('xss')",
		"<img src=x onerror=alert('xss')>",
		"<svg onload=alert('xss')>",
		"<body onload=alert('xss')>",
	}

	for _, input := range xssAttempts {
		t.Run(input[:20], func(t *testing.T) {
			result := Name(input, 100)

			if strings.Contains(result, "<script>") {
				t.Errorf("Name(%q) still contains script tag: %q", input, result)
			}
			if strings.Contains(strings.ToLower(result), "javascript:") {
				t.Errorf("Name(%q) still contains javascript: protocol: %q", input, result)
			}
			if strings.Contains(strings.ToLower(result), "onclick=") ||
				strings.Contains(strings.ToLower(result), "onerror=") ||
				strings.Contains(strings.ToLower(result), "onload=") {
				t.Errorf("Name(%q) still contains event handler: %q", input, result)
			}
		})
	}
}
