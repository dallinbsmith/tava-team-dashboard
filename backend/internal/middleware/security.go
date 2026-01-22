package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// SecurityHeaders adds security headers to all responses
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent MIME type sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")
		// Prevent clickjacking
		w.Header().Set("X-Frame-Options", "DENY")
		// XSS protection (legacy but still useful)
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		// Referrer policy
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		// Permissions policy
		w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		next.ServeHTTP(w, r)
	})
}

// RateLimiter provides per-IP rate limiting with memory bounds
type RateLimiter struct {
	visitors       map[string]*visitor
	mu             sync.Mutex
	rate           rate.Limit
	burst          int
	maxVisitors    int // Maximum number of tracked visitors to prevent memory exhaustion
	cleanupMinutes int // Cleanup interval in minutes
	timeoutMinutes int // Visitor timeout in minutes
}

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// NewRateLimiter creates a new rate limiter
// rate is requests per second, burst is max burst size
// maxVisitors limits memory usage (default 10000 if 0)
func NewRateLimiter(r rate.Limit, burst int) *RateLimiter {
	return NewRateLimiterWithMax(r, burst, 10000)
}

// RateLimiterConfig holds configuration for the rate limiter
type RateLimiterConfig struct {
	MaxVisitors            int // Maximum tracked visitors (default 10000)
	CleanupIntervalMinutes int // Cleanup interval in minutes (default 1)
	VisitorTimeoutMinutes  int // Visitor timeout in minutes (default 3)
}

// NewRateLimiterWithMax creates a rate limiter with custom max visitors
func NewRateLimiterWithMax(r rate.Limit, burst int, maxVisitors int) *RateLimiter {
	return NewRateLimiterWithConfig(r, burst, RateLimiterConfig{
		MaxVisitors:            maxVisitors,
		CleanupIntervalMinutes: 1,
		VisitorTimeoutMinutes:  3,
	})
}

// NewRateLimiterWithConfig creates a rate limiter with full configuration
func NewRateLimiterWithConfig(r rate.Limit, burst int, cfg RateLimiterConfig) *RateLimiter {
	if cfg.MaxVisitors <= 0 {
		cfg.MaxVisitors = 10000
	}
	if cfg.CleanupIntervalMinutes <= 0 {
		cfg.CleanupIntervalMinutes = 1
	}
	if cfg.VisitorTimeoutMinutes <= 0 {
		cfg.VisitorTimeoutMinutes = 3
	}

	rl := &RateLimiter{
		visitors:       make(map[string]*visitor),
		rate:           r,
		burst:          burst,
		maxVisitors:    cfg.MaxVisitors,
		cleanupMinutes: cfg.CleanupIntervalMinutes,
		timeoutMinutes: cfg.VisitorTimeoutMinutes,
	}

	// Clean up old visitors at configured interval
	go rl.cleanupVisitors()

	return rl
}

func (rl *RateLimiter) getVisitor(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		// Check if we've hit the max visitors limit
		if len(rl.visitors) >= rl.maxVisitors {
			// Evict the oldest visitor (simple LRU)
			rl.evictOldestLocked()
		}
		limiter := rate.NewLimiter(rl.rate, rl.burst)
		rl.visitors[ip] = &visitor{limiter, time.Now()}
		return limiter
	}

	v.lastSeen = time.Now()
	return v.limiter
}

// evictOldestLocked removes the oldest visitor from the map
// Must be called with mutex held
func (rl *RateLimiter) evictOldestLocked() {
	var oldestIP string
	var oldestTime time.Time
	first := true

	for ip, v := range rl.visitors {
		if first || v.lastSeen.Before(oldestTime) {
			oldestIP = ip
			oldestTime = v.lastSeen
			first = false
		}
	}

	if oldestIP != "" {
		delete(rl.visitors, oldestIP)
	}
}

func (rl *RateLimiter) cleanupVisitors() {
	cleanupInterval := time.Duration(rl.cleanupMinutes) * time.Minute
	visitorTimeout := time.Duration(rl.timeoutMinutes) * time.Minute

	for {
		time.Sleep(cleanupInterval)
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > visitorTimeout {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// Limit is middleware that rate limits requests
func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getIP(r)
		limiter := rl.getVisitor(ip)

		if !limiter.Allow() {
			w.Header().Set("Retry-After", "1")
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// getIP extracts the real client IP from the request
func getIP(r *http.Request) string {
	// Check X-Forwarded-For header first (for proxies/load balancers)
	// X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
	// We take only the first (leftmost) IP which is the original client
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		// Split by comma and take the first IP, trimming whitespace
		if idx := strings.Index(forwarded, ","); idx != -1 {
			return strings.TrimSpace(forwarded[:idx])
		}
		return strings.TrimSpace(forwarded)
	}

	// Check X-Real-IP header
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return strings.TrimSpace(realIP)
	}

	return r.RemoteAddr
}

// RequestSizeLimiter limits the maximum request body size
func RequestSizeLimiter(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			next.ServeHTTP(w, r)
		})
	}
}

// EndpointRateLimit defines rate limiting for a specific endpoint pattern
type EndpointRateLimit struct {
	PathPrefix string     // URL path prefix to match (e.g., "/api/invitations")
	Method     string     // HTTP method (empty string matches all methods)
	RPS        rate.Limit // Requests per second
	Burst      int        // Burst size
}

// EndpointRateLimiter provides endpoint-specific rate limiting
type EndpointRateLimiter struct {
	defaultLimiter *RateLimiter
	endpointLimits []endpointLimitEntry
	skipPaths      []string // Paths to skip rate limiting (e.g., health checks)
	cfg            RateLimiterConfig
	onRateLimited  func(r *http.Request) // Callback when rate limited (for metrics)
}

type endpointLimitEntry struct {
	pathPrefix string
	method     string
	limiter    *RateLimiter
}

// EndpointRateLimiterOption is a functional option for configuring the rate limiter
type EndpointRateLimiterOption func(*EndpointRateLimiter)

// WithSkipPaths sets paths that should skip rate limiting (e.g., health checks)
func WithSkipPaths(paths []string) EndpointRateLimiterOption {
	return func(erl *EndpointRateLimiter) {
		erl.skipPaths = paths
	}
}

// WithRateLimitedCallback sets a callback to be invoked when a request is rate limited
func WithRateLimitedCallback(callback func(r *http.Request)) EndpointRateLimiterOption {
	return func(erl *EndpointRateLimiter) {
		erl.onRateLimited = callback
	}
}

// NewEndpointRateLimiter creates an endpoint-specific rate limiter
// defaultRPS and defaultBurst are used for endpoints without specific limits
func NewEndpointRateLimiter(defaultRPS rate.Limit, defaultBurst int, cfg RateLimiterConfig, limits []EndpointRateLimit, opts ...EndpointRateLimiterOption) *EndpointRateLimiter {
	erl := &EndpointRateLimiter{
		defaultLimiter: NewRateLimiterWithConfig(defaultRPS, defaultBurst, cfg),
		endpointLimits: make([]endpointLimitEntry, 0, len(limits)),
		skipPaths:      []string{},
		cfg:            cfg,
	}

	for _, limit := range limits {
		erl.endpointLimits = append(erl.endpointLimits, endpointLimitEntry{
			pathPrefix: limit.PathPrefix,
			method:     limit.Method,
			limiter:    NewRateLimiterWithConfig(limit.RPS, limit.Burst, cfg),
		})
	}

	for _, opt := range opts {
		opt(erl)
	}

	return erl
}

// getLimiterForRequest returns the appropriate rate limiter for the request
func (erl *EndpointRateLimiter) getLimiterForRequest(r *http.Request) *RateLimiter {
	path := r.URL.Path
	method := r.Method

	// Check endpoint-specific limits (first match wins)
	for _, entry := range erl.endpointLimits {
		if strings.HasPrefix(path, entry.pathPrefix) {
			if entry.method == "" || entry.method == method {
				return entry.limiter
			}
		}
	}

	return erl.defaultLimiter
}

// shouldSkip checks if the request path should skip rate limiting
func (erl *EndpointRateLimiter) shouldSkip(path string) bool {
	for _, skipPath := range erl.skipPaths {
		if path == skipPath || strings.HasPrefix(path, skipPath+"/") {
			return true
		}
	}
	return false
}

// Limit is middleware that applies endpoint-specific rate limits
func (erl *EndpointRateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip rate limiting for configured paths (health checks, metrics, etc.)
		if erl.shouldSkip(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

		limiter := erl.getLimiterForRequest(r)
		ip := getIP(r)
		ipLimiter := limiter.getVisitor(ip)

		if !ipLimiter.Allow() {
			// Invoke callback for metrics if configured
			if erl.onRateLimited != nil {
				erl.onRateLimited(r)
			}
			w.Header().Set("Retry-After", "1")
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Common endpoint rate limit presets
var (
	// SensitiveEndpointLimits provides stricter limits for sensitive endpoints
	SensitiveEndpointLimits = []EndpointRateLimit{
		// Invitations - very sensitive, limit to 10 requests/minute
		{PathPrefix: "/api/invitations", Method: "POST", RPS: rate.Limit(10.0 / 60.0), Burst: 3},
		{PathPrefix: "/api/invitations", Method: "DELETE", RPS: rate.Limit(10.0 / 60.0), Burst: 3},

		// User management - sensitive operations
		{PathPrefix: "/api/users", Method: "POST", RPS: rate.Limit(20.0 / 60.0), Burst: 5},
		{PathPrefix: "/api/users", Method: "DELETE", RPS: rate.Limit(10.0 / 60.0), Burst: 3},

		// Avatar uploads - resource intensive
		{PathPrefix: "/api/users/", Method: "POST", RPS: rate.Limit(5.0 / 60.0), Burst: 2},

		// Org chart publishes - very sensitive
		{PathPrefix: "/api/orgchart/drafts/", Method: "POST", RPS: rate.Limit(5.0 / 60.0), Burst: 2},

		// Time-off reviews - moderate sensitivity
		{PathPrefix: "/api/time-off/", Method: "PUT", RPS: rate.Limit(30.0 / 60.0), Burst: 10},

		// Jira operations - external API, be conservative
		{PathPrefix: "/api/jira/", Method: "", RPS: rate.Limit(30.0 / 60.0), Burst: 10},
	}
)
