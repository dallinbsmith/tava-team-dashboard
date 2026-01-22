package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository"
)

// Column lists for consistent SELECT statements
const (
	draftColumns = `id, name, description, created_by_id, status, published_at, created_at, updated_at`
	// User columns for org tree (squads are loaded separately via SquadRepository)
	orgUserColumns = `id, COALESCE(auth0_id, ''), email, first_name, last_name, role, title, department,
		avatar_url, supervisor_id, date_started, created_at, updated_at`
)

type OrgChartRepository struct {
	pool      *pgxpool.Pool
	squadRepo *SquadRepository
}

func NewOrgChartRepository(pool *pgxpool.Pool, squadRepo *SquadRepository) *OrgChartRepository {
	return &OrgChartRepository{pool: pool, squadRepo: squadRepo}
}

// scanDraft scans a row into an OrgChartDraft struct
func scanDraft(row pgx.Row) (*models.OrgChartDraft, error) {
	var draft models.OrgChartDraft
	err := row.Scan(
		&draft.ID, &draft.Name, &draft.Description, &draft.CreatedByID,
		&draft.Status, &draft.PublishedAt, &draft.CreatedAt, &draft.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &draft, nil
}

// scanDrafts scans multiple rows into a slice of OrgChartDrafts
func scanDrafts(rows pgx.Rows) ([]models.OrgChartDraft, error) {
	var drafts []models.OrgChartDraft
	for rows.Next() {
		var draft models.OrgChartDraft
		err := rows.Scan(
			&draft.ID, &draft.Name, &draft.Description, &draft.CreatedByID,
			&draft.Status, &draft.PublishedAt, &draft.CreatedAt, &draft.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		drafts = append(drafts, draft)
	}
	return drafts, nil
}

// scanOrgUsers scans multiple rows into a slice of Users for org tree operations
// Note: Squads are loaded separately via SquadRepository
func scanOrgUsers(rows pgx.Rows) ([]models.User, error) {
	var users []models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID, &user.Auth0ID, &user.Email, &user.FirstName, &user.LastName,
			&user.Role, &user.Title, &user.Department, &user.AvatarURL, &user.SupervisorID,
			&user.DateStarted, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, nil
}

// CreateDraft creates a new org chart draft
func (r *OrgChartRepository) CreateDraft(ctx context.Context, req *models.CreateDraftRequest, createdByID int64) (*models.OrgChartDraft, error) {
	query := `
		INSERT INTO org_chart_drafts (name, description, created_by_id)
		VALUES ($1, $2, $3)
		RETURNING ` + draftColumns

	draft, err := scanDraft(r.pool.QueryRow(ctx, query, req.Name, req.Description, createdByID))
	if err != nil {
		return nil, fmt.Errorf("failed to create draft: %w", err)
	}
	return draft, nil
}

// GetDraftByID retrieves a draft by ID with its changes
func (r *OrgChartRepository) GetDraftByID(ctx context.Context, id int64) (*models.OrgChartDraft, error) {
	query := `SELECT ` + draftColumns + ` FROM org_chart_drafts WHERE id = $1`

	draft, err := scanDraft(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, fmt.Errorf("failed to get draft by ID: %w", err)
	}

	// Get changes for this draft
	changes, err := r.GetDraftChanges(ctx, id)
	if err != nil {
		return nil, err
	}
	draft.Changes = changes

	return draft, nil
}

// GetDraftsByCreator retrieves all drafts created by a user
func (r *OrgChartRepository) GetDraftsByCreator(ctx context.Context, creatorID int64) ([]models.OrgChartDraft, error) {
	query := `SELECT ` + draftColumns + ` FROM org_chart_drafts WHERE created_by_id = $1 ORDER BY updated_at DESC`

	rows, err := r.pool.Query(ctx, query, creatorID)
	if err != nil {
		return nil, fmt.Errorf("failed to get drafts by creator: %w", err)
	}
	defer rows.Close()

	drafts, err := scanDrafts(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan draft: %w", err)
	}
	return drafts, nil
}

// GetAllDrafts retrieves all drafts (admin only)
func (r *OrgChartRepository) GetAllDrafts(ctx context.Context) ([]models.OrgChartDraft, error) {
	query := `SELECT ` + draftColumns + ` FROM org_chart_drafts ORDER BY updated_at DESC`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get all drafts: %w", err)
	}
	defer rows.Close()

	drafts, err := scanDrafts(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan draft: %w", err)
	}
	return drafts, nil
}

// UpdateDraft updates a draft's name and/or description
func (r *OrgChartRepository) UpdateDraft(ctx context.Context, id int64, req *models.UpdateDraftRequest) (*models.OrgChartDraft, error) {
	query := `
		UPDATE org_chart_drafts SET
			name = COALESCE($2, name),
			description = COALESCE($3, description),
			updated_at = NOW()
		WHERE id = $1 AND status = 'draft'
		RETURNING ` + draftColumns

	draft, err := scanDraft(r.pool.QueryRow(ctx, query, id, req.Name, req.Description))
	if err != nil {
		return nil, fmt.Errorf("failed to update draft: %w", err)
	}
	return draft, nil
}

// DeleteDraft deletes a draft (only if status is 'draft')
func (r *OrgChartRepository) DeleteDraft(ctx context.Context, id int64) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM org_chart_drafts WHERE id = $1 AND status = 'draft'`, id)
	if err != nil {
		return fmt.Errorf("failed to delete draft: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("draft not found or already published")
	}
	return nil
}

// AddOrUpdateChange adds or updates a change in a draft
func (r *OrgChartRepository) AddOrUpdateChange(ctx context.Context, draftID int64, req *models.AddDraftChangeRequest, userRepo repository.UserRepository) (*models.DraftChange, error) {
	// First, get the current user data to store original values
	user, err := userRepo.GetByID(ctx, req.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Get user's current squad IDs
	originalSquadIDs, err := r.squadRepo.GetSquadIDsByUserID(ctx, req.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user squads: %w", err)
	}

	// Upsert the change
	query := `
		INSERT INTO org_chart_draft_changes (
			draft_id, user_id,
			original_supervisor_id, original_department, original_role, original_squad_ids,
			new_supervisor_id, new_department, new_role, new_squad_ids
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (draft_id, user_id) DO UPDATE SET
			new_supervisor_id = COALESCE($7, org_chart_draft_changes.new_supervisor_id),
			new_department = COALESCE($8, org_chart_draft_changes.new_department),
			new_role = COALESCE($9, org_chart_draft_changes.new_role),
			new_squad_ids = COALESCE($10, org_chart_draft_changes.new_squad_ids),
			updated_at = NOW()
		RETURNING id, draft_id, user_id, original_supervisor_id, original_department, original_role, original_squad_ids,
		          new_supervisor_id, new_department, new_role, new_squad_ids, created_at, updated_at
	`

	var change models.DraftChange
	var originalRole, newRole *string
	err = r.pool.QueryRow(ctx, query,
		draftID, req.UserID,
		user.SupervisorID, user.Department, string(user.Role), originalSquadIDs,
		req.NewSupervisorID, req.NewDepartment, roleToString(req.NewRole), req.NewSquadIDs,
	).Scan(
		&change.ID, &change.DraftID, &change.UserID,
		&change.OriginalSupervisorID, &change.OriginalDepartment, &originalRole, &change.OriginalSquadIDs,
		&change.NewSupervisorID, &change.NewDepartment, &newRole, &change.NewSquadIDs,
		&change.CreatedAt, &change.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to add/update change: %w", err)
	}

	// Convert string roles to Role type
	if originalRole != nil {
		r := models.Role(*originalRole)
		change.OriginalRole = &r
	}
	if newRole != nil {
		r := models.Role(*newRole)
		change.NewRole = &r
	}

	change.User = user

	return &change, nil
}

// RemoveChange removes a change from a draft
func (r *OrgChartRepository) RemoveChange(ctx context.Context, draftID int64, userID int64) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM org_chart_draft_changes WHERE draft_id = $1 AND user_id = $2`, draftID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove change: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("change not found")
	}
	return nil
}

// GetDraftChanges retrieves all changes for a draft with user details
func (r *OrgChartRepository) GetDraftChanges(ctx context.Context, draftID int64) ([]models.DraftChange, error) {
	query := `
		SELECT c.id, c.draft_id, c.user_id,
		       c.original_supervisor_id, c.original_department, c.original_role, c.original_squad_ids,
		       c.new_supervisor_id, c.new_department, c.new_role, c.new_squad_ids,
		       c.created_at, c.updated_at,
		       u.id, COALESCE(u.auth0_id, ''), u.email, u.first_name, u.last_name, u.role, u.title,
		       u.department, u.avatar_url, u.supervisor_id, u.date_started,
		       u.created_at, u.updated_at
		FROM org_chart_draft_changes c
		JOIN users u ON c.user_id = u.id
		WHERE c.draft_id = $1
		ORDER BY c.created_at
	`

	rows, err := r.pool.Query(ctx, query, draftID)
	if err != nil {
		return nil, fmt.Errorf("failed to get draft changes: %w", err)
	}
	defer rows.Close()

	var changes []models.DraftChange
	var userIDs []int64
	for rows.Next() {
		var change models.DraftChange
		var user models.User
		var originalRole, newRole *string

		err := rows.Scan(
			&change.ID, &change.DraftID, &change.UserID,
			&change.OriginalSupervisorID, &change.OriginalDepartment, &originalRole, &change.OriginalSquadIDs,
			&change.NewSupervisorID, &change.NewDepartment, &newRole, &change.NewSquadIDs,
			&change.CreatedAt, &change.UpdatedAt,
			&user.ID, &user.Auth0ID, &user.Email, &user.FirstName, &user.LastName,
			&user.Role, &user.Title, &user.Department, &user.AvatarURL, &user.SupervisorID,
			&user.DateStarted, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan change: %w", err)
		}

		if originalRole != nil {
			r := models.Role(*originalRole)
			change.OriginalRole = &r
		}
		if newRole != nil {
			r := models.Role(*newRole)
			change.NewRole = &r
		}

		change.User = &user
		userIDs = append(userIDs, user.ID)
		changes = append(changes, change)
	}

	// Load squads for all users in batch
	if len(userIDs) > 0 {
		squadsMap, err := r.squadRepo.GetByUserIDs(ctx, userIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to load user squads: %w", err)
		}
		for i := range changes {
			if changes[i].User != nil {
				changes[i].User.Squads = squadsMap[changes[i].User.ID]
			}
		}
	}

	return changes, nil
}

// PublishDraft applies all changes and marks the draft as published
func (r *OrgChartRepository) PublishDraft(ctx context.Context, draftID int64) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Verify draft exists and is in draft status
	var status models.DraftStatus
	err = tx.QueryRow(ctx, `SELECT status FROM org_chart_drafts WHERE id = $1 FOR UPDATE`, draftID).Scan(&status)
	if err != nil {
		return fmt.Errorf("draft not found: %w", err)
	}
	if status != models.DraftStatusDraft {
		return fmt.Errorf("draft is not in draft status")
	}

	// Get all changes
	rows, err := tx.Query(ctx, `
		SELECT user_id, new_supervisor_id, new_department, new_role, new_squad_ids
		FROM org_chart_draft_changes WHERE draft_id = $1
	`, draftID)
	if err != nil {
		return fmt.Errorf("failed to get changes: %w", err)
	}

	type changeData struct {
		userID          int64
		newSupervisorID *int64
		newDepartment   *string
		newRole         *string
		newSquadIDs     []int64
	}
	var changesToApply []changeData

	for rows.Next() {
		var c changeData
		if err := rows.Scan(&c.userID, &c.newSupervisorID, &c.newDepartment, &c.newRole, &c.newSquadIDs); err != nil {
			rows.Close()
			return fmt.Errorf("failed to scan change: %w", err)
		}
		changesToApply = append(changesToApply, c)
	}
	rows.Close()

	// Apply each change to the users table
	for _, c := range changesToApply {
		_, err = tx.Exec(ctx, `
			UPDATE users SET
				supervisor_id = COALESCE($2, supervisor_id),
				department = COALESCE($3, department),
				role = COALESCE($4, role),
				updated_at = NOW()
			WHERE id = $1
		`, c.userID, c.newSupervisorID, c.newDepartment, c.newRole)
		if err != nil {
			return fmt.Errorf("failed to apply change for user %d: %w", c.userID, err)
		}

		// Apply squad changes within the same transaction
		if c.newSquadIDs != nil {
			if err := r.squadRepo.SetUserSquadsWithTx(ctx, tx, c.userID, c.newSquadIDs); err != nil {
				return fmt.Errorf("failed to apply squad change for user %d: %w", c.userID, err)
			}
		}
	}

	// Mark draft as published
	_, err = tx.Exec(ctx, `
		UPDATE org_chart_drafts SET
			status = 'published',
			published_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
	`, draftID)
	if err != nil {
		return fmt.Errorf("failed to mark draft as published: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetOrgTree builds the organization tree for a supervisor
// Uses a single recursive CTE query to fetch all descendants, then builds tree in memory
func (r *OrgChartRepository) GetOrgTree(ctx context.Context, supervisorID int64) (*models.OrgTreeNode, error) {
	// Use recursive CTE to fetch all descendants in ONE query
	query := `
		WITH RECURSIVE org_tree AS (
			-- Base case: the root supervisor
			SELECT ` + orgUserColumns + `, 0 as depth
			FROM users
			WHERE id = $1

			UNION ALL

			-- Recursive case: all descendants
			SELECT ` + orgUserColumns + `, ot.depth + 1
			FROM users u
			INNER JOIN org_tree ot ON u.supervisor_id = ot.id
		)
		SELECT ` + orgUserColumns + `
		FROM org_tree
		ORDER BY depth, last_name, first_name
	`

	rows, err := r.pool.Query(ctx, query, supervisorID)
	if err != nil {
		return nil, fmt.Errorf("failed to get org tree: %w", err)
	}
	defer rows.Close()

	users, err := scanOrgUsers(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan users: %w", err)
	}

	if len(users) == 0 {
		return nil, fmt.Errorf("supervisor not found")
	}

	// Build tree in memory from flat list
	tree := r.buildTreeFromUsers(users)
	if tree == nil {
		return nil, fmt.Errorf("failed to build tree")
	}

	// Load squads for all users in the tree
	if err := r.loadSquadsForTree(ctx, tree); err != nil {
		return nil, err
	}

	return tree, nil
}

// GetFullOrgTree builds the full organization tree starting from top-level users (admin only)
// Uses a single query to fetch ALL users, then builds multiple trees in memory
func (r *OrgChartRepository) GetFullOrgTree(ctx context.Context) ([]models.OrgTreeNode, error) {
	// Fetch ALL active users in ONE query, ordered for consistent tree building
	query := `SELECT ` + orgUserColumns + ` FROM users WHERE is_active = true ORDER BY supervisor_id NULLS FIRST, last_name, first_name`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get all users: %w", err)
	}
	defer rows.Close()

	users, err := scanOrgUsers(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan users: %w", err)
	}

	if len(users) == 0 {
		return []models.OrgTreeNode{}, nil
	}

	// Build multiple trees in memory from flat list
	trees := r.buildTreesFromUsers(users)

	// Load squads for all users in all trees
	if err := r.loadSquadsForTrees(ctx, trees); err != nil {
		return nil, err
	}

	return trees, nil
}

// buildTreeFromUsers builds a single tree from a flat list of users (first user is root)
// This eliminates N+1 queries by building the tree structure in memory
func (r *OrgChartRepository) buildTreeFromUsers(users []models.User) *models.OrgTreeNode {
	if len(users) == 0 {
		return nil
	}

	// Create a map of user ID -> tree node pointer for O(1) lookup
	nodeMap := make(map[int64]*models.OrgTreeNode)

	// First pass: create all nodes
	for i := range users {
		nodeMap[users[i].ID] = &models.OrgTreeNode{
			User:     users[i],
			Children: []models.OrgTreeNode{},
		}
	}

	// The first user is the root (based on CTE ordering)
	root := nodeMap[users[0].ID]

	// Second pass: build parent-child relationships
	for i := range users {
		if users[i].SupervisorID != nil {
			parentID := *users[i].SupervisorID
			if parent, exists := nodeMap[parentID]; exists {
				child := nodeMap[users[i].ID]
				parent.Children = append(parent.Children, *child)
			}
		}
	}

	return root
}

// buildTreesFromUsers builds multiple trees from a flat list of all users
// Users with supervisor_id = NULL become root nodes of separate trees
// This eliminates N+1 queries by building all tree structures in memory
func (r *OrgChartRepository) buildTreesFromUsers(users []models.User) []models.OrgTreeNode {
	if len(users) == 0 {
		return []models.OrgTreeNode{}
	}

	// Create a map of user ID -> tree node pointer for O(1) lookup
	nodeMap := make(map[int64]*models.OrgTreeNode)

	// First pass: create all nodes
	for i := range users {
		nodeMap[users[i].ID] = &models.OrgTreeNode{
			User:     users[i],
			Children: []models.OrgTreeNode{},
		}
	}

	// Track root nodes (users with no supervisor)
	var roots []*models.OrgTreeNode

	// Second pass: build parent-child relationships and identify roots
	for i := range users {
		node := nodeMap[users[i].ID]
		if users[i].SupervisorID == nil {
			// This is a root node
			roots = append(roots, node)
		} else {
			// Attach to parent
			parentID := *users[i].SupervisorID
			if parent, exists := nodeMap[parentID]; exists {
				parent.Children = append(parent.Children, *node)
			} else {
				// Parent not found (orphan) - treat as root
				roots = append(roots, node)
			}
		}
	}

	// Convert to value slice for return
	trees := make([]models.OrgTreeNode, len(roots))
	for i, root := range roots {
		trees[i] = *root
	}

	return trees
}

// loadSquadsForTree loads squads for all users in the tree
func (r *OrgChartRepository) loadSquadsForTree(ctx context.Context, tree *models.OrgTreeNode) error {
	// Collect all user IDs from the tree
	var userIDs []int64
	collectUserIDs(tree, &userIDs)

	if len(userIDs) == 0 {
		return nil
	}

	// Batch load all squads
	squadsMap, err := r.squadRepo.GetByUserIDs(ctx, userIDs)
	if err != nil {
		return fmt.Errorf("failed to load squads for tree: %w", err)
	}

	// Assign squads to each user in the tree
	assignSquadsToTree(tree, squadsMap)

	return nil
}

// loadSquadsForTrees loads squads for all users in multiple trees
func (r *OrgChartRepository) loadSquadsForTrees(ctx context.Context, trees []models.OrgTreeNode) error {
	// Collect all user IDs from all trees
	var userIDs []int64
	for i := range trees {
		collectUserIDs(&trees[i], &userIDs)
	}

	if len(userIDs) == 0 {
		return nil
	}

	// Batch load all squads
	squadsMap, err := r.squadRepo.GetByUserIDs(ctx, userIDs)
	if err != nil {
		return fmt.Errorf("failed to load squads for trees: %w", err)
	}

	// Assign squads to each user in all trees
	for i := range trees {
		assignSquadsToTree(&trees[i], squadsMap)
	}

	return nil
}

// collectUserIDs recursively collects all user IDs from a tree node
func collectUserIDs(node *models.OrgTreeNode, userIDs *[]int64) {
	*userIDs = append(*userIDs, node.User.ID)
	for i := range node.Children {
		collectUserIDs(&node.Children[i], userIDs)
	}
}

// assignSquadsToTree recursively assigns squads to users in the tree
func assignSquadsToTree(node *models.OrgTreeNode, squadsMap map[int64][]models.Squad) {
	node.User.Squads = squadsMap[node.User.ID]
	for i := range node.Children {
		assignSquadsToTree(&node.Children[i], squadsMap)
	}
}

// Helper function to convert Role pointer to string pointer
func roleToString(r *models.Role) *string {
	if r == nil {
		return nil
	}
	s := string(*r)
	return &s
}
