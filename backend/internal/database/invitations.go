package database

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// Column lists for consistent SELECT statements
const (
	invitationColumns = `id, email, role, department, squad_ids, token, invited_by_id, status, expires_at, accepted_at, created_at, updated_at`
	// User columns for JOIN queries (prefixed with table alias)
	invUserColumns = `u.id, COALESCE(u.auth0_id, ''), u.email, u.first_name, u.last_name, u.role, u.title,
		u.department, u.avatar_url, u.supervisor_id, u.date_started, u.created_at, u.updated_at`
)

type InvitationRepository struct {
	pool       *pgxpool.Pool
	expiryDays int
}

// NewInvitationRepository creates a new invitation repository
// expiryDays specifies how many days until an invitation expires (default: 7)
func NewInvitationRepository(pool *pgxpool.Pool) *InvitationRepository {
	return &InvitationRepository{pool: pool, expiryDays: 7}
}

// NewInvitationRepositoryWithConfig creates a new invitation repository with custom expiry
func NewInvitationRepositoryWithConfig(pool *pgxpool.Pool, expiryDays int) *InvitationRepository {
	if expiryDays <= 0 {
		expiryDays = 7
	}
	return &InvitationRepository{pool: pool, expiryDays: expiryDays}
}

// scanInvitation scans a row into an Invitation struct
func scanInvitation(row pgx.Row) (*models.Invitation, error) {
	var inv models.Invitation
	var department *string
	err := row.Scan(
		&inv.ID, &inv.Email, &inv.Role, &department, &inv.SquadIDs, &inv.Token, &inv.InvitedByID,
		&inv.Status, &inv.ExpiresAt, &inv.AcceptedAt, &inv.CreatedAt, &inv.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if department != nil {
		inv.Department = *department
	}
	return &inv, nil
}

// generateToken creates a secure random token for invitations
func generateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// Create creates a new invitation
func (r *InvitationRepository) Create(ctx context.Context, req *models.CreateInvitationRequest, invitedByID int64) (*models.Invitation, error) {
	token, err := generateToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Use configurable expiry days
	expiresAt := time.Now().Add(time.Duration(r.expiryDays) * 24 * time.Hour)

	// Handle optional department
	var department *string
	if req.Department != "" {
		department = &req.Department
	}

	query := `
		INSERT INTO invitations (email, role, department, squad_ids, token, invited_by_id, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING ` + invitationColumns

	inv, err := scanInvitation(r.pool.QueryRow(ctx, query, req.Email, req.Role, department, req.SquadIDs, token, invitedByID, expiresAt))
	if err != nil {
		return nil, fmt.Errorf("failed to create invitation: %w", err)
	}

	return inv, nil
}

// GetByID retrieves an invitation by ID
func (r *InvitationRepository) GetByID(ctx context.Context, id int64) (*models.Invitation, error) {
	query := `SELECT ` + invitationColumns + ` FROM invitations WHERE id = $1`
	inv, err := scanInvitation(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, fmt.Errorf("failed to get invitation by ID: %w", err)
	}
	return inv, nil
}

// GetByToken retrieves an invitation by token
func (r *InvitationRepository) GetByToken(ctx context.Context, token string) (*models.Invitation, error) {
	query := `SELECT ` + invitationColumns + ` FROM invitations WHERE token = $1`
	inv, err := scanInvitation(r.pool.QueryRow(ctx, query, token))
	if err != nil {
		return nil, fmt.Errorf("failed to get invitation by token: %w", err)
	}
	return inv, nil
}

// GetByEmail retrieves pending invitations for an email
func (r *InvitationRepository) GetByEmail(ctx context.Context, email string) (*models.Invitation, error) {
	query := `SELECT ` + invitationColumns + ` FROM invitations
		WHERE email = $1 AND status = 'pending' AND expires_at > NOW()
		ORDER BY created_at DESC LIMIT 1`
	inv, err := scanInvitation(r.pool.QueryRow(ctx, query, email))
	if err != nil {
		return nil, fmt.Errorf("failed to get invitation by email: %w", err)
	}
	return inv, nil
}

// GetAll retrieves all invitations (for admin view)
func (r *InvitationRepository) GetAll(ctx context.Context) ([]models.Invitation, error) {
	query := `
		SELECT i.id, i.email, i.role, i.department, i.squad_ids, i.token, i.invited_by_id, i.status,
		       i.expires_at, i.accepted_at, i.created_at, i.updated_at,
		       ` + invUserColumns + `
		FROM invitations i
		JOIN users u ON i.invited_by_id = u.id
		ORDER BY i.created_at DESC`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get all invitations: %w", err)
	}
	defer rows.Close()

	var invitations []models.Invitation
	for rows.Next() {
		var inv models.Invitation
		var invitedBy models.User
		var department *string
		err := rows.Scan(
			&inv.ID, &inv.Email, &inv.Role, &department, &inv.SquadIDs, &inv.Token, &inv.InvitedByID,
			&inv.Status, &inv.ExpiresAt, &inv.AcceptedAt, &inv.CreatedAt, &inv.UpdatedAt,
			&invitedBy.ID, &invitedBy.Auth0ID, &invitedBy.Email, &invitedBy.FirstName,
			&invitedBy.LastName, &invitedBy.Role, &invitedBy.Title, &invitedBy.Department,
			&invitedBy.AvatarURL, &invitedBy.SupervisorID, &invitedBy.DateStarted,
			&invitedBy.CreatedAt, &invitedBy.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan invitation: %w", err)
		}
		if department != nil {
			inv.Department = *department
		}
		inv.InvitedBy = &invitedBy
		// Clear token from list view for security
		inv.Token = ""
		invitations = append(invitations, inv)
	}

	return invitations, nil
}

// Accept marks an invitation as accepted and creates the user
func (r *InvitationRepository) Accept(ctx context.Context, token string, auth0ID string, firstName string, lastName string) (*models.User, error) {
	// Start transaction
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Get and validate the invitation (including department and squad_ids)
	var inv models.Invitation
	var department *string
	invQuery := `SELECT id, email, role, department, squad_ids, status, expires_at FROM invitations WHERE token = $1 FOR UPDATE`
	err = tx.QueryRow(ctx, invQuery, token).Scan(
		&inv.ID, &inv.Email, &inv.Role, &department, &inv.SquadIDs, &inv.Status, &inv.ExpiresAt,
	)
	if err != nil {
		return nil, fmt.Errorf("invitation not found: %w", err)
	}
	if department != nil {
		inv.Department = *department
	}

	// Validate invitation status
	if inv.Status != models.InvitationStatusPending {
		return nil, fmt.Errorf("invitation is no longer valid (status: %s)", inv.Status)
	}
	if time.Now().After(inv.ExpiresAt) {
		// Mark as expired
		_, _ = tx.Exec(ctx, `UPDATE invitations SET status = 'expired', updated_at = NOW() WHERE id = $1`, inv.ID)
		return nil, fmt.Errorf("invitation has expired")
	}

	// Create the user with the invited role and department
	userQuery := `
		INSERT INTO users (auth0_id, email, first_name, last_name, role, title, department, date_started)
		VALUES ($1, $2, $3, $4, $5, '', $6, NOW())
		ON CONFLICT (auth0_id) DO UPDATE SET
			role = EXCLUDED.role,
			department = EXCLUDED.department,
			updated_at = NOW()
		RETURNING id, COALESCE(auth0_id, ''), email, first_name, last_name, role, title, department,
				  avatar_url, supervisor_id, date_started, created_at, updated_at`
	var user models.User
	err = tx.QueryRow(ctx, userQuery, auth0ID, inv.Email, firstName, lastName, inv.Role, inv.Department).Scan(
		&user.ID, &user.Auth0ID, &user.Email, &user.FirstName, &user.LastName,
		&user.Role, &user.Title, &user.Department, &user.AvatarURL, &user.SupervisorID,
		&user.DateStarted, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create user from invitation: %w", err)
	}

	// Assign squads if any were specified in the invitation
	if len(inv.SquadIDs) > 0 {
		for _, squadID := range inv.SquadIDs {
			_, err = tx.Exec(ctx, `
				INSERT INTO user_squads (user_id, squad_id)
				VALUES ($1, $2)
				ON CONFLICT (user_id, squad_id) DO NOTHING
			`, user.ID, squadID)
			if err != nil {
				return nil, fmt.Errorf("failed to assign squad to user: %w", err)
			}
		}
	}

	// Mark invitation as accepted
	_, err = tx.Exec(ctx, `UPDATE invitations SET status = 'accepted', accepted_at = NOW(), updated_at = NOW() WHERE id = $1`, inv.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to mark invitation as accepted: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &user, nil
}

// Revoke revokes an invitation
func (r *InvitationRepository) Revoke(ctx context.Context, id int64) error {
	query := `
		UPDATE invitations SET status = 'revoked', updated_at = NOW()
		WHERE id = $1 AND status = 'pending'
	`
	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to revoke invitation: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("invitation not found or already processed")
	}
	return nil
}

// ExpirePending marks all expired pending invitations as expired
func (r *InvitationRepository) ExpirePending(ctx context.Context) error {
	query := `
		UPDATE invitations SET status = 'expired', updated_at = NOW()
		WHERE status = 'pending' AND expires_at < NOW()
	`
	_, err := r.pool.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to expire pending invitations: %w", err)
	}
	return nil
}
