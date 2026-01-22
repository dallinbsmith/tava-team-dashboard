package oauth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrStateNotFound is returned when the OAuth state is not found
var ErrStateNotFound = errors.New("oauth state not found")

// ErrStateExpired is returned when the OAuth state has expired
var ErrStateExpired = errors.New("oauth state has expired")

// StateStore defines the interface for OAuth state storage
type StateStore interface {
	// Create generates a new state token and associates it with the user
	Create(ctx context.Context, userID int64) (string, error)
	// Validate checks if the state is valid and returns the associated user ID
	// It also deletes the state after successful validation (single-use)
	Validate(ctx context.Context, state string) (int64, error)
	// Cleanup removes expired states
	Cleanup(ctx context.Context) error
}

// MemoryStateStore is an in-memory implementation of StateStore (for development/testing)
type MemoryStateStore struct {
	states map[string]memoryState
	mu     sync.RWMutex
	ttl    time.Duration
}

type memoryState struct {
	userID    int64
	createdAt time.Time
}

// NewMemoryStateStore creates a new in-memory state store
func NewMemoryStateStore(ttl time.Duration) *MemoryStateStore {
	if ttl == 0 {
		ttl = 10 * time.Minute // default 10 minutes
	}
	store := &MemoryStateStore{
		states: make(map[string]memoryState),
		ttl:    ttl,
	}
	// Start background cleanup
	go store.backgroundCleanup()
	return store
}

func (s *MemoryStateStore) Create(ctx context.Context, userID int64) (string, error) {
	state, err := generateState()
	if err != nil {
		return "", err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.states[state] = memoryState{
		userID:    userID,
		createdAt: time.Now(),
	}

	return state, nil
}

func (s *MemoryStateStore) Validate(ctx context.Context, state string) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	ms, ok := s.states[state]
	if !ok {
		return 0, ErrStateNotFound
	}

	// Delete the state (single-use)
	delete(s.states, state)

	// Check if expired
	if time.Since(ms.createdAt) > s.ttl {
		return 0, ErrStateExpired
	}

	return ms.userID, nil
}

func (s *MemoryStateStore) Cleanup(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	for state, ms := range s.states {
		if now.Sub(ms.createdAt) > s.ttl {
			delete(s.states, state)
		}
	}

	return nil
}

func (s *MemoryStateStore) backgroundCleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		_ = s.Cleanup(context.Background())
	}
}

// DatabaseStateStore is a PostgreSQL-backed implementation of StateStore
type DatabaseStateStore struct {
	pool *pgxpool.Pool
	ttl  time.Duration
}

// NewDatabaseStateStore creates a new database-backed state store
func NewDatabaseStateStore(pool *pgxpool.Pool, ttl time.Duration) (*DatabaseStateStore, error) {
	if ttl == 0 {
		ttl = 10 * time.Minute // default 10 minutes
	}

	store := &DatabaseStateStore{
		pool: pool,
		ttl:  ttl,
	}

	// Create the table if it doesn't exist
	if err := store.createTable(context.Background()); err != nil {
		return nil, err
	}

	// Start background cleanup
	go store.backgroundCleanup()

	return store, nil
}

func (s *DatabaseStateStore) createTable(ctx context.Context) error {
	query := `
	CREATE TABLE IF NOT EXISTS oauth_states (
		state VARCHAR(64) PRIMARY KEY,
		user_id BIGINT NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
		expires_at TIMESTAMP WITH TIME ZONE NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
	`
	_, err := s.pool.Exec(ctx, query)
	return err
}

func (s *DatabaseStateStore) Create(ctx context.Context, userID int64) (string, error) {
	state, err := generateState()
	if err != nil {
		return "", err
	}

	expiresAt := time.Now().Add(s.ttl)

	query := `
	INSERT INTO oauth_states (state, user_id, expires_at)
	VALUES ($1, $2, $3)
	`
	_, err = s.pool.Exec(ctx, query, state, userID, expiresAt)
	if err != nil {
		return "", err
	}

	return state, nil
}

func (s *DatabaseStateStore) Validate(ctx context.Context, state string) (int64, error) {
	// Use a transaction to ensure atomicity of read and delete
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var userID int64
	var expiresAt time.Time

	query := `
	SELECT user_id, expires_at FROM oauth_states
	WHERE state = $1
	FOR UPDATE
	`
	err = tx.QueryRow(ctx, query, state).Scan(&userID, &expiresAt)
	if err != nil {
		return 0, ErrStateNotFound
	}

	// Delete the state (single-use)
	_, err = tx.Exec(ctx, `DELETE FROM oauth_states WHERE state = $1`, state)
	if err != nil {
		return 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	// Check if expired
	if time.Now().After(expiresAt) {
		return 0, ErrStateExpired
	}

	return userID, nil
}

func (s *DatabaseStateStore) Cleanup(ctx context.Context) error {
	query := `DELETE FROM oauth_states WHERE expires_at < NOW()`
	_, err := s.pool.Exec(ctx, query)
	return err
}

func (s *DatabaseStateStore) backgroundCleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		_ = s.Cleanup(context.Background())
	}
}

// generateState generates a cryptographically secure random state string
func generateState() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
