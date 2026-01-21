package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/auth0/go-jwt-middleware/v2/jwks"
	"github.com/auth0/go-jwt-middleware/v2/validator"
	"github.com/smith-dallin/manager-dashboard/internal/database"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

type contextKey string

const (
	UserContextKey          contextKey = "user"           // The effective user (impersonated if applicable)
	RealUserContextKey      contextKey = "real_user"      // The actual authenticated user
	ClaimsContextKey        contextKey = "claims"
	ImpersonationContextKey contextKey = "is_impersonating"
)

type CustomClaims struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

func (c CustomClaims) Validate(ctx context.Context) error {
	return nil
}

type AuthMiddleware struct {
	validator      *validator.Validator
	userRepository *database.UserRepository
}

func NewAuthMiddleware(domain, audience string, userRepo *database.UserRepository, jwksCacheTTLMinutes int) (*AuthMiddleware, error) {
	issuerURL, err := url.Parse("https://" + domain + "/")
	if err != nil {
		return nil, fmt.Errorf("failed to parse issuer URL: %w", err)
	}

	// Use configurable JWKS cache TTL (default 5 minutes if not specified)
	jwksCacheTTL := time.Duration(jwksCacheTTLMinutes) * time.Minute
	if jwksCacheTTL <= 0 {
		jwksCacheTTL = 5 * time.Minute
	}
	provider := jwks.NewCachingProvider(issuerURL, jwksCacheTTL)

	jwtValidator, err := validator.New(
		provider.KeyFunc,
		validator.RS256,
		issuerURL.String(),
		[]string{audience},
		validator.WithCustomClaims(func() validator.CustomClaims {
			return &CustomClaims{}
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create JWT validator: %w", err)
	}

	return &AuthMiddleware{
		validator:      jwtValidator,
		userRepository: userRepo,
	}, nil
}

func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		token := parts[1]

		claims, err := m.validator.ValidateToken(r.Context(), token)
		if err != nil {
			http.Error(w, "Invalid token: "+err.Error(), http.StatusUnauthorized)
			return
		}

		validatedClaims, ok := claims.(*validator.ValidatedClaims)
		if !ok {
			http.Error(w, "Invalid claims", http.StatusUnauthorized)
			return
		}

		customClaims, ok := validatedClaims.CustomClaims.(*CustomClaims)
		if !ok {
			customClaims = &CustomClaims{}
		}

		auth0ID := validatedClaims.RegisteredClaims.Subject

		// Try to get user from database, create if doesn't exist
		user, err := m.userRepository.GetByAuth0ID(r.Context(), auth0ID)
		if err != nil {
			// User doesn't exist, create them
			firstName, lastName := parseName(customClaims.Name)
			user, err = m.userRepository.CreateOrUpdate(r.Context(), auth0ID, customClaims.Email, firstName, lastName)
			if err != nil {
				http.Error(w, "Failed to create user", http.StatusInternalServerError)
				return
			}
		}

		// Store the real authenticated user
		ctx := context.WithValue(r.Context(), RealUserContextKey, user)
		ctx = context.WithValue(ctx, ClaimsContextKey, validatedClaims)

		// Check for impersonation header (admin only)
		effectiveUser := user
		isImpersonating := false
		if impersonateHeader := r.Header.Get("X-Impersonate-User-Id"); impersonateHeader != "" {
			// Only admins can impersonate
			if user.Role == models.RoleAdmin {
				impersonateID, err := strconv.ParseInt(impersonateHeader, 10, 64)
				if err == nil && impersonateID != user.ID {
					impersonatedUser, err := m.userRepository.GetByID(r.Context(), impersonateID)
					if err == nil {
						effectiveUser = impersonatedUser
						isImpersonating = true
					}
				}
			}
		}

		ctx = context.WithValue(ctx, UserContextKey, effectiveUser)
		ctx = context.WithValue(ctx, ImpersonationContextKey, isImpersonating)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *AuthMiddleware) RequireRole(role models.Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := GetUserFromContext(r.Context())
			if user == nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			if user.Role != role {
				http.Error(w, "Forbidden: insufficient permissions", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// GetUserFromContext returns the effective user (impersonated if applicable)
func GetUserFromContext(ctx context.Context) *models.User {
	user, ok := ctx.Value(UserContextKey).(*models.User)
	if !ok {
		return nil
	}
	return user
}

// GetRealUserFromContext returns the actual authenticated user (ignoring impersonation)
func GetRealUserFromContext(ctx context.Context) *models.User {
	user, ok := ctx.Value(RealUserContextKey).(*models.User)
	if !ok {
		return nil
	}
	return user
}

// IsImpersonating returns true if the current request is using impersonation
func IsImpersonating(ctx context.Context) bool {
	isImpersonating, ok := ctx.Value(ImpersonationContextKey).(bool)
	return ok && isImpersonating
}

func parseName(name string) (string, string) {
	parts := strings.SplitN(strings.TrimSpace(name), " ", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	if len(parts) == 1 && parts[0] != "" {
		return parts[0], ""
	}
	return "Unknown", "User"
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
