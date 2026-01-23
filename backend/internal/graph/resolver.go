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

func NewResolver(userRepo *database.UserRepository, squadRepo *database.SquadRepository, orgJiraRepo *database.OrgJiraRepository, auth0Client *auth0.ManagementClient, emailService *services.EmailService, frontendURL string, log *logger.Logger) *Resolver {
	// Create auth0 adapter for EmployeeService
	// Important: Only create the adapter if auth0Client is not nil to avoid
	// the Go nil interface issue where a nil pointer stored in an interface
	// makes the interface non-nil
	var auth0Adapter services.Auth0Client
	if auth0Client != nil {
		auth0Adapter = services.NewAuth0ManagementAdapter(auth0Client)
	}

	// Create EmployeeService with proper dependency injection
	employeeService := services.NewEmployeeService(userRepo, squadRepo, orgJiraRepo, auth0Adapter, emailService, frontendURL, log)

	return &Resolver{
		UserRepo:        userRepo,
		SquadRepo:       squadRepo,
		OrgJiraRepo:     orgJiraRepo,
		Auth0Client:     auth0Client,
		FrontendURL:     frontendURL,
		EmployeeService: employeeService,
	}
}
