package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/auth0/go-jwt-middleware/v2/jwks"
	"github.com/auth0/go-jwt-middleware/v2/validator"
	"github.com/smith-dallin/manager-dashboard/internal/database"
	"github.com/smith-dallin/manager-dashboard/internal/models"
)

type contextKey string

const (
	UserContextKey   contextKey = "user"
	ClaimsContextKey contextKey = "claims"
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

func NewAuthMiddleware(domain, audience string, userRepo *database.UserRepository) (*AuthMiddleware, error) {
	issuerURL, err := url.Parse("https://" + domain + "/")
	if err != nil {
		return nil, fmt.Errorf("failed to parse issuer URL: %w", err)
	}

	provider := jwks.NewCachingProvider(issuerURL, 5*time.Minute)

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

		ctx := context.WithValue(r.Context(), UserContextKey, user)
		ctx = context.WithValue(ctx, ClaimsContextKey, validatedClaims)

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

func GetUserFromContext(ctx context.Context) *models.User {
	user, ok := ctx.Value(UserContextKey).(*models.User)
	if !ok {
		return nil
	}
	return user
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
