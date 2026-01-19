package middleware

import (
	"context"
	"testing"

	"github.com/smith-dallin/manager-dashboard/internal/models"
)

func TestGetUserFromContext(t *testing.T) {
	tests := []struct {
		name     string
		ctx      context.Context
		wantUser bool
	}{
		{
			name: "returns user when present in context",
			ctx: context.WithValue(context.Background(), UserContextKey, &models.User{
				ID:    1,
				Email: "test@example.com",
			}),
			wantUser: true,
		},
		{
			name:     "returns nil when no user in context",
			ctx:      context.Background(),
			wantUser: false,
		},
		{
			name:     "returns nil when wrong type in context",
			ctx:      context.WithValue(context.Background(), UserContextKey, "not a user"),
			wantUser: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user := GetUserFromContext(tt.ctx)
			if tt.wantUser && user == nil {
				t.Error("Expected user but got nil")
			}
			if !tt.wantUser && user != nil {
				t.Error("Expected nil but got user")
			}
		})
	}
}

func TestParseName(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		wantFirstName string
		wantLastName  string
	}{
		{
			name:          "full name with two parts",
			input:         "John Doe",
			wantFirstName: "John",
			wantLastName:  "Doe",
		},
		{
			name:          "full name with multiple parts",
			input:         "John Smith Doe",
			wantFirstName: "John",
			wantLastName:  "Smith Doe",
		},
		{
			name:          "single name",
			input:         "John",
			wantFirstName: "John",
			wantLastName:  "",
		},
		{
			name:          "empty string",
			input:         "",
			wantFirstName: "Unknown",
			wantLastName:  "User",
		},
		{
			name:          "whitespace only",
			input:         "   ",
			wantFirstName: "Unknown",
			wantLastName:  "User",
		},
		{
			name:          "name with leading/trailing whitespace",
			input:         "  Jane Smith  ",
			wantFirstName: "Jane",
			wantLastName:  "Smith",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			firstName, lastName := parseName(tt.input)
			if firstName != tt.wantFirstName {
				t.Errorf("parseName() firstName = %v, want %v", firstName, tt.wantFirstName)
			}
			if lastName != tt.wantLastName {
				t.Errorf("parseName() lastName = %v, want %v", lastName, tt.wantLastName)
			}
		})
	}
}

func TestContextKey(t *testing.T) {
	// Test that context keys are distinct
	if UserContextKey == ClaimsContextKey {
		t.Error("UserContextKey and ClaimsContextKey should be distinct")
	}

	// Test that context keys have expected values
	if string(UserContextKey) != "user" {
		t.Errorf("UserContextKey = %v, want %v", UserContextKey, "user")
	}
	if string(ClaimsContextKey) != "claims" {
		t.Errorf("ClaimsContextKey = %v, want %v", ClaimsContextKey, "claims")
	}
}

func TestCustomClaims_Validate(t *testing.T) {
	claims := &CustomClaims{
		Email: "test@example.com",
		Name:  "Test User",
	}

	err := claims.Validate(context.Background())
	if err != nil {
		t.Errorf("CustomClaims.Validate() error = %v, want nil", err)
	}
}
