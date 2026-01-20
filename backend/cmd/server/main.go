package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/smith-dallin/manager-dashboard/config"
	"github.com/smith-dallin/manager-dashboard/internal/app"
	"github.com/smith-dallin/manager-dashboard/internal/logger"

	_ "github.com/smith-dallin/manager-dashboard/docs" // swagger docs
)

// @title Manager Dashboard API
// @version 1.0
// @description REST API for the Manager Dashboard application. Provides endpoints for user management, team organization, time-off requests, Jira integration, and calendar management.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@example.com

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
// @BasePath /api

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

// @tag.name Users
// @tag.description User management operations
// @tag.name Invitations
// @tag.description Invitation management for onboarding new users
// @tag.name Time Off
// @tag.description Time-off request management
// @tag.name Jira
// @tag.description Jira integration endpoints
// @tag.name Calendar
// @tag.description Calendar, tasks, and meetings management
// @tag.name Org Chart
// @tag.description Organization chart and draft management
// @tag.name Squads
// @tag.description Team/squad management
// @tag.name Health
// @tag.description Health check and monitoring endpoints

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic("Failed to load config: " + err.Error())
	}

	// Initialize logger
	var log *logger.Logger
	if cfg.IsProduction() {
		log = logger.New(logger.Config{
			Level:     cfg.LogLevel,
			Format:    "json",
			AddSource: true,
		})
	} else {
		log = logger.New(logger.Config{
			Level:     cfg.LogLevel,
			Format:    cfg.LogFormat,
			AddSource: false,
		})
	}
	logger.SetDefault(log)

	// Create and initialize the application
	application, err := app.New(cfg, log)
	if err != nil {
		log.Error("Failed to initialize application", "error", err)
		os.Exit(1)
	}

	// Start server in a goroutine
	go func() {
		if err := application.Run(); err != nil && err != http.ErrServerClosed {
			log.Error("Server failed", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// Create a deadline for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.ShutdownTimeout)*time.Second)
	defer cancel()

	// Attempt graceful shutdown
	if err := application.Shutdown(ctx); err != nil {
		os.Exit(1)
	}
}
