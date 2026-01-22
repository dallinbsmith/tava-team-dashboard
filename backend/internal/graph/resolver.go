package graph

import (
	"github.com/smith-dallin/manager-dashboard/internal/auth0"
	"github.com/smith-dallin/manager-dashboard/internal/database"
	"github.com/smith-dallin/manager-dashboard/internal/logger"
	"github.com/smith-dallin/manager-dashboard/internal/services"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	UserRepo        *database.UserRepository
	SquadRepo       *database.SquadRepository
	OrgJiraRepo     *database.OrgJiraRepository
	Auth0Client     *auth0.ManagementClient
	FrontendURL     string
	EmployeeService *services.EmployeeService
}

func NewResolver(userRepo *database.UserRepository, squadRepo *database.SquadRepository, orgJiraRepo *database.OrgJiraRepository, auth0Client *auth0.ManagementClient, frontendURL string, log *logger.Logger) *Resolver {
	// Create auth0 adapter for EmployeeService
	auth0Adapter := services.NewAuth0ManagementAdapter(auth0Client)

	// Create EmployeeService with proper dependency injection
	employeeService := services.NewEmployeeService(userRepo, squadRepo, orgJiraRepo, auth0Adapter, frontendURL, log)

	return &Resolver{
		UserRepo:        userRepo,
		SquadRepo:       squadRepo,
		OrgJiraRepo:     orgJiraRepo,
		Auth0Client:     auth0Client,
		FrontendURL:     frontendURL,
		EmployeeService: employeeService,
	}
}
