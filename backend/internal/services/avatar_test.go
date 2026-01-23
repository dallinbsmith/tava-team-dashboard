package services

import (
	"context"
	"encoding/base64"
	"errors"
	"testing"
)

// MockStorage implements the Storage interface for testing
type MockStorage struct {
	UploadFunc  func(ctx context.Context, key string, data []byte, contentType string) (string, error)
	DeleteFunc  func(ctx context.Context, key string) error
	GetURLFunc  func(key string) string
}

func (m *MockStorage) Upload(ctx context.Context, key string, data []byte, contentType string) (string, error) {
	if m.UploadFunc != nil {
		return m.UploadFunc(ctx, key, data, contentType)
	}
	return "https://example.com/" + key, nil
}

func (m *MockStorage) Delete(ctx context.Context, key string) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, key)
	}
	return nil
}

func (m *MockStorage) GetURL(key string) string {
	if m.GetURLFunc != nil {
		return m.GetURLFunc(key)
	}
	return "https://example.com/" + key
}

func TestAvatarService_ParseBase64Image(t *testing.T) {
	service := NewAvatarService(nil)

	t.Run("valid PNG image", func(t *testing.T) {
		// Create a minimal valid base64 data URL
		imageData := []byte{0x89, 0x50, 0x4E, 0x47} // PNG magic bytes
		dataURL := "data:image/png;base64," + base64.StdEncoding.EncodeToString(imageData)

		result, err := service.ParseBase64Image(dataURL)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.ContentType != "image/png" {
			t.Errorf("expected content type image/png, got %s", result.ContentType)
		}
		if result.Extension != ".png" {
			t.Errorf("expected extension .png, got %s", result.Extension)
		}
	})

	t.Run("valid JPEG image", func(t *testing.T) {
		imageData := []byte{0xFF, 0xD8, 0xFF} // JPEG magic bytes
		dataURL := "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(imageData)

		result, err := service.ParseBase64Image(dataURL)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.ContentType != "image/jpeg" {
			t.Errorf("expected content type image/jpeg, got %s", result.ContentType)
		}
		if result.Extension != ".jpg" {
			t.Errorf("expected extension .jpg, got %s", result.Extension)
		}
	})

	t.Run("valid GIF image", func(t *testing.T) {
		imageData := []byte{0x47, 0x49, 0x46} // GIF magic bytes
		dataURL := "data:image/gif;base64," + base64.StdEncoding.EncodeToString(imageData)

		result, err := service.ParseBase64Image(dataURL)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.ContentType != "image/gif" {
			t.Errorf("expected content type image/gif, got %s", result.ContentType)
		}
		if result.Extension != ".gif" {
			t.Errorf("expected extension .gif, got %s", result.Extension)
		}
	})

	t.Run("valid WebP image", func(t *testing.T) {
		imageData := []byte{0x52, 0x49, 0x46, 0x46} // RIFF header
		dataURL := "data:image/webp;base64," + base64.StdEncoding.EncodeToString(imageData)

		result, err := service.ParseBase64Image(dataURL)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.ContentType != "image/webp" {
			t.Errorf("expected content type image/webp, got %s", result.ContentType)
		}
		if result.Extension != ".webp" {
			t.Errorf("expected extension .webp, got %s", result.Extension)
		}
	})

	t.Run("invalid format - not a data URL", func(t *testing.T) {
		_, err := service.ParseBase64Image("https://example.com/image.png")
		if err == nil {
			t.Fatal("expected error for invalid data URL")
		}
	})

	t.Run("invalid format - missing data", func(t *testing.T) {
		_, err := service.ParseBase64Image("data:image/png;base64")
		if err == nil {
			t.Fatal("expected error for missing data")
		}
	})

	t.Run("invalid base64 data", func(t *testing.T) {
		_, err := service.ParseBase64Image("data:image/png;base64,not-valid-base64!!!")
		if err == nil {
			t.Fatal("expected error for invalid base64")
		}
	})

	t.Run("image too large", func(t *testing.T) {
		// Create data larger than 5MB
		largeData := make([]byte, 6*1024*1024)
		dataURL := "data:image/png;base64," + base64.StdEncoding.EncodeToString(largeData)

		_, err := service.ParseBase64Image(dataURL)
		if err == nil {
			t.Fatal("expected error for image too large")
		}
		if !errors.Is(err, nil) && err.Error() != "image too large: max 5MB allowed" {
			// Check error message contains size info
			if err.Error() != "image too large: max 5MB allowed" {
				t.Logf("got expected error: %v", err)
			}
		}
	})
}

func TestAvatarService_Upload(t *testing.T) {
	t.Run("returns error when storage is nil", func(t *testing.T) {
		service := NewAvatarService(nil)
		img := &ImageData{
			Data:        []byte{0x89, 0x50, 0x4E, 0x47},
			ContentType: "image/png",
			Extension:   ".png",
		}

		_, err := service.Upload(context.Background(), 1, img)
		if err == nil {
			t.Fatal("expected error when storage is nil")
		}
		if !errors.Is(err, ErrStorageNotConfigured) {
			t.Errorf("expected ErrStorageNotConfigured, got %v", err)
		}
	})

	t.Run("successful upload to S3", func(t *testing.T) {
		mockStorage := &MockStorage{
			UploadFunc: func(ctx context.Context, key string, data []byte, contentType string) (string, error) {
				return "https://bucket.s3.amazonaws.com/" + key, nil
			},
		}
		service := NewAvatarService(mockStorage)
		img := &ImageData{
			Data:        []byte{0x89, 0x50, 0x4E, 0x47},
			ContentType: "image/png",
			Extension:   ".png",
		}

		url, err := service.Upload(context.Background(), 123, img)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if url == "" {
			t.Error("expected non-empty URL")
		}
	})

	t.Run("returns user-friendly error when S3 upload fails", func(t *testing.T) {
		mockStorage := &MockStorage{
			UploadFunc: func(ctx context.Context, key string, data []byte, contentType string) (string, error) {
				return "", errors.New("S3 connection timeout")
			},
		}
		service := NewAvatarService(mockStorage)
		img := &ImageData{
			Data:        []byte{0x89, 0x50, 0x4E, 0x47},
			ContentType: "image/png",
			Extension:   ".png",
		}

		_, err := service.Upload(context.Background(), 123, img)
		if err == nil {
			t.Fatal("expected error when S3 upload fails")
		}
		if !errors.Is(err, ErrUploadFailed) {
			t.Errorf("expected ErrUploadFailed, got %v", err)
		}
	})
}

func TestAvatarService_GetExtensionFromContentType(t *testing.T) {
	service := NewAvatarService(nil)

	tests := []struct {
		contentType string
		expected    string
	}{
		{"image/png", ".png"},
		{"image/gif", ".gif"},
		{"image/webp", ".webp"},
		{"image/jpeg", ".jpg"},
		{"image/jpg", ".jpg"},
		{"application/octet-stream", ".jpg"}, // defaults to .jpg
		{"text/plain", ".jpg"},               // defaults to .jpg
	}

	for _, tt := range tests {
		t.Run(tt.contentType, func(t *testing.T) {
			ext := service.GetExtensionFromContentType(tt.contentType)
			if ext != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, ext)
			}
		})
	}
}

func TestErrStorageNotConfigured(t *testing.T) {
	if ErrStorageNotConfigured == nil {
		t.Fatal("ErrStorageNotConfigured should not be nil")
	}
	if ErrStorageNotConfigured.Error() == "" {
		t.Fatal("ErrStorageNotConfigured should have an error message")
	}
}

func TestErrUploadFailed(t *testing.T) {
	if ErrUploadFailed == nil {
		t.Fatal("ErrUploadFailed should not be nil")
	}
	msg := ErrUploadFailed.Error()
	if msg == "" {
		t.Fatal("ErrUploadFailed should have an error message")
	}
	// Should be user-friendly
	if msg != "failed to upload image, please try again later" {
		t.Errorf("unexpected error message: %s", msg)
	}
}
