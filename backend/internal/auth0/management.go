package auth0

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/smith-dallin/manager-dashboard/config"
)

// ManagementClient provides methods to interact with Auth0 Management API
type ManagementClient struct {
	domain       string
	clientID     string
	clientSecret string
	dbConnection string
	httpClient   *http.Client

	// Token caching
	tokenMu     sync.RWMutex
	accessToken string
	tokenExpiry time.Time
}

// CreateUserRequest represents the request to create a user in Auth0
type CreateUserRequest struct {
	Email         string `json:"email"`
	Password      string `json:"password"`
	Connection    string `json:"connection"`
	EmailVerified bool   `json:"email_verified"`
	GivenName     string `json:"given_name,omitempty"`
	FamilyName    string `json:"family_name,omitempty"`
	Name          string `json:"name,omitempty"`
}

// CreateUserResponse represents the response from Auth0 after creating a user
type CreateUserResponse struct {
	UserID        string    `json:"user_id"`
	Email         string    `json:"email"`
	EmailVerified bool      `json:"email_verified"`
	GivenName     string    `json:"given_name"`
	FamilyName    string    `json:"family_name"`
	Name          string    `json:"name"`
	CreatedAt     time.Time `json:"created_at"`
}

// PasswordChangeTicketRequest represents the request to create a password change ticket
type PasswordChangeTicketRequest struct {
	UserID             string `json:"user_id,omitempty"`
	Email              string `json:"email,omitempty"`
	ConnectionID       string `json:"connection_id,omitempty"`
	ResultURL          string `json:"result_url,omitempty"`
	TTLSec             int    `json:"ttl_sec,omitempty"`
	MarkEmailVerified  bool   `json:"mark_email_as_verified,omitempty"`
	IncludeEmailVerify bool   `json:"includeEmailInRedirect,omitempty"`
}

// PasswordChangeTicketResponse represents the response with the password change ticket URL
type PasswordChangeTicketResponse struct {
	Ticket string `json:"ticket"`
}

// TokenResponse represents the OAuth token response from Auth0
type tokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// NewManagementClient creates a new Auth0 Management API client
func NewManagementClient(cfg *config.Config) *ManagementClient {
	return &ManagementClient{
		domain:       cfg.Auth0Domain,
		clientID:     cfg.Auth0MgmtClientID,
		clientSecret: cfg.Auth0MgmtClientSecret,
		dbConnection: cfg.Auth0DBConnection,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// getAccessToken gets a cached token or fetches a new one
func (c *ManagementClient) getAccessToken(ctx context.Context) (string, error) {
	c.tokenMu.RLock()
	if c.accessToken != "" && time.Now().Before(c.tokenExpiry) {
		token := c.accessToken
		c.tokenMu.RUnlock()
		return token, nil
	}
	c.tokenMu.RUnlock()

	// Need to fetch a new token
	c.tokenMu.Lock()
	defer c.tokenMu.Unlock()

	// Double-check after acquiring write lock
	if c.accessToken != "" && time.Now().Before(c.tokenExpiry) {
		return c.accessToken, nil
	}

	token, expiresIn, err := c.fetchAccessToken(ctx)
	if err != nil {
		return "", err
	}

	c.accessToken = token
	// Set expiry with 1-minute buffer
	c.tokenExpiry = time.Now().Add(time.Duration(expiresIn-60) * time.Second)

	return token, nil
}

// fetchAccessToken fetches a new access token from Auth0
func (c *ManagementClient) fetchAccessToken(ctx context.Context) (string, int, error) {
	url := fmt.Sprintf("https://%s/oauth/token", c.domain)

	payload := map[string]string{
		"grant_type":    "client_credentials",
		"client_id":     c.clientID,
		"client_secret": c.clientSecret,
		"audience":      fmt.Sprintf("https://%s/api/v2/", c.domain),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", 0, fmt.Errorf("failed to marshal token request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", 0, fmt.Errorf("failed to create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("failed to fetch access token: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return "", 0, fmt.Errorf("failed to fetch access token: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	var tokenResp tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", 0, fmt.Errorf("failed to decode token response: %w", err)
	}

	return tokenResp.AccessToken, tokenResp.ExpiresIn, nil
}

// CreateUser creates a new user in Auth0
func (c *ManagementClient) CreateUser(ctx context.Context, email, firstName, lastName, password string) (*CreateUserResponse, error) {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}

	url := fmt.Sprintf("https://%s/api/v2/users", c.domain)

	name := firstName
	if lastName != "" {
		name = firstName + " " + lastName
	}

	createReq := CreateUserRequest{
		Email:         email,
		Password:      password,
		Connection:    c.dbConnection,
		EmailVerified: false, // User should verify their email
		GivenName:     firstName,
		FamilyName:    lastName,
		Name:          name,
	}

	body, err := json.Marshal(createReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal create user request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("failed to create user: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	var createResp CreateUserResponse
	if err := json.Unmarshal(respBody, &createResp); err != nil {
		return nil, fmt.Errorf("failed to decode create user response: %w", err)
	}

	return &createResp, nil
}

// CreatePasswordChangeTicket creates a password change ticket for a user
// This can be used to send a password reset email to the new user
func (c *ManagementClient) CreatePasswordChangeTicket(ctx context.Context, userID, resultURL string, ttlSeconds int) (*PasswordChangeTicketResponse, error) {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}

	url := fmt.Sprintf("https://%s/api/v2/tickets/password-change", c.domain)

	ticketReq := PasswordChangeTicketRequest{
		UserID:            userID,
		ResultURL:         resultURL,
		TTLSec:            ttlSeconds,
		MarkEmailVerified: true, // Mark email as verified when they set password
	}

	body, err := json.Marshal(ticketReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal ticket request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to create password change ticket: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("failed to create password change ticket: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	var ticketResp PasswordChangeTicketResponse
	if err := json.Unmarshal(respBody, &ticketResp); err != nil {
		return nil, fmt.Errorf("failed to decode ticket response: %w", err)
	}

	return &ticketResp, nil
}

// DeleteUser deletes a user from Auth0
func (c *ManagementClient) DeleteUser(ctx context.Context, userID string) error {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return fmt.Errorf("failed to get access token: %w", err)
	}

	url := fmt.Sprintf("https://%s/api/v2/users/%s", c.domain, userID)

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to delete user: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// GenerateSecurePassword generates a cryptographically secure random password
func GenerateSecurePassword(length int) (string, error) {
	if length < 12 {
		length = 12
	}

	// Generate random bytes
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	// Encode to base64 and trim to desired length
	password := base64.URLEncoding.EncodeToString(bytes)[:length]

	// Ensure password meets Auth0 requirements by adding required character types
	// Auth0 default password policy requires: lowercase, uppercase, number, special char
	specialChars := "!@#$%^&*"
	password = password[:length-4] + "Aa1" + string(specialChars[bytes[0]%byte(len(specialChars))])

	return password, nil
}
