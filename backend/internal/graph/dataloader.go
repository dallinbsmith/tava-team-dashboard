package graph

import (
	"context"
	"fmt"
	"time"

	"github.com/graph-gophers/dataloader/v7"
	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository"
)

// Loaders holds all dataloaders for the GraphQL resolvers
type Loaders struct {
	// SupervisorLoader batches supervisor lookups by ID
	SupervisorLoader *dataloader.Loader[int64, *models.User]
}

// loaderContextKey is the context key for storing loaders
type loaderContextKey struct{}

// NewLoaders creates a new set of dataloaders
func NewLoaders(userRepo repository.UserRepository) *Loaders {
	return &Loaders{
		SupervisorLoader: dataloader.NewBatchedLoader(
			newSupervisorBatchFunc(userRepo),
			dataloader.WithWait[int64, *models.User](2*time.Millisecond),
			dataloader.WithBatchCapacity[int64, *models.User](100),
		),
	}
}

// ContextWithLoaders adds loaders to context
func ContextWithLoaders(ctx context.Context, loaders *Loaders) context.Context {
	return context.WithValue(ctx, loaderContextKey{}, loaders)
}

// LoadersFromContext retrieves loaders from context
func LoadersFromContext(ctx context.Context) *Loaders {
	loaders, ok := ctx.Value(loaderContextKey{}).(*Loaders)
	if !ok {
		return nil
	}
	return loaders
}

// newSupervisorBatchFunc returns a batch function for loading supervisors
func newSupervisorBatchFunc(userRepo repository.UserRepository) dataloader.BatchFunc[int64, *models.User] {
	return func(ctx context.Context, keys []int64) []*dataloader.Result[*models.User] {
		// Batch load all supervisors in a single query
		users, err := userRepo.GetByIDs(ctx, keys)

		// Create results map for O(1) lookup
		userMap := make(map[int64]*models.User)
		if err == nil {
			for i := range users {
				userMap[users[i].ID] = &users[i]
			}
		}

		// Return results in the same order as keys
		results := make([]*dataloader.Result[*models.User], len(keys))
		for i, key := range keys {
			if err != nil {
				results[i] = &dataloader.Result[*models.User]{Error: err}
			} else if user, ok := userMap[key]; ok {
				results[i] = &dataloader.Result[*models.User]{Data: user}
			} else {
				results[i] = &dataloader.Result[*models.User]{
					Error: fmt.Errorf("supervisor not found: %d", key),
				}
			}
		}

		return results
	}
}

// GetSupervisor loads a supervisor using the dataloader, falling back to direct query if loaders not in context
func GetSupervisor(ctx context.Context, userRepo repository.UserRepository, supervisorID int64) (*models.User, error) {
	loaders := LoadersFromContext(ctx)
	if loaders != nil && loaders.SupervisorLoader != nil {
		// Use dataloader for batched loading
		thunk := loaders.SupervisorLoader.Load(ctx, supervisorID)
		return thunk()
	}

	// Fallback to direct query if loaders not available
	return userRepo.GetByID(ctx, supervisorID)
}
