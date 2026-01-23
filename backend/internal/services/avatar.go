package services

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/smith-dallin/manager-dashboard/internal/logger"
	"github.com/smith-dallin/manager-dashboard/internal/storage"
)

// AvatarService handles avatar image processing and storage
type AvatarService struct {
	storage storage.Storage
	logger  *logger.Logger
}

// NewAvatarService creates a new avatar service
func NewAvatarService(store storage.Storage) *AvatarService {
	return &AvatarService{
		storage: store,
		logger:  logger.Default().WithComponent("avatar-service"),
	}
}

// ImageData represents parsed image data
type ImageData struct {
	Data        []byte
	ContentType string
	Extension   string
}

// ParseBase64Image parses a base64 data URL into image data
func (s *AvatarService) ParseBase64Image(dataURL string) (*ImageData, error) {
	// Validate data URL format: data:image/png;base64,<data>
	if !strings.HasPrefix(dataURL, "data:image/") {
		return nil, fmt.Errorf("invalid image format: must be a data URL")
	}

	// Extract content type and base64 data
	parts := strings.SplitN(dataURL, ",", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid image format: missing data")
	}

	// Decode base64
	imageData, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid base64 data: %w", err)
	}

	// Validate size (max 5MB)
	if len(imageData) > 5<<20 {
		return nil, fmt.Errorf("image too large: max 5MB allowed")
	}

	// Determine content type and extension
	contentType, ext := s.parseContentType(parts[0])

	return &ImageData{
		Data:        imageData,
		ContentType: contentType,
		Extension:   ext,
	}, nil
}

// parseContentType extracts content type and file extension from data URL prefix
func (s *AvatarService) parseContentType(prefix string) (contentType, ext string) {
	contentType = "image/jpeg"
	ext = ".jpg"

	if strings.Contains(prefix, "png") {
		contentType = "image/png"
		ext = ".png"
	} else if strings.Contains(prefix, "gif") {
		contentType = "image/gif"
		ext = ".gif"
	} else if strings.Contains(prefix, "webp") {
		contentType = "image/webp"
		ext = ".webp"
	}

	return contentType, ext
}

// GetExtensionFromContentType returns file extension for a content type
func (s *AvatarService) GetExtensionFromContentType(contentType string) string {
	switch contentType {
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	default:
		return ".jpg"
	}
}

// ErrStorageNotConfigured is returned when S3 storage is not configured
var ErrStorageNotConfigured = fmt.Errorf("image storage is not configured")

// ErrUploadFailed is returned when the upload fails
var ErrUploadFailed = fmt.Errorf("failed to upload image, please try again later")

// Upload stores an avatar image and returns the URL
func (s *AvatarService) Upload(ctx context.Context, userID int64, img *ImageData) (string, error) {
	if s.storage == nil {
		s.logger.LogError(ctx, "S3 storage not configured", ErrStorageNotConfigured, "user_id", userID)
		return "", ErrStorageNotConfigured
	}

	key := storage.GenerateAvatarKey(userID, img.Extension)
	url, err := s.storage.Upload(ctx, key, img.Data, img.ContentType)
	if err != nil {
		s.logger.LogError(ctx, "S3 upload failed", err, "user_id", userID)
		return "", ErrUploadFailed
	}
	s.logger.Info("S3 upload successful", "user_id", userID, "url", url)
	return url, nil
}
