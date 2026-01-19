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
)

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
