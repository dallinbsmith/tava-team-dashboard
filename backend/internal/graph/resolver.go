package graph

import (
	"github.com/smith-dallin/manager-dashboard/internal/auth0"
	"github.com/smith-dallin/manager-dashboard/internal/database"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	UserRepo    *database.UserRepository
	SquadRepo   *database.SquadRepository
	OrgJiraRepo *database.OrgJiraRepository
	Auth0Client *auth0.ManagementClient
	FrontendURL string
}

func NewResolver(userRepo *database.UserRepository, squadRepo *database.SquadRepository, orgJiraRepo *database.OrgJiraRepository, auth0Client *auth0.ManagementClient, frontendURL string) *Resolver {
	return &Resolver{
		UserRepo:    userRepo,
		SquadRepo:   squadRepo,
		OrgJiraRepo: orgJiraRepo,
		Auth0Client: auth0Client,
		FrontendURL: frontendURL,
	}
}
