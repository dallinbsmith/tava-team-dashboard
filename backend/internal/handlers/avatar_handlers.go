package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/smith-dallin/manager-dashboard/internal/logger"
	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository"
	"github.com/smith-dallin/manager-dashboard/internal/services"
)

// AvatarHandlers handles avatar-related HTTP requests
type AvatarHandlers struct {
	userRepo      repository.UserRepository
	avatarService *services.AvatarService
	maxSizeMB     int
	logger        *logger.Logger
}

// NewAvatarHandlers creates a new avatar handlers instance
func NewAvatarHandlers(userRepo repository.UserRepository, avatarService *services.AvatarService) *AvatarHandlers {
	return NewAvatarHandlersWithConfig(userRepo, avatarService, 5) // Default 5MB
}

// NewAvatarHandlersWithConfig creates a new avatar handlers instance with custom max size
func NewAvatarHandlersWithConfig(userRepo repository.UserRepository, avatarService *services.AvatarService, maxSizeMB int) *AvatarHandlers {
	if maxSizeMB <= 0 {
		maxSizeMB = 5
	}
	return &AvatarHandlers{
		userRepo:      userRepo,
		avatarService: avatarService,
		maxSizeMB:     maxSizeMB,
		logger:        logger.Default().WithComponent("avatar"),
	}
}

// checkAvatarPermission verifies the current user can upload an avatar for the target user
func (h *AvatarHandlers) checkAvatarPermission(w http.ResponseWriter, r *http.Request, targetUserID int64) (*models.User, bool) {
	currentUser := requireAuth(w, r)
	if currentUser == nil {
		return nil, false
	}

	// Users can upload their own avatar
	if currentUser.ID == targetUserID {
		return currentUser, true
	}

	// Supervisors/admins can upload avatars for their direct reports
	targetUser, err := h.userRepo.GetByID(r.Context(), targetUserID)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return nil, false
	}

	if !currentUser.CanManage(targetUser) {
		respondError(w, http.StatusForbidden, "Forbidden")
		return nil, false
	}

	return currentUser, true
}

// UploadAvatar handles avatar image upload via multipart form
func (h *AvatarHandlers) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	if _, ok := h.checkAvatarPermission(w, r, id); !ok {
		return
	}

	// Parse multipart form with configurable max size
	maxBytes := int64(h.maxSizeMB) << 20
	if err := r.ParseMultipartForm(maxBytes); err != nil {
		respondError(w, http.StatusBadRequest, fmt.Sprintf("File too large (max %dMB)", h.maxSizeMB))
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		respondError(w, http.StatusBadRequest, "No file uploaded")
		return
	}
	defer func() { _ = file.Close() }()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		respondError(w, http.StatusBadRequest, "File must be an image")
		return
	}

	// Read file content
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to read file")
		return
	}

	// Validate size
	if len(fileBytes) > int(maxBytes) {
		respondError(w, http.StatusBadRequest, fmt.Sprintf("Image too large (max %dMB)", h.maxSizeMB))
		return
	}

	// Create image data struct
	img := &services.ImageData{
		Data:        fileBytes,
		ContentType: contentType,
		Extension:   h.avatarService.GetExtensionFromContentType(contentType),
	}

	// Upload using the avatar service
	avatarURL, err := h.avatarService.Upload(r.Context(), id, img)
	if err != nil {
		respondError(w, http.StatusServiceUnavailable, "Image upload is temporarily unavailable. Please try again later.")
		return
	}

	// Update user's avatar URL
	req := &models.UpdateUserRequest{
		AvatarURL: &avatarURL,
	}

	user, err := h.userRepo.Update(r.Context(), id, req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update avatar URL")
		return
	}

	respondJSON(w, http.StatusOK, user.ToUserResponse())
}

// UploadAvatarBase64 handles avatar upload as base64 encoded data
func (h *AvatarHandlers) UploadAvatarBase64(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDParam(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	if _, ok := h.checkAvatarPermission(w, r, id); !ok {
		return
	}

	var req struct {
		Image string `json:"image"` // base64 encoded image with data URL prefix
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Parse and validate the base64 image using the avatar service
	img, err := h.avatarService.ParseBase64Image(req.Image)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid image format: please upload a valid JPEG, PNG, GIF, or WebP image")
		return
	}

	// Upload using the avatar service
	avatarURL, err := h.avatarService.Upload(r.Context(), id, img)
	if err != nil {
		h.logger.LogError(r.Context(), "Avatar upload (base64) failed", err, "user_id", id)
		respondError(w, http.StatusServiceUnavailable, "Image upload is temporarily unavailable. Please try again later.")
		return
	}

	// Update user's avatar URL
	updateReq := &models.UpdateUserRequest{
		AvatarURL: &avatarURL,
	}

	user, err := h.userRepo.Update(r.Context(), id, updateReq)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update avatar URL")
		return
	}

	respondJSON(w, http.StatusOK, user.ToUserResponse())
}
