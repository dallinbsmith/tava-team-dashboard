package app

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	httpSwagger "github.com/swaggo/http-swagger"
	"github.com/smith-dallin/manager-dashboard/config"
	"github.com/smith-dallin/manager-dashboard/internal/auth0"
	"github.com/smith-dallin/manager-dashboard/internal/database"
	"github.com/smith-dallin/manager-dashboard/internal/graph"
	"github.com/smith-dallin/manager-dashboard/internal/handlers"
	"github.com/smith-dallin/manager-dashboard/internal/jira"
	"github.com/smith-dallin/manager-dashboard/internal/logger"
	"github.com/smith-dallin/manager-dashboard/internal/middleware"
	"github.com/smith-dallin/manager-dashboard/internal/oauth"
	"github.com/smith-dallin/manager-dashboard/internal/services"
	"github.com/smith-dallin/manager-dashboard/internal/storage"
	"golang.org/x/time/rate"
)

// App encapsulates all application dependencies and provides methods to run and shut down the server
type App struct {
	Config *config.Config
	Logger *logger.Logger
	DB     *pgxpool.Pool
	Router chi.Router
	Server *http.Server

	// Repositories
	userRepo       *database.UserRepository
	squadRepo      *database.SquadRepository
	invitationRepo *database.InvitationRepository
	orgJiraRepo    *database.OrgJiraRepository
	orgChartRepo   *database.OrgChartRepository
	timeOffRepo    *database.TimeOffRepository
	taskRepo       *database.TaskRepository
	meetingRepo    *database.MeetingRepository

	// Handlers
	handlers           *handlers.Handlers
	avatarHandlers     *handlers.AvatarHandlers
	invitationHandlers *handlers.InvitationHandlers
	jiraHandlers       *handlers.JiraHandlers
	orgChartHandlers   *handlers.OrgChartHandlers
	timeOffHandlers    *handlers.TimeOffHandlers
	calendarHandlers   *handlers.CalendarHandlers

	// Services
	avatarService      *services.AvatarService
	calendarBFFService *services.CalendarBFFService
	emailService       *services.EmailService
	jiraOAuthService   *jira.OAuthService
	oauthStateStore    oauth.StateStore

	// Auth
	authMiddleware *middleware.AuthMiddleware
	auth0Client    *auth0.ManagementClient

	// GraphQL
	graphServer *handler.Server

	// Metrics
	metrics *middleware.Metrics
}

// New creates a new App with all dependencies initialized
func New(cfg *config.Config, log *logger.Logger) (*App, error) {
	app := &App{
		Config: cfg,
		Logger: log,
	}

	if err := app.initDatabase(); err != nil {
		return nil, err
	}

	if err := app.initRepositories(); err != nil {
		return nil, err
	}

	if err := app.initServices(); err != nil {
		return nil, err
	}

	if err := app.initAuth(); err != nil {
		return nil, err
	}

	if err := app.initHandlers(); err != nil {
		return nil, err
	}

	if err := app.initGraphQL(); err != nil {
		return nil, err
	}

	app.initRouter()
	app.initServer()

	return app, nil
}

func (a *App) initDatabase() error {
	// Run migrations first (before creating the connection pool)
	if err := database.RunMigrations(a.Config.DatabaseURL); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Create query tracer for slow query logging
	slowThreshold := time.Duration(a.Config.DBSlowQueryThresholdMS) * time.Millisecond
	tracer := database.NewQueryTracer(a.Logger, slowThreshold)

	// Create pool configuration from app config
	poolCfg := &database.PoolConfig{
		MaxConns:          int32(a.Config.DBMaxConns),
		MinConns:          int32(a.Config.DBMinConns),
		MaxConnLifetime:   time.Duration(a.Config.DBMaxConnLifetime) * time.Second,
		MaxConnIdleTime:   time.Duration(a.Config.DBMaxConnIdleTime) * time.Second,
		HealthCheckPeriod: time.Duration(a.Config.DBHealthCheckPeriod) * time.Second,
		Tracer:            tracer,
	}

	pool, err := database.Connect(a.Config.DatabaseURL, poolCfg)
	if err != nil {
		return err
	}
	a.DB = pool

	return nil
}

func (a *App) initRepositories() error {
	a.userRepo = database.NewUserRepository(a.DB)
	a.squadRepo = database.NewSquadRepository(a.DB)
	a.invitationRepo = database.NewInvitationRepositoryWithConfig(a.DB, a.Config.InvitationExpiryDays)
	a.orgJiraRepo = database.NewOrgJiraRepository(a.DB)
	a.orgChartRepo = database.NewOrgChartRepository(a.DB, a.squadRepo)
	a.timeOffRepo = database.NewTimeOffRepository(a.DB)
	a.taskRepo = database.NewTaskRepository(a.DB)
	a.meetingRepo = database.NewMeetingRepository(a.DB)
	return nil
}

func (a *App) initServices() error {
	// Initialize storage (S3 or local)
	var store storage.Storage
	if a.Config.S3Enabled {
		s3Store, err := storage.NewS3Storage(a.Config)
		if err != nil {
			a.Logger.Warn("Failed to initialize S3 storage, falling back to local storage", "error", err)
		} else {
			store = s3Store
			a.Logger.Info("S3 storage enabled")
		}
	}

	a.avatarService = services.NewAvatarService(store)
	if store == nil {
		a.Logger.Info("Using local file storage for uploads")
	}

	// Initialize Jira OAuth service (optional)
	if a.Config.IsJiraOAuthEnabled() {
		a.jiraOAuthService = jira.NewOAuthService(a.Config)
		a.Logger.Info("Jira OAuth service initialized")
	} else {
		a.Logger.Info("Jira OAuth not configured - using legacy API token auth only")
	}

	// Initialize Resend email service (optional)
	if a.Config.IsResendEnabled() {
		a.emailService = services.NewEmailService(a.Config)
		a.Logger.Info("Resend email service initialized")
	} else {
		a.Logger.Info("Email service not configured - invitation emails will not be sent")
	}

	// Initialize OAuth state store
	// Use database-backed store in production for horizontal scaling
	oauthStateTTL := time.Duration(a.Config.OAuthStateTTLMinutes) * time.Minute
	if oauthStateTTL <= 0 {
		oauthStateTTL = 10 * time.Minute
	}
	if a.Config.IsProduction() {
		dbStore, err := oauth.NewDatabaseStateStore(a.DB, oauthStateTTL)
		if err != nil {
			return fmt.Errorf("failed to initialize OAuth state store: %w", err)
		}
		a.oauthStateStore = dbStore
		a.Logger.Info("Using database-backed OAuth state store")
	} else {
		a.oauthStateStore = oauth.NewMemoryStateStore(oauthStateTTL)
		a.Logger.Info("Using in-memory OAuth state store (development mode)")
	}

	// Initialize Calendar repositories and BFF service
	calendarRepo := database.NewCalendarRepository(a.taskRepo, a.meetingRepo, a.timeOffRepo)
	jiraCalendarClient := jira.NewCalendarJiraClient()
	a.calendarBFFService = services.NewCalendarBFFService(calendarRepo, a.orgJiraRepo, jiraCalendarClient)

	return nil
}

func (a *App) initAuth() error {
	authMiddleware, err := middleware.NewAuthMiddleware(a.Config.Auth0Domain, a.Config.Auth0Audience, a.userRepo, a.Config.JWKSCacheTTLMinutes)
	if err != nil {
		return err
	}
	a.authMiddleware = authMiddleware

	// Initialize Auth0 Management API client (optional)
	if a.Config.IsAuth0MgmtEnabled() {
		a.auth0Client = auth0.NewManagementClient(a.Config)
		a.Logger.Info("Auth0 Management API client initialized")
	} else {
		a.Logger.Info("Auth0 Management API not configured - employees will be created without Auth0 accounts")
	}

	return nil
}

func (a *App) initHandlers() error {
	a.handlers = handlers.New(a.userRepo, a.squadRepo)
	a.avatarHandlers = handlers.NewAvatarHandlersWithConfig(a.userRepo, a.avatarService, a.Config.AvatarMaxSizeMB)
	a.invitationHandlers = handlers.NewInvitationHandlers(a.invitationRepo, a.userRepo, a.emailService)
	a.jiraHandlers = handlers.NewJiraHandlersWithConfig(a.userRepo, a.orgJiraRepo, a.timeOffRepo, a.jiraOAuthService, a.oauthStateStore, a.Config.FrontendURL, a.Config.JiraMaxUsersPagination, 0, a.Logger)
	a.orgChartHandlers = handlers.NewOrgChartHandlers(a.orgChartRepo, a.userRepo)
	a.timeOffHandlers = handlers.NewTimeOffHandlers(a.timeOffRepo, a.userRepo)
	a.calendarHandlers = handlers.NewCalendarHandlers(a.calendarBFFService, a.taskRepo, a.meetingRepo)
	return nil
}

func (a *App) initGraphQL() error {
	graphResolver := graph.NewResolver(a.userRepo, a.squadRepo, a.orgJiraRepo, a.auth0Client, a.emailService, a.Config.FrontendURL, a.Logger)
	a.graphServer = handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{Resolvers: graphResolver}))
	return nil
}

func (a *App) initRouter() {
	r := chi.NewRouter()

	// Create metrics collector (before rate limiter so we can track rate-limited requests)
	a.metrics = middleware.NewMetrics("manager_dashboard")

	// Create endpoint-specific rate limiter with:
	// - Stricter limits for sensitive endpoints (invitations, user creation, etc.)
	// - Skip paths for health checks and metrics
	// - Metrics callback for monitoring rate limit violations
	rateLimiterCfg := middleware.RateLimiterConfig{
		MaxVisitors:            a.Config.RateLimiterMaxVisitors,
		CleanupIntervalMinutes: a.Config.RateLimiterCleanupIntervalMinutes,
		VisitorTimeoutMinutes:  a.Config.RateLimiterVisitorTimeoutMinutes,
	}
	rateLimiter := middleware.NewEndpointRateLimiter(
		rate.Limit(a.Config.RateLimitRPS),
		a.Config.RateLimitBurst,
		rateLimiterCfg,
		middleware.SensitiveEndpointLimits,
		middleware.WithSkipPaths([]string{"/health", "/ready", "/live", "/metrics"}),
		middleware.WithRateLimitedCallback(a.metrics.RecordRateLimited),
	)

	// Global middleware
	r.Use(chimiddleware.RequestID)
	r.Use(a.metrics.Middleware) // Prometheus metrics
	r.Use(middleware.RequestLogger(a.Logger))
	r.Use(middleware.RecoveryLogger(a.Logger))
	r.Use(middleware.SecurityHeaders)
	r.Use(rateLimiter.Limit)
	r.Use(middleware.RequestSizeLimiter(int64(a.Config.MaxRequestSizeMB) << 20))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{a.Config.FrontendURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check, probes, and metrics
	a.registerHealthRoutes(r)

	// Swagger documentation (only in development mode)
	if !a.Config.IsProduction() {
		r.Get("/swagger/*", httpSwagger.Handler(
			httpSwagger.URL("/swagger/doc.json"),
		))
		a.Logger.Info("Swagger documentation available at /swagger/index.html")
	}

	// GraphQL routes
	a.registerGraphQLRoutes(r)

	// REST API routes
	a.registerAPIRoutes(r)

	// Static file server
	fileServer := http.FileServer(http.Dir("uploads"))
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", fileServer))

	a.Router = r
}

func (a *App) registerHealthRoutes(r chi.Router) {
	// Basic health check (for load balancers)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		if err := a.DB.Ping(ctx); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status": "unhealthy",
				"error":  "database connection failed",
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status": "healthy",
		})
	})

	// Detailed health check (for monitoring)
	r.Get("/health/detailed", func(w http.ResponseWriter, rq *http.Request) {
		ctx, cancel := context.WithTimeout(rq.Context(), 5*time.Second)
		defer cancel()

		response := a.buildDetailedHealthResponse(ctx)

		w.Header().Set("Content-Type", "application/json")
		if response.Status != "healthy" {
			w.WriteHeader(http.StatusServiceUnavailable)
		} else {
			w.WriteHeader(http.StatusOK)
		}
		_ = json.NewEncoder(w).Encode(response)
	})

	// Readiness probe (for Kubernetes - checks if ready to serve traffic)
	r.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		// Check database connectivity
		if err := a.DB.Ping(ctx); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte("NOT READY: database unavailable"))
			return
		}

		// Check if we have available connections
		stats := a.DB.Stat()
		if stats.AcquiredConns() >= stats.MaxConns() {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte("NOT READY: connection pool exhausted"))
			return
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("READY"))
	})

	// Liveness probe (simple check that server is running)
	r.Get("/live", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	// Prometheus metrics endpoint
	r.Handle("/metrics", promhttp.Handler())
}

func (a *App) registerGraphQLRoutes(r chi.Router) {
	// GraphQL Playground (development only)
	if !a.Config.IsProduction() {
		r.Get("/graphql", playground.Handler("GraphQL Playground", "/graphql"))
		a.Logger.Info("GraphQL Playground enabled (development mode)")
	}

	// GraphQL endpoint (protected)
	r.Group(func(r chi.Router) {
		r.Use(a.authMiddleware.Authenticate)
		r.Use(a.graphqlTimeoutMiddleware) // Apply operation timeout
		r.Use(a.dataloaderMiddleware)     // Inject dataloaders for N+1 prevention
		r.Post("/graphql", a.graphServer.ServeHTTP)
	})
}

// dataloaderMiddleware injects dataloaders into the request context
// This enables batched database queries to prevent N+1 problems in GraphQL resolvers
func (a *App) dataloaderMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Create fresh loaders for each request (they cache within a single request)
		loaders := graph.NewLoaders(a.userRepo)
		ctx := graph.ContextWithLoaders(r.Context(), loaders)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// graphqlTimeoutMiddleware applies a timeout to GraphQL operations
// This prevents long-running queries from holding connections indefinitely
func (a *App) graphqlTimeoutMiddleware(next http.Handler) http.Handler {
	timeout := time.Duration(a.Config.GraphQLTimeoutSecs) * time.Second
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), timeout)
		defer cancel()
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (a *App) registerAPIRoutes(r chi.Router) {
	r.Route("/api", func(r chi.Router) {
		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(a.authMiddleware.Authenticate)

			// Current user
			r.Get("/me", a.handlers.GetCurrentUser)

			// Employees (for managers to see their team)
			r.Get("/employees", a.handlers.GetEmployees)

			// Users CRUD
			r.Get("/users", a.handlers.GetAllUsers)
			r.Get("/users/{id}", a.handlers.GetUserByID)
			r.Post("/users", a.handlers.CreateUser)
			r.Put("/users/{id}", a.handlers.UpdateUser)
			r.Delete("/users/{id}", a.handlers.DeleteUser)
			r.Post("/users/{id}/deactivate", a.handlers.DeactivateUser)

			// Supervisors list
			r.Get("/supervisors", a.handlers.GetSupervisors)

			// Squads list, create, update, delete
			r.Get("/squads", a.handlers.GetSquads)
			r.Post("/squads", a.handlers.CreateSquad)
			r.Put("/squads/{id}", a.handlers.RenameSquad)
			r.Delete("/squads/{id}", a.handlers.DeleteSquad)
			r.Get("/squads/{id}/users", a.handlers.GetUsersBySquad)

			// Departments list, update, delete
			r.Get("/departments", a.handlers.GetDepartments)
			r.Put("/departments/{name}", a.handlers.RenameDepartment)
			r.Delete("/departments/{name}", a.handlers.DeleteDepartment)
			r.Get("/departments/{name}/users", a.handlers.GetUsersByDepartment)

			// Avatar upload
			r.Post("/users/{id}/avatar", a.avatarHandlers.UploadAvatar)
			r.Post("/users/{id}/avatar/base64", a.avatarHandlers.UploadAvatarBase64)

			// Invitations (admin only)
			r.Get("/invitations", a.invitationHandlers.GetInvitations)
			r.Post("/invitations", a.invitationHandlers.CreateInvitation)
			r.Get("/invitations/{id}", a.invitationHandlers.GetInvitation)
			r.Delete("/invitations/{id}", a.invitationHandlers.RevokeInvitation)

			// Jira integration
			r.Get("/jira/settings", a.jiraHandlers.GetJiraSettings)
			r.Put("/jira/settings", a.jiraHandlers.UpdateJiraSettings)
			r.Delete("/jira/settings", a.jiraHandlers.DeleteJiraSettings)
			r.Get("/jira/tasks", a.jiraHandlers.GetMyTasks)
			r.Get("/jira/tasks/team", a.jiraHandlers.GetTeamTasks)
			r.Get("/jira/tasks/user/{userId}", a.jiraHandlers.GetUserTasks)
			r.Get("/jira/projects", a.jiraHandlers.GetProjects)
			r.Get("/jira/projects/{projectKey}/tasks", a.jiraHandlers.GetProjectTasks)
			r.Get("/jira/epics", a.jiraHandlers.GetEpics)
			r.Get("/jira/oauth/authorize", a.jiraHandlers.GetOAuthAuthorizeURL)
			r.Get("/jira/users", a.jiraHandlers.GetJiraUsers)
			r.Post("/jira/users/auto-match", a.jiraHandlers.AutoMatchJiraUsers)
			r.Put("/jira/users/{userId}/mapping", a.jiraHandlers.UpdateUserJiraMapping)
			r.Delete("/jira/disconnect", a.jiraHandlers.DisconnectJira)

			// Org Chart Drafts (supervisor only)
			r.Route("/orgchart", func(r chi.Router) {
				r.Get("/tree", a.orgChartHandlers.GetOrgTree)
				r.Route("/drafts", func(r chi.Router) {
					r.Post("/", a.orgChartHandlers.CreateDraft)
					r.Get("/", a.orgChartHandlers.GetDrafts)
					r.Get("/{id}", a.orgChartHandlers.GetDraft)
					r.Put("/{id}", a.orgChartHandlers.UpdateDraft)
					r.Delete("/{id}", a.orgChartHandlers.DeleteDraft)
					r.Post("/{id}/changes", a.orgChartHandlers.AddChange)
					r.Delete("/{id}/changes/{userId}", a.orgChartHandlers.RemoveChange)
					r.Post("/{id}/publish", a.orgChartHandlers.PublishDraft)
				})
			})

			// Calendar (tasks, meetings, events)
			r.Route("/calendar", func(r chi.Router) {
				r.Get("/events", a.calendarHandlers.GetEvents)

				// Tasks
				r.Route("/tasks", func(r chi.Router) {
					r.Post("/", a.calendarHandlers.CreateTask)
					r.Get("/{id}", a.calendarHandlers.GetTask)
					r.Put("/{id}", a.calendarHandlers.UpdateTask)
					r.Delete("/{id}", a.calendarHandlers.DeleteTask)
				})

				// Meetings
				r.Route("/meetings", func(r chi.Router) {
					r.Post("/", a.calendarHandlers.CreateMeeting)
					r.Get("/{id}", a.calendarHandlers.GetMeeting)
					r.Put("/{id}", a.calendarHandlers.UpdateMeeting)
					r.Delete("/{id}", a.calendarHandlers.DeleteMeeting)
					r.Post("/{id}/respond", a.calendarHandlers.RespondToMeeting)
				})
			})

			// Time Off Requests
			r.Route("/time-off", func(r chi.Router) {
				r.Post("/", a.timeOffHandlers.Create)
				r.Get("/", a.timeOffHandlers.GetMyRequests)
				r.Get("/pending", a.timeOffHandlers.GetPending)
				r.Get("/team", a.timeOffHandlers.GetTeamTimeOff)
				r.Get("/{id}", a.timeOffHandlers.GetByID)
				r.Delete("/{id}", a.timeOffHandlers.Cancel)
				r.Put("/{id}/review", a.timeOffHandlers.Review)
			})
		})

		// Public invitation routes (for signup flow)
		r.Get("/invitations/validate/{token}", a.invitationHandlers.ValidateInvitation)
		r.Post("/invitations/accept/{token}", a.invitationHandlers.AcceptInvitation)

		// Jira OAuth callback (must be public - called by Atlassian, not authenticated user)
		r.Get("/jira/oauth/callback", a.jiraHandlers.HandleOAuthCallback)
	})
}

func (a *App) initServer() {
	a.Server = &http.Server{
		Addr:         ":" + a.Config.Port,
		Handler:      a.Router,
		ReadTimeout:  time.Duration(a.Config.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(a.Config.WriteTimeout) * time.Second,
		IdleTimeout:  time.Duration(a.Config.IdleTimeout) * time.Second,
	}
}

// Run starts the HTTP server
func (a *App) Run() error {
	a.Logger.Info("Server starting",
		"port", a.Config.Port,
		"environment", a.Config.Environment,
	)
	if !a.Config.IsProduction() {
		a.Logger.Info("GraphQL Playground available", "url", "http://localhost:"+a.Config.Port+"/graphql")
	}

	return a.Server.ListenAndServe()
}

// Shutdown gracefully shuts down the server and closes connections
func (a *App) Shutdown(ctx context.Context) error {
	a.Logger.Info("Shutting down server...")

	// Attempt graceful shutdown
	if err := a.Server.Shutdown(ctx); err != nil {
		a.Logger.Error("Server forced to shutdown", "error", err)
		return err
	}

	// Close database connection
	a.DB.Close()
	a.Logger.Info("Database connection closed")

	a.Logger.Info("Server exited gracefully")
	return nil
}

// DetailedHealthResponse contains comprehensive health information
type DetailedHealthResponse struct {
	Status      string                 `json:"status"`
	Timestamp   string                 `json:"timestamp"`
	Version     string                 `json:"version,omitempty"`
	Environment string                 `json:"environment"`
	Checks      map[string]HealthCheck `json:"checks"`
	System      SystemInfo             `json:"system"`
}

// HealthCheck represents an individual health check result
type HealthCheck struct {
	Status  string         `json:"status"`
	Latency string         `json:"latency,omitempty"`
	Details map[string]any `json:"details,omitempty"`
}

// SystemInfo contains runtime system information
type SystemInfo struct {
	GoVersion    string `json:"go_version"`
	NumGoroutine int    `json:"num_goroutine"`
	NumCPU       int    `json:"num_cpu"`
	MemoryAlloc  uint64 `json:"memory_alloc_bytes"`
	MemorySys    uint64 `json:"memory_sys_bytes"`
	Uptime       string `json:"uptime,omitempty"`
}

var startTime = time.Now()

// buildDetailedHealthResponse builds the comprehensive health response
func (a *App) buildDetailedHealthResponse(ctx context.Context) DetailedHealthResponse {
	response := DetailedHealthResponse{
		Status:      "healthy",
		Timestamp:   time.Now().UTC().Format(time.RFC3339),
		Environment: a.Config.Environment,
		Checks:      make(map[string]HealthCheck),
	}

	// Database health check
	dbCheck := a.checkDatabase(ctx)
	response.Checks["database"] = dbCheck
	if dbCheck.Status != "healthy" {
		response.Status = "unhealthy"
	}

	// System info
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	response.System = SystemInfo{
		GoVersion:    runtime.Version(),
		NumGoroutine: runtime.NumGoroutine(),
		NumCPU:       runtime.NumCPU(),
		MemoryAlloc:  memStats.Alloc,
		MemorySys:    memStats.Sys,
		Uptime:       time.Since(startTime).Round(time.Second).String(),
	}

	return response
}

// checkDatabase performs a database health check
func (a *App) checkDatabase(ctx context.Context) HealthCheck {
	start := time.Now()
	err := a.DB.Ping(ctx)
	latency := time.Since(start)

	if err != nil {
		return HealthCheck{
			Status:  "unhealthy",
			Latency: latency.String(),
			Details: map[string]any{
				"error": "connection failed",
			},
		}
	}

	// Get pool statistics
	stats := a.DB.Stat()

	return HealthCheck{
		Status:  "healthy",
		Latency: latency.String(),
		Details: map[string]any{
			"total_conns":      stats.TotalConns(),
			"acquired_conns":   stats.AcquiredConns(),
			"idle_conns":       stats.IdleConns(),
			"max_conns":        stats.MaxConns(),
			"empty_acquire":    stats.EmptyAcquireCount(),
			"canceled_acquire": stats.CanceledAcquireCount(),
		},
	}
}
