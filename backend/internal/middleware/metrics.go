package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics holds Prometheus metrics for the application
type Metrics struct {
	requestsTotal    *prometheus.CounterVec
	requestDuration  *prometheus.HistogramVec
	requestSize      *prometheus.HistogramVec
	responseSize     *prometheus.HistogramVec
	activeRequests   prometheus.Gauge
	rateLimitedTotal *prometheus.CounterVec
}

// NewMetrics creates and registers application metrics
func NewMetrics(namespace string) *Metrics {
	if namespace == "" {
		namespace = "http"
	}

	return &Metrics{
		requestsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "requests_total",
				Help:      "Total number of HTTP requests",
			},
			[]string{"method", "path", "status"},
		),
		requestDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: namespace,
				Name:      "request_duration_seconds",
				Help:      "Duration of HTTP requests in seconds",
				Buckets:   []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10},
			},
			[]string{"method", "path", "status"},
		),
		requestSize: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: namespace,
				Name:      "request_size_bytes",
				Help:      "Size of HTTP requests in bytes",
				Buckets:   prometheus.ExponentialBuckets(100, 10, 7), // 100B to 100MB
			},
			[]string{"method", "path"},
		),
		responseSize: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: namespace,
				Name:      "response_size_bytes",
				Help:      "Size of HTTP responses in bytes",
				Buckets:   prometheus.ExponentialBuckets(100, 10, 7), // 100B to 100MB
			},
			[]string{"method", "path", "status"},
		),
		activeRequests: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace: namespace,
				Name:      "active_requests",
				Help:      "Number of active HTTP requests",
			},
		),
		rateLimitedTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "rate_limited_total",
				Help:      "Total number of rate limited requests",
			},
			[]string{"method", "path"},
		),
	}
}

// Middleware returns an HTTP middleware that records metrics
func (m *Metrics) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		m.activeRequests.Inc()
		defer m.activeRequests.Dec()

		// Record request size
		if r.ContentLength > 0 {
			m.requestSize.WithLabelValues(r.Method, normalizePath(r.URL.Path)).Observe(float64(r.ContentLength))
		}

		// Wrap response writer to capture status and size
		wrapped := wrapResponseWriter(w)

		// Process request
		next.ServeHTTP(wrapped, r)

		// Record metrics
		duration := time.Since(start).Seconds()
		status := strconv.Itoa(wrapped.status)
		path := normalizePath(r.URL.Path)

		m.requestsTotal.WithLabelValues(r.Method, path, status).Inc()
		m.requestDuration.WithLabelValues(r.Method, path, status).Observe(duration)
		m.responseSize.WithLabelValues(r.Method, path, status).Observe(float64(wrapped.size))
	})
}

// RecordRateLimited records a rate limited request (for use as callback)
func (m *Metrics) RecordRateLimited(r *http.Request) {
	path := normalizePath(r.URL.Path)
	m.rateLimitedTotal.WithLabelValues(r.Method, path).Inc()
}

// normalizePath normalizes URL paths to prevent high cardinality
// Replaces numeric IDs and UUIDs with placeholders
func normalizePath(path string) string {
	// Common patterns to normalize
	// /api/users/123 -> /api/users/:id
	// /api/invitations/abc-123 -> /api/invitations/:token

	// For simplicity, just return the path with common prefixes
	// In production, you might use a more sophisticated approach
	switch {
	case len(path) > 100:
		return path[:100]
	default:
		return path
	}
}
