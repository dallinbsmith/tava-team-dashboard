package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// DepartmentRepository handles database operations for departments
type DepartmentRepository struct {
	pool *pgxpool.Pool
}

// NewDepartmentRepository creates a new department repository
func NewDepartmentRepository(pool *pgxpool.Pool) *DepartmentRepository {
	return &DepartmentRepository{pool: pool}
}

// GetAll retrieves all departments ordered by name
func (r *DepartmentRepository) GetAll(ctx context.Context) ([]models.Department, error) {
	query := `SELECT id, name, created_at, updated_at FROM departments ORDER BY name`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get departments: %w", err)
	}
	defer rows.Close()

	var departments []models.Department
	for rows.Next() {
		var dept models.Department
		err := rows.Scan(&dept.ID, &dept.Name, &dept.CreatedAt, &dept.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan department: %w", err)
		}
		departments = append(departments, dept)
	}
	return departments, nil
}

// GetAllNames retrieves all department names ordered alphabetically
func (r *DepartmentRepository) GetAllNames(ctx context.Context) ([]string, error) {
	query := `SELECT name FROM departments ORDER BY name`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get department names: %w", err)
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, fmt.Errorf("failed to scan department name: %w", err)
		}
		names = append(names, name)
	}
	return names, nil
}

// GetByID retrieves a department by its ID
func (r *DepartmentRepository) GetByID(ctx context.Context, id int64) (*models.Department, error) {
	query := `SELECT id, name, created_at, updated_at FROM departments WHERE id = $1`
	var dept models.Department
	err := r.pool.QueryRow(ctx, query, id).Scan(&dept.ID, &dept.Name, &dept.CreatedAt, &dept.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get department by ID: %w", err)
	}
	return &dept, nil
}

// GetByName retrieves a department by its name
func (r *DepartmentRepository) GetByName(ctx context.Context, name string) (*models.Department, error) {
	query := `SELECT id, name, created_at, updated_at FROM departments WHERE name = $1`
	var dept models.Department
	err := r.pool.QueryRow(ctx, query, name).Scan(&dept.ID, &dept.Name, &dept.CreatedAt, &dept.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get department by name: %w", err)
	}
	return &dept, nil
}

// Create creates a new department
func (r *DepartmentRepository) Create(ctx context.Context, name string) (*models.Department, error) {
	query := `INSERT INTO departments (name) VALUES ($1) RETURNING id, name, created_at, updated_at`
	var dept models.Department
	err := r.pool.QueryRow(ctx, query, name).Scan(&dept.ID, &dept.Name, &dept.CreatedAt, &dept.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create department: %w", err)
	}
	return &dept, nil
}

// Delete removes a department by name and clears it from all users
func (r *DepartmentRepository) Delete(ctx context.Context, name string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Clear department from all users
	_, err = tx.Exec(ctx, `UPDATE users SET department = '', updated_at = $1 WHERE department = $2`, time.Now(), name)
	if err != nil {
		return fmt.Errorf("failed to clear department from users: %w", err)
	}

	// Delete from departments table
	result, err := tx.Exec(ctx, `DELETE FROM departments WHERE name = $1`, name)
	if err != nil {
		return fmt.Errorf("failed to delete department: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("department not found")
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	return nil
}

// Rename updates the name of a department and updates all users
func (r *DepartmentRepository) Rename(ctx context.Context, oldName, newName string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	now := time.Now()

	// Update department name in departments table
	result, err := tx.Exec(ctx, `UPDATE departments SET name = $1, updated_at = $2 WHERE name = $3`, newName, now, oldName)
	if err != nil {
		return fmt.Errorf("failed to rename department: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("department not found")
	}

	// Update all users with the old department name
	_, err = tx.Exec(ctx, `UPDATE users SET department = $1, updated_at = $2 WHERE department = $3`, newName, now, oldName)
	if err != nil {
		return fmt.Errorf("failed to update users with new department name: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	return nil
}
