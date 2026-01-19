package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/smith-dallin/manager-dashboard/config"
	"github.com/smith-dallin/manager-dashboard/internal/auth0"
	"github.com/smith-dallin/manager-dashboard/internal/database"
	"github.com/smith-dallin/manager-dashboard/internal/graph"
	"github.com/smith-dallin/manager-dashboard/internal/handlers"
	"github.com/smith-dallin/manager-dashboard/internal/jira"
	"github.com/smith-dallin/manager-dashboard/internal/middleware"
	"github.com/smith-dallin/manager-dashboard/internal/services"
	"github.com/smith-dallin/manager-dashboard/internal/storage"
	"golang.org/x/time/rate"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	pool, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Run migrations
	if err := database.RunMigrations(pool); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repositories
	userRepo := database.NewUserRepository(pool)
	squadRepo := database.NewSquadRepository(pool)
	invitationRepo := database.NewInvitationRepository(pool)

	// Initialize auth middleware
	authMiddleware, err := middleware.NewAuthMiddleware(cfg.Auth0Domain, cfg.Auth0Audience, userRepo)
	if err != nil {
		log.Fatalf("Failed to create auth middleware: %v", err)
	}

	// Initialize storage (S3 or local)
	var store storage.Storage
	if cfg.S3Enabled {
		s3Store, err := storage.NewS3Storage(cfg)
		if err != nil {
			log.Printf("Warning: Failed to initialize S3 storage: %v. Falling back to local storage.", err)
		} else {
			store = s3Store
			log.Println("S3 storage enabled")
		}
	}

	// Initialize avatar service
	avatarService := services.NewAvatarService(store)
	if store == nil {
		log.Println("Using local file storage for uploads")
	}

	// Initialize REST handlers
	h := handlers.New(userRepo, squadRepo)

	// Initialize avatar handlers
	avatarHandlers := handlers.NewAvatarHandlers(userRepo, avatarService)

	// Initialize invitation handlers
	invitationHandlers := handlers.NewInvitationHandlers(invitationRepo, userRepo)

	// Initialize Jira OAuth service (optional)
	var jiraOAuthService *jira.OAuthService
	if cfg.IsJiraOAuthEnabled() {
		jiraOAuthService = jira.NewOAuthService(cfg)
		log.Println("Jira OAuth service initialized")
	} else {
		log.Println("Jira OAuth not configured - using legacy API token auth only")
	}

	// Initialize Org Jira repository (for organization-wide Jira settings)
	orgJiraRepo := database.NewOrgJiraRepository(pool)

	// Initialize Org Chart handlers
	orgChartRepo := database.NewOrgChartRepository(pool, squadRepo)
	orgChartHandlers := handlers.NewOrgChartHandlers(orgChartRepo, userRepo)

	// Initialize Time Off repository and handlers
	timeOffRepo := database.NewTimeOffRepository(pool)
	timeOffHandlers := handlers.NewTimeOffHandlers(timeOffRepo, userRepo)

	// Initialize Jira handlers (needs timeOffRepo for time off impact calculation)
	jiraHandlers := handlers.NewJiraHandlers(userRepo, orgJiraRepo, timeOffRepo, jiraOAuthService, cfg.FrontendURL)

	// Initialize Calendar repositories
	taskRepo := database.NewTaskRepository(pool)
	meetingRepo := database.NewMeetingRepository(pool)
	calendarRepo := database.NewCalendarRepository(taskRepo, meetingRepo, timeOffRepo)

	// Initialize Jira calendar client for BFF service
	jiraCalendarClient := jira.NewCalendarJiraClient()

	// Initialize Calendar BFF service (aggregates data from multiple sources)
	calendarBFFService := services.NewCalendarBFFService(calendarRepo, orgJiraRepo, jiraCalendarClient)

	// Initialize Calendar handlers using BFF service
	calendarHandlers := handlers.NewCalendarHandlers(calendarBFFService, taskRepo, meetingRepo)

	// Initialize Auth0 Management API client (optional)
	var auth0Client *auth0.ManagementClient
	if cfg.IsAuth0MgmtEnabled() {
		auth0Client = auth0.NewManagementClient(cfg)
		log.Println("Auth0 Management API client initialized")
	} else {
		log.Println("Auth0 Management API not configured - employees will be created without Auth0 accounts")
	}

	// Initialize GraphQL
	graphResolver := graph.NewResolver(userRepo, squadRepo, orgJiraRepo, auth0Client, cfg.FrontendURL)
	graphServer := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{Resolvers: graphResolver}))

	// Create router
	r := chi.NewRouter()

	// Create rate limiter (100 requests per second with burst of 200)
	rateLimiter := middleware.NewRateLimiter(rate.Limit(100), 200)

	// Global middleware
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.RequestID)
	r.Use(middleware.SecurityHeaders)
	r.Use(rateLimiter.Limit)
	r.Use(middleware.RequestSizeLimiter(10 << 20)) // 10MB max request size
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.FrontendURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check with database connectivity verification
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		if err := pool.Ping(ctx); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{
				"status": "unhealthy",
				"error":  "database connection failed",
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"status": "healthy",
		})
	})

	// Liveness probe (simple check that server is running)
	r.Get("/live", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// GraphQL Playground (development only)
	if !cfg.IsProduction() {
		r.Get("/graphql", playground.Handler("GraphQL Playground", "/graphql"))
		log.Println("GraphQL Playground enabled (development mode)")
	}

	// GraphQL endpoint (protected)
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware.Authenticate)
		r.Post("/graphql", graphServer.ServeHTTP)
	})

	// REST API routes
	r.Route("/api", func(r chi.Router) {
		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.Authenticate)

			// Current user
			r.Get("/me", h.GetCurrentUser)

			// Employees (for managers to see their team)
			r.Get("/employees", h.GetEmployees)

			// Users CRUD
			r.Get("/users", h.GetAllUsers)
			r.Get("/users/{id}", h.GetUserByID)
			r.Post("/users", h.CreateUser)
			r.Put("/users/{id}", h.UpdateUser)
			r.Delete("/users/{id}", h.DeleteUser)

			// Supervisors list
			r.Get("/supervisors", h.GetSupervisors)

			// Squads list, create, delete
			r.Get("/squads", h.GetSquads)
			r.Post("/squads", h.CreateSquad)
			r.Delete("/squads/{id}", h.DeleteSquad)

			// Departments list and delete
			r.Get("/departments", h.GetDepartments)
			r.Delete("/departments/{name}", h.DeleteDepartment)

			// Avatar upload
			r.Post("/users/{id}/avatar", avatarHandlers.UploadAvatar)
			r.Post("/users/{id}/avatar/base64", avatarHandlers.UploadAvatarBase64)

			// Invitations (admin only)
			r.Get("/invitations", invitationHandlers.GetInvitations)
			r.Post("/invitations", invitationHandlers.CreateInvitation)
			r.Get("/invitations/{id}", invitationHandlers.GetInvitation)
			r.Delete("/invitations/{id}", invitationHandlers.RevokeInvitation)

			// Jira integration
			r.Get("/jira/settings", jiraHandlers.GetJiraSettings)
			r.Put("/jira/settings", jiraHandlers.UpdateJiraSettings)
			r.Delete("/jira/settings", jiraHandlers.DeleteJiraSettings)
			r.Get("/jira/tasks", jiraHandlers.GetMyTasks)
			r.Get("/jira/tasks/team", jiraHandlers.GetTeamTasks)
			r.Get("/jira/tasks/user/{userId}", jiraHandlers.GetUserTasks)
			r.Get("/jira/projects", jiraHandlers.GetProjects)
			r.Get("/jira/projects/{projectKey}/tasks", jiraHandlers.GetProjectTasks)
			r.Get("/jira/epics", jiraHandlers.GetEpics)
			// Jira OAuth (callback is registered as public route below)
			r.Get("/jira/oauth/authorize", jiraHandlers.GetOAuthAuthorizeURL)
			// Jira user mapping (admin only)
			r.Get("/jira/users", jiraHandlers.GetJiraUsers)
			r.Post("/jira/users/auto-match", jiraHandlers.AutoMatchJiraUsers)
			r.Put("/jira/users/{userId}/mapping", jiraHandlers.UpdateUserJiraMapping)
			r.Delete("/jira/disconnect", jiraHandlers.DisconnectJira)

			// Org Chart Drafts (supervisor only)
			r.Route("/orgchart", func(r chi.Router) {
				r.Get("/tree", orgChartHandlers.GetOrgTree)
				r.Route("/drafts", func(r chi.Router) {
					r.Post("/", orgChartHandlers.CreateDraft)
					r.Get("/", orgChartHandlers.GetDrafts)
					r.Get("/{id}", orgChartHandlers.GetDraft)
					r.Put("/{id}", orgChartHandlers.UpdateDraft)
					r.Delete("/{id}", orgChartHandlers.DeleteDraft)
					r.Post("/{id}/changes", orgChartHandlers.AddChange)
					r.Delete("/{id}/changes/{userId}", orgChartHandlers.RemoveChange)
					r.Post("/{id}/publish", orgChartHandlers.PublishDraft)
				})
			})

			// Calendar (tasks, meetings, events)
			r.Route("/calendar", func(r chi.Router) {
				r.Get("/events", calendarHandlers.GetEvents)

				// Tasks
				r.Route("/tasks", func(r chi.Router) {
					r.Post("/", calendarHandlers.CreateTask)
					r.Get("/{id}", calendarHandlers.GetTask)
					r.Put("/{id}", calendarHandlers.UpdateTask)
					r.Delete("/{id}", calendarHandlers.DeleteTask)
				})

				// Meetings
				r.Route("/meetings", func(r chi.Router) {
					r.Post("/", calendarHandlers.CreateMeeting)
					r.Get("/{id}", calendarHandlers.GetMeeting)
					r.Put("/{id}", calendarHandlers.UpdateMeeting)
					r.Delete("/{id}", calendarHandlers.DeleteMeeting)
					r.Post("/{id}/respond", calendarHandlers.RespondToMeeting)
				})
			})

			// Time Off Requests
			r.Route("/time-off", func(r chi.Router) {
				r.Post("/", timeOffHandlers.Create)
				r.Get("/", timeOffHandlers.GetMyRequests)
				r.Get("/pending", timeOffHandlers.GetPending)
				r.Get("/team", timeOffHandlers.GetTeamTimeOff)
				r.Get("/{id}", timeOffHandlers.GetByID)
				r.Delete("/{id}", timeOffHandlers.Cancel)
				r.Put("/{id}/review", timeOffHandlers.Review)
			})
		})

		// Public invitation routes (for signup flow)
		r.Get("/invitations/validate/{token}", invitationHandlers.ValidateInvitation)
		r.Post("/invitations/accept/{token}", invitationHandlers.AcceptInvitation)

		// Jira OAuth callback (must be public - called by Atlassian, not authenticated user)
		r.Get("/jira/oauth/callback", jiraHandlers.HandleOAuthCallback)
	})

	// Serve uploaded files (avatars)
	fileServer := http.FileServer(http.Dir("uploads"))
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", fileServer))

	log.Printf("Server starting on port %s (environment: %s)", cfg.Port, cfg.Environment)
	if !cfg.IsProduction() {
		log.Printf("GraphQL Playground available at http://localhost:%s/graphql", cfg.Port)
	}
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
