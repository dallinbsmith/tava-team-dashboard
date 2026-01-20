package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// SquadRepository handles database operations for squads
type SquadRepository struct {
	pool *pgxpool.Pool
}

// NewSquadRepository creates a new squad repository
func NewSquadRepository(pool *pgxpool.Pool) *SquadRepository {
	return &SquadRepository{pool: pool}
}

// GetAll retrieves all squads ordered by name
func (r *SquadRepository) GetAll(ctx context.Context) ([]models.Squad, error) {
	query := `SELECT id, name, created_at FROM squads ORDER BY name`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get squads: %w", err)
	}
	defer rows.Close()

	var squads []models.Squad
	for rows.Next() {
		var squad models.Squad
		err := rows.Scan(&squad.ID, &squad.Name, &squad.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan squad: %w", err)
		}
		squads = append(squads, squad)
	}
	return squads, nil
}

// GetByID retrieves a squad by its ID
func (r *SquadRepository) GetByID(ctx context.Context, id int64) (*models.Squad, error) {
	query := `SELECT id, name, created_at FROM squads WHERE id = $1`
	var squad models.Squad
	err := r.pool.QueryRow(ctx, query, id).Scan(&squad.ID, &squad.Name, &squad.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get squad by ID: %w", err)
	}
	return &squad, nil
}

// GetByName retrieves a squad by its name
func (r *SquadRepository) GetByName(ctx context.Context, name string) (*models.Squad, error) {
	query := `SELECT id, name, created_at FROM squads WHERE name = $1`
	var squad models.Squad
	err := r.pool.QueryRow(ctx, query, name).Scan(&squad.ID, &squad.Name, &squad.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get squad by name: %w", err)
	}
	return &squad, nil
}

// Create creates a new squad
func (r *SquadRepository) Create(ctx context.Context, name string) (*models.Squad, error) {
	query := `INSERT INTO squads (name) VALUES ($1) RETURNING id, name, created_at`
	var squad models.Squad
	err := r.pool.QueryRow(ctx, query, name).Scan(&squad.ID, &squad.Name, &squad.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create squad: %w", err)
	}
	return &squad, nil
}

// GetByUserID retrieves all squads for a given user
func (r *SquadRepository) GetByUserID(ctx context.Context, userID int64) ([]models.Squad, error) {
	query := `
		SELECT s.id, s.name, s.created_at
		FROM squads s
		JOIN user_squads us ON us.squad_id = s.id
		WHERE us.user_id = $1
		ORDER BY s.name
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get squads for user: %w", err)
	}
	defer rows.Close()

	var squads []models.Squad
	for rows.Next() {
		var squad models.Squad
		err := rows.Scan(&squad.ID, &squad.Name, &squad.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan squad: %w", err)
		}
		squads = append(squads, squad)
	}
	return squads, nil
}

// GetByUserIDs retrieves all squads for multiple users in a single query
// Returns a map of userID -> []Squad
func (r *SquadRepository) GetByUserIDs(ctx context.Context, userIDs []int64) (map[int64][]models.Squad, error) {
	if len(userIDs) == 0 {
		return make(map[int64][]models.Squad), nil
	}

	query := `
		SELECT us.user_id, s.id, s.name, s.created_at
		FROM squads s
		JOIN user_squads us ON us.squad_id = s.id
		WHERE us.user_id = ANY($1)
		ORDER BY us.user_id, s.name
	`
	rows, err := r.pool.Query(ctx, query, userIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to get squads for users: %w", err)
	}
	defer rows.Close()

	result := make(map[int64][]models.Squad)
	for rows.Next() {
		var userID int64
		var squad models.Squad
		err := rows.Scan(&userID, &squad.ID, &squad.Name, &squad.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan squad: %w", err)
		}
		result[userID] = append(result[userID], squad)
	}
	return result, nil
}

// SetUserSquads sets the squads for a user (replaces all existing squad memberships)
func (r *SquadRepository) SetUserSquads(ctx context.Context, userID int64, squadIDs []int64) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := r.setUserSquadsWithExecutor(ctx, tx, userID, squadIDs); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	return nil
}

// SetUserSquadsWithTx sets the squads for a user within an existing transaction
func (r *SquadRepository) SetUserSquadsWithTx(ctx context.Context, tx pgx.Tx, userID int64, squadIDs []int64) error {
	return r.setUserSquadsWithExecutor(ctx, tx, userID, squadIDs)
}

// setUserSquadsWithExecutor is the internal implementation that works with any executor
func (r *SquadRepository) setUserSquadsWithExecutor(ctx context.Context, tx pgx.Tx, userID int64, squadIDs []int64) error {
	// Delete existing squad memberships
	_, err := tx.Exec(ctx, `DELETE FROM user_squads WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("failed to delete existing squad memberships: %w", err)
	}

	// Insert new squad memberships
	if len(squadIDs) > 0 {
		batch := &pgx.Batch{}
		for _, squadID := range squadIDs {
			batch.Queue(`INSERT INTO user_squads (user_id, squad_id) VALUES ($1, $2) ON CONFLICT (user_id, squad_id) DO NOTHING`, userID, squadID)
		}
		br := tx.SendBatch(ctx, batch)
		for i := 0; i < len(squadIDs); i++ {
			_, err := br.Exec()
			if err != nil {
				br.Close()
				return fmt.Errorf("failed to insert squad membership: %w", err)
			}
		}
		br.Close()
	}
	return nil
}

// GetSquadIDsByUserID retrieves squad IDs for a given user
func (r *SquadRepository) GetSquadIDsByUserID(ctx context.Context, userID int64) ([]int64, error) {
	query := `SELECT squad_id FROM user_squads WHERE user_id = $1 ORDER BY squad_id`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get squad IDs for user: %w", err)
	}
	defer rows.Close()

	var squadIDs []int64
	for rows.Next() {
		var squadID int64
		err := rows.Scan(&squadID)
		if err != nil {
			return nil, fmt.Errorf("failed to scan squad ID: %w", err)
		}
		squadIDs = append(squadIDs, squadID)
	}
	return squadIDs, nil
}

// GetSquadsByIDs retrieves squads by their IDs
func (r *SquadRepository) GetSquadsByIDs(ctx context.Context, squadIDs []int64) ([]models.Squad, error) {
	if len(squadIDs) == 0 {
		return []models.Squad{}, nil
	}

	query := `SELECT id, name, created_at FROM squads WHERE id = ANY($1) ORDER BY name`
	rows, err := r.pool.Query(ctx, query, squadIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to get squads by IDs: %w", err)
	}
	defer rows.Close()

	var squads []models.Squad
	for rows.Next() {
		var squad models.Squad
		err := rows.Scan(&squad.ID, &squad.Name, &squad.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan squad: %w", err)
		}
		squads = append(squads, squad)
	}
	return squads, nil
}

// Delete removes a squad by ID (user_squads entries cascade delete automatically)
func (r *SquadRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM squads WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete squad: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("squad not found")
	}
	return nil
}
