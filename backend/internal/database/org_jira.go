package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// OrgJiraRepository handles organization-wide Jira settings
type OrgJiraRepository struct {
	pool *pgxpool.Pool
}

// NewOrgJiraRepository creates a new OrgJiraRepository
func NewOrgJiraRepository(pool *pgxpool.Pool) *OrgJiraRepository {
	return &OrgJiraRepository{pool: pool}
}

// Get returns the organization Jira settings (there's only one)
func (r *OrgJiraRepository) Get(ctx context.Context) (*models.OrgJiraSettings, error) {
	query := `
		SELECT id, oauth_access_token, oauth_refresh_token, oauth_token_expires_at,
			cloud_id, site_url, site_name, configured_by_id, created_at, updated_at
		FROM org_jira_settings
		ORDER BY id DESC
		LIMIT 1
	`

	var settings models.OrgJiraSettings
	err := r.pool.QueryRow(ctx, query).Scan(
		&settings.ID,
		&settings.OAuthAccessToken,
		&settings.OAuthRefreshToken,
		&settings.OAuthTokenExpiresAt,
		&settings.CloudID,
		&settings.SiteURL,
		&settings.SiteName,
		&settings.ConfiguredByID,
		&settings.CreatedAt,
		&settings.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil // No settings configured
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get org jira settings: %w", err)
	}

	return &settings, nil
}

// Save creates or updates the organization Jira settings
func (r *OrgJiraRepository) Save(ctx context.Context, settings *models.OrgJiraSettings) error {
	// Delete any existing settings (we only want one)
	_, err := r.pool.Exec(ctx, "DELETE FROM org_jira_settings")
	if err != nil {
		return fmt.Errorf("failed to clear old settings: %w", err)
	}

	query := `
		INSERT INTO org_jira_settings (
			oauth_access_token, oauth_refresh_token, oauth_token_expires_at,
			cloud_id, site_url, site_name, configured_by_id, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`

	err = r.pool.QueryRow(ctx, query,
		settings.OAuthAccessToken,
		settings.OAuthRefreshToken,
		settings.OAuthTokenExpiresAt,
		settings.CloudID,
		settings.SiteURL,
		settings.SiteName,
		settings.ConfiguredByID,
	).Scan(&settings.ID, &settings.CreatedAt, &settings.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to save org jira settings: %w", err)
	}

	return nil
}

// UpdateTokens updates the OAuth tokens (after refresh)
// Must save the new refresh token since Atlassian uses refresh token rotation
func (r *OrgJiraRepository) UpdateTokens(ctx context.Context, accessToken, refreshToken string, expiresAt time.Time) error {
	query := `
		UPDATE org_jira_settings
		SET oauth_access_token = $1, oauth_refresh_token = $2, oauth_token_expires_at = $3, updated_at = NOW()
	`

	_, err := r.pool.Exec(ctx, query, accessToken, refreshToken, expiresAt)
	if err != nil {
		return fmt.Errorf("failed to update tokens: %w", err)
	}

	return nil
}

// Delete removes the organization Jira settings
func (r *OrgJiraRepository) Delete(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM org_jira_settings")
	if err != nil {
		return fmt.Errorf("failed to delete org jira settings: %w", err)
	}
	return nil
}
