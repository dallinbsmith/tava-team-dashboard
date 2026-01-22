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

	// Server Configuration
	RateLimitRPS       float64 // Requests per second for rate limiting
	RateLimitBurst     int     // Burst size for rate limiting
	MaxRequestSizeMB   int     // Maximum request body size in MB
	ReadTimeout        int     // Server read timeout in seconds
	WriteTimeout       int     // Server write timeout in seconds
	IdleTimeout        int     // Server idle timeout in seconds
	ShutdownTimeout    int     // Graceful shutdown timeout in seconds

	// Logging Configuration
	LogLevel  string // debug, info, warn, error
	LogFormat string // json, text

	// Database Pool Configuration
	DBMaxConns             int // Maximum number of connections in pool
	DBMinConns             int // Minimum number of idle connections
	DBMaxConnLifetime      int // Maximum connection lifetime in seconds
	DBMaxConnIdleTime      int // Maximum idle time before closing in seconds
	DBHealthCheckPeriod    int // Health check interval in seconds
	DBSlowQueryThresholdMS int // Threshold in milliseconds for logging slow queries

	// Application Configuration
	AvatarMaxSizeMB      int // Maximum avatar upload size in MB
	InvitationExpiryDays int // Number of days until an invitation expires
	CacheTTLSeconds      int // Default cache TTL in seconds

	// Security Configuration
	JWKSCacheTTLMinutes              int // JWKS cache TTL in minutes
	RateLimiterCleanupIntervalMinutes int // Rate limiter cleanup interval in minutes
	RateLimiterVisitorTimeoutMinutes  int // Rate limiter visitor timeout in minutes
	RateLimiterMaxVisitors           int // Maximum number of tracked visitors

	// OAuth Configuration
	OAuthStateTTLMinutes int // OAuth state store TTL in minutes

	// Jira Configuration
	JiraMaxUsersPagination int // Maximum users to fetch in Jira pagination

	// External Service Timeouts (in seconds)
	ExternalAPITimeoutSecs int // Default timeout for external API calls (Auth0, Jira, etc.)
	EmailTimeoutSecs       int // Timeout for email sending operations
	S3TimeoutSecs          int // Timeout for S3 operations
	GraphQLTimeoutSecs     int // Timeout for GraphQL operations

	// Resend Email Configuration
	ResendAPIKey    string
	ResendFromEmail string
	ResendFromName  string
	ResendEnabled   bool
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

// IsResendEnabled returns true if Resend email service is configured
func (c *Config) IsResendEnabled() bool {
	return c.ResendEnabled && c.ResendAPIKey != ""
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

		// Server Configuration
		RateLimitRPS:     getEnvFloat("RATE_LIMIT_RPS", 100),
		RateLimitBurst:   getEnvInt("RATE_LIMIT_BURST", 200),
		MaxRequestSizeMB: getEnvInt("MAX_REQUEST_SIZE_MB", 10),
		ReadTimeout:      getEnvInt("READ_TIMEOUT_SECS", 30),
		WriteTimeout:     getEnvInt("WRITE_TIMEOUT_SECS", 30),
		IdleTimeout:      getEnvInt("IDLE_TIMEOUT_SECS", 120),
		ShutdownTimeout:  getEnvInt("SHUTDOWN_TIMEOUT_SECS", 30),

		// Logging Configuration
		LogLevel:  getEnv("LOG_LEVEL", "info"),
		LogFormat: getEnv("LOG_FORMAT", "text"),

		// Database Pool Configuration
		DBMaxConns:             getEnvInt("DB_MAX_CONNS", 25),
		DBMinConns:             getEnvInt("DB_MIN_CONNS", 5),
		DBMaxConnLifetime:      getEnvInt("DB_MAX_CONN_LIFETIME_SECS", 3600),  // 1 hour
		DBMaxConnIdleTime:      getEnvInt("DB_MAX_CONN_IDLE_TIME_SECS", 1800), // 30 minutes
		DBHealthCheckPeriod:    getEnvInt("DB_HEALTH_CHECK_PERIOD_SECS", 60),  // 1 minute
		DBSlowQueryThresholdMS: getEnvInt("DB_SLOW_QUERY_THRESHOLD_MS", 100),  // 100ms

		// Application Configuration
		AvatarMaxSizeMB:      getEnvInt("AVATAR_MAX_SIZE_MB", 5),       // 5MB default
		InvitationExpiryDays: getEnvInt("INVITATION_EXPIRY_DAYS", 7),  // 7 days default
		CacheTTLSeconds:      getEnvInt("CACHE_TTL_SECONDS", 300),     // 5 minutes default

		// Security Configuration
		JWKSCacheTTLMinutes:               getEnvInt("JWKS_CACHE_TTL_MINUTES", 5),               // 5 minutes default
		RateLimiterCleanupIntervalMinutes: getEnvInt("RATE_LIMITER_CLEANUP_INTERVAL_MINUTES", 1), // 1 minute default
		RateLimiterVisitorTimeoutMinutes:  getEnvInt("RATE_LIMITER_VISITOR_TIMEOUT_MINUTES", 3),  // 3 minutes default
		RateLimiterMaxVisitors:            getEnvInt("RATE_LIMITER_MAX_VISITORS", 10000),         // 10000 default

		// OAuth Configuration
		OAuthStateTTLMinutes: getEnvInt("OAUTH_STATE_TTL_MINUTES", 10), // 10 minutes default

		// Jira Configuration
		JiraMaxUsersPagination: getEnvInt("JIRA_MAX_USERS_PAGINATION", 1000), // 1000 default

		// External Service Timeouts
		ExternalAPITimeoutSecs: getEnvInt("EXTERNAL_API_TIMEOUT_SECS", 30),  // 30 seconds default
		EmailTimeoutSecs:       getEnvInt("EMAIL_TIMEOUT_SECS", 15),         // 15 seconds default
		S3TimeoutSecs:          getEnvInt("S3_TIMEOUT_SECS", 60),            // 60 seconds default (uploads can be slow)
		GraphQLTimeoutSecs:     getEnvInt("GRAPHQL_TIMEOUT_SECS", 30),       // 30 seconds default

		// Resend Email Configuration
		ResendEnabled:   os.Getenv("RESEND_API_KEY") != "",
		ResendAPIKey:    os.Getenv("RESEND_API_KEY"),
		ResendFromEmail: getEnv("RESEND_FROM_EMAIL", "noreply@example.com"),
		ResendFromName:  getEnv("RESEND_FROM_NAME", "Manager Dashboard"),
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

func getEnvInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := parseInt(value); err == nil {
			return intVal
		}
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatVal, err := parseFloat(value); err == nil {
			return floatVal
		}
	}
	return fallback
}

func parseInt(s string) (int, error) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	return n, err
}

func parseFloat(s string) (float64, error) {
	var f float64
	_, err := fmt.Sscanf(s, "%f", &f)
	return f, err
}
