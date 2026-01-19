package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	DatabaseURL    string
	Auth0Domain    string
	Auth0Audience  string
	Auth0ClientID  string
	FrontendURL    string
	Environment    string // "development" or "production"

	// Auth0 Management API Configuration
	Auth0MgmtClientID     string
	Auth0MgmtClientSecret string
	Auth0DBConnection     string // The name of the Auth0 database connection (e.g., "Username-Password-Authentication")

	// S3 Configuration
	S3Enabled         bool
	S3Bucket          string
	S3Region          string
	S3AccessKeyID     string
	S3SecretAccessKey string
	S3Endpoint        string // Optional: for S3-compatible services like R2, MinIO
	S3PublicURL       string // Optional: custom public URL for accessing files

	// Jira OAuth 2.0 Configuration
	JiraClientID     string
	JiraClientSecret string
	JiraCallbackURL  string // e.g., http://localhost:3000/api/jira/callback
}

// IsProduction returns true if running in production mode
func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

// IsAuth0MgmtEnabled returns true if Auth0 Management API is configured
func (c *Config) IsAuth0MgmtEnabled() bool {
	return c.Auth0MgmtClientID != "" && c.Auth0MgmtClientSecret != ""
}

// IsJiraOAuthEnabled returns true if Jira OAuth is configured
func (c *Config) IsJiraOAuthEnabled() bool {
	return c.JiraClientID != "" && c.JiraClientSecret != ""
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	s3Enabled := os.Getenv("S3_ENABLED") == "true"
	env := getEnv("ENVIRONMENT", "development")

	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		Auth0Domain:    os.Getenv("AUTH0_DOMAIN"),
		Auth0Audience:  os.Getenv("AUTH0_AUDIENCE"),
		Auth0ClientID:  os.Getenv("AUTH0_CLIENT_ID"),
		FrontendURL:    getEnv("FRONTEND_URL", "http://localhost:3000"),
		Environment:    env,

		// Auth0 Management API Configuration
		Auth0MgmtClientID:     os.Getenv("AUTH0_MGMT_CLIENT_ID"),
		Auth0MgmtClientSecret: os.Getenv("AUTH0_MGMT_CLIENT_SECRET"),
		Auth0DBConnection:     getEnv("AUTH0_DB_CONNECTION", "Username-Password-Authentication"),

		// S3 Configuration
		S3Enabled:         s3Enabled,
		S3Bucket:          os.Getenv("S3_BUCKET"),
		S3Region:          getEnv("S3_REGION", "us-east-1"),
		S3AccessKeyID:     os.Getenv("S3_ACCESS_KEY_ID"),
		S3SecretAccessKey: os.Getenv("S3_SECRET_ACCESS_KEY"),
		S3Endpoint:        os.Getenv("S3_ENDPOINT"),
		S3PublicURL:       os.Getenv("S3_PUBLIC_URL"),

		// Jira OAuth Configuration
		JiraClientID:     os.Getenv("JIRA_CLIENT_ID"),
		JiraClientSecret: os.Getenv("JIRA_CLIENT_SECRET"),
		JiraCallbackURL:  getEnv("JIRA_CALLBACK_URL", "http://localhost:3000/api/jira/callback"),
	}

	// Validate required configuration
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate checks that all required configuration is present
func (c *Config) Validate() error {
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if c.Auth0Domain == "" {
		return fmt.Errorf("AUTH0_DOMAIN is required")
	}
	if c.Auth0Audience == "" {
		return fmt.Errorf("AUTH0_AUDIENCE is required")
	}

	// Production-specific validation
	if c.IsProduction() {
		if c.FrontendURL == "http://localhost:3000" {
			return fmt.Errorf("FRONTEND_URL must be set to production URL in production mode")
		}
	}

	// S3 validation
	if c.S3Enabled {
		if c.S3Bucket == "" {
			return fmt.Errorf("S3_BUCKET is required when S3 is enabled")
		}
		if c.S3AccessKeyID == "" {
			return fmt.Errorf("S3_ACCESS_KEY_ID is required when S3 is enabled")
		}
		if c.S3SecretAccessKey == "" {
			return fmt.Errorf("S3_SECRET_ACCESS_KEY is required when S3 is enabled")
		}
	}

	return nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
