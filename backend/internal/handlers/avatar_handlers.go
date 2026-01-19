package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/smith-dallin/manager-dashboard/internal/models"
	"github.com/smith-dallin/manager-dashboard/internal/repository"
	"github.com/smith-dallin/manager-dashboard/internal/services"
)

// AvatarHandlers handles avatar-related HTTP requests
type AvatarHandlers struct {
	userRepo      repository.UserRepository
	avatarService *services.AvatarService
}

// NewAvatarHandlers creates a new avatar handlers instance
func NewAvatarHandlers(userRepo repository.UserRepository, avatarService *services.AvatarService) *AvatarHandlers {
	return &AvatarHandlers{
		userRepo:      userRepo,
		avatarService: avatarService,
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

	// Parse multipart form (max 5MB)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		respondError(w, http.StatusBadRequest, "File too large (max 5MB)")
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		respondError(w, http.StatusBadRequest, "No file uploaded")
		return
	}
	defer file.Close()

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
	if len(fileBytes) > 5<<20 {
		respondError(w, http.StatusBadRequest, "Image too large (max 5MB)")
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
		respondError(w, http.StatusInternalServerError, "Failed to upload file")
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

	respondJSON(w, http.StatusOK, user)
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
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Upload using the avatar service
	avatarURL, err := h.avatarService.Upload(r.Context(), id, img)
	if err != nil {
		log.Printf("Avatar upload (base64) failed for user %d: %v", id, err)
		respondError(w, http.StatusInternalServerError, "Failed to upload file")
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

	respondJSON(w, http.StatusOK, user)
}
