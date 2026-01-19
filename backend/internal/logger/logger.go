package logger

import (
	"context"
	"io"
	"log/slog"
	"os"
	"runtime"
	"time"
)

// Logger wraps slog.Logger with additional convenience methods
type Logger struct {
	*slog.Logger
}

// Config holds logger configuration
type Config struct {
	// Level is the minimum log level (debug, info, warn, error)
	Level string
	// Format is the output format (json, text)
	Format string
	// AddSource adds source file and line number to log entries
	AddSource bool
	// Output is the writer to log to (defaults to os.Stdout)
	Output io.Writer
}

// DefaultConfig returns the default logger configuration
func DefaultConfig() Config {
	return Config{
		Level:     "info",
		Format:    "text",
		AddSource: false,
		Output:    os.Stdout,
	}
}

// ProductionConfig returns a production-ready logger configuration
func ProductionConfig() Config {
	return Config{
		Level:     "info",
		Format:    "json",
		AddSource: true,
		Output:    os.Stdout,
	}
}

// New creates a new Logger with the given configuration
func New(cfg Config) *Logger {
	if cfg.Output == nil {
		cfg.Output = os.Stdout
	}

	level := parseLevel(cfg.Level)

	opts := &slog.HandlerOptions{
		Level:     level,
		AddSource: cfg.AddSource,
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			// Customize timestamp format
			if a.Key == slog.TimeKey {
				if t, ok := a.Value.Any().(time.Time); ok {
					a.Value = slog.StringValue(t.Format(time.RFC3339))
				}
			}
			return a
		},
	}

	var handler slog.Handler
	if cfg.Format == "json" {
		handler = slog.NewJSONHandler(cfg.Output, opts)
	} else {
		handler = slog.NewTextHandler(cfg.Output, opts)
	}

	return &Logger{
		Logger: slog.New(handler),
	}
}

// NewProduction creates a production-ready logger
func NewProduction() *Logger {
	return New(ProductionConfig())
}

// NewDevelopment creates a development-friendly logger
func NewDevelopment() *Logger {
	return New(Config{
		Level:     "debug",
		Format:    "text",
		AddSource: true,
		Output:    os.Stdout,
	})
}

// parseLevel converts a string level to slog.Level
func parseLevel(level string) slog.Level {
	switch level {
	case "debug":
		return slog.LevelDebug
	case "info":
		return slog.LevelInfo
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// With returns a new Logger with the given attributes
func (l *Logger) With(args ...any) *Logger {
	return &Logger{
		Logger: l.Logger.With(args...),
	}
}

// WithGroup returns a new Logger with the given group name
func (l *Logger) WithGroup(name string) *Logger {
	return &Logger{
		Logger: l.Logger.WithGroup(name),
	}
}

// WithContext returns a new Logger that includes context values
func (l *Logger) WithContext(ctx context.Context) *Logger {
	// Extract request ID if present in context
	if reqID := ctx.Value(RequestIDKey); reqID != nil {
		return l.With("request_id", reqID)
	}
	return l
}

// WithError returns a new Logger with an error attribute
func (l *Logger) WithError(err error) *Logger {
	if err == nil {
		return l
	}
	return l.With("error", err.Error())
}

// WithComponent returns a new Logger with a component name
func (l *Logger) WithComponent(name string) *Logger {
	return l.With("component", name)
}

// LogRequest logs an HTTP request with standard fields
func (l *Logger) LogRequest(ctx context.Context, method, path string, status int, latency time.Duration, attrs ...any) {
	args := []any{
		"method", method,
		"path", path,
		"status", status,
		"latency_ms", latency.Milliseconds(),
	}
	args = append(args, attrs...)

	if status >= 500 {
		l.WithContext(ctx).Error("Request completed", args...)
	} else if status >= 400 {
		l.WithContext(ctx).Warn("Request completed", args...)
	} else {
		l.WithContext(ctx).Info("Request completed", args...)
	}
}

// LogError logs an error with additional context
func (l *Logger) LogError(ctx context.Context, msg string, err error, attrs ...any) {
	args := append([]any{"error", err.Error()}, attrs...)
	l.WithContext(ctx).Error(msg, args...)
}

// LogPanic logs a panic with stack trace
func (l *Logger) LogPanic(ctx context.Context, recovered any) {
	stack := make([]byte, 4096)
	n := runtime.Stack(stack, false)
	l.WithContext(ctx).Error("Panic recovered",
		"panic", recovered,
		"stack", string(stack[:n]),
	)
}

// Context keys for logger
type contextKey string

const (
	// RequestIDKey is the context key for request ID
	RequestIDKey contextKey = "request_id"
	// LoggerKey is the context key for the logger
	LoggerKey contextKey = "logger"
)

// ContextWithLogger returns a new context with the logger
func ContextWithLogger(ctx context.Context, l *Logger) context.Context {
	return context.WithValue(ctx, LoggerKey, l)
}

// FromContext retrieves the logger from context, or returns a default logger
func FromContext(ctx context.Context) *Logger {
	if l, ok := ctx.Value(LoggerKey).(*Logger); ok {
		return l
	}
	return New(DefaultConfig())
}

// ContextWithRequestID returns a new context with the request ID
func ContextWithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, RequestIDKey, requestID)
}

// Global logger instance for convenience
var defaultLogger = New(DefaultConfig())

// SetDefault sets the default global logger
func SetDefault(l *Logger) {
	defaultLogger = l
	slog.SetDefault(l.Logger)
}

// Default returns the default global logger
func Default() *Logger {
	return defaultLogger
}

// Debug logs at debug level using the default logger
func Debug(msg string, args ...any) {
	defaultLogger.Debug(msg, args...)
}

// Info logs at info level using the default logger
func Info(msg string, args ...any) {
	defaultLogger.Info(msg, args...)
}

// Warn logs at warn level using the default logger
func Warn(msg string, args ...any) {
	defaultLogger.Warn(msg, args...)
}

// Error logs at error level using the default logger
func Error(msg string, args ...any) {
	defaultLogger.Error(msg, args...)
}
