package middleware

import (
	"fmt"
	"net/http"
	"time"

	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/smith-dallin/manager-dashboard/internal/logger"
)

// responseWriter wraps http.ResponseWriter to capture the status code
type responseWriter struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
	size        int
}

func wrapResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{ResponseWriter: w, status: http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	if rw.wroteHeader {
		return
	}
	rw.status = code
	rw.wroteHeader = true
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.wroteHeader {
		rw.WriteHeader(http.StatusOK)
	}
	n, err := rw.ResponseWriter.Write(b)
	rw.size += n
	return n, err
}

// Unwrap returns the original http.ResponseWriter for chi middleware compatibility
func (rw *responseWriter) Unwrap() http.ResponseWriter {
	return rw.ResponseWriter
}

// RequestLogger returns a middleware that logs HTTP requests using structured logging
func RequestLogger(log *logger.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Get or generate request ID
			requestID := chimiddleware.GetReqID(r.Context())
			if requestID == "" {
				requestID = generateRequestID()
			}

			// Add request ID to context for downstream loggers
			ctx := logger.ContextWithRequestID(r.Context(), requestID)
			ctx = logger.ContextWithLogger(ctx, log.With("request_id", requestID))

			// Wrap the response writer to capture status code
			wrapped := wrapResponseWriter(w)

			// Add request ID to response header
			wrapped.Header().Set("X-Request-ID", requestID)

			// Process request
			next.ServeHTTP(wrapped, r.WithContext(ctx))

			// Calculate latency
			latency := time.Since(start)

			// Build log attributes
			attrs := []any{
				"remote_addr", r.RemoteAddr,
				"user_agent", r.UserAgent(),
				"bytes", wrapped.size,
			}

			// Add referer if present
			if referer := r.Referer(); referer != "" {
				attrs = append(attrs, "referer", referer)
			}

			// Log the request
			log.LogRequest(ctx, r.Method, r.URL.Path, wrapped.status, latency, attrs...)
		})
	}
}

// generateRequestID generates a unique request ID
func generateRequestID() string {
	return fmt.Sprintf("%d", chimiddleware.NextRequestID())
}

// RecoveryLogger returns a middleware that recovers from panics and logs them
func RecoveryLogger(log *logger.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if recovered := recover(); recovered != nil {
					log.LogPanic(r.Context(), recovered)
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
