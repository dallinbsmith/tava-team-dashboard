package storage

import (
	"testing"
)

func TestExtractKeyFromURL(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		baseURL  string
		expected string
	}{
		{
			name:     "extracts key from full URL with base URL",
			url:      "https://cdn.example.com/avatars/123_456.png",
			baseURL:  "https://cdn.example.com",
			expected: "avatars/123_456.png",
		},
		{
			name:     "handles base URL with trailing slash",
			url:      "https://cdn.example.com/avatars/123_456.png",
			baseURL:  "https://cdn.example.com/",
			expected: "avatars/123_456.png",
		},
		{
			name:     "extracts filename when no base URL",
			url:      "https://cdn.example.com/avatars/123_456.png",
			baseURL:  "",
			expected: "123_456.png",
		},
		{
			name:     "handles URL shorter than base URL",
			url:      "short",
			baseURL:  "https://cdn.example.com",
			expected: "short",
		},
		{
			name:     "handles S3 URL format",
			url:      "https://bucket.s3.us-west-2.amazonaws.com/avatars/123_456.png",
			baseURL:  "https://bucket.s3.us-west-2.amazonaws.com",
			expected: "avatars/123_456.png",
		},
		{
			name:     "handles local file path",
			url:      "/uploads/avatars/123_456.png",
			baseURL:  "/uploads",
			expected: "avatars/123_456.png",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ExtractKeyFromURL(tt.url, tt.baseURL)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestGenerateAvatarKey(t *testing.T) {
	t.Run("generates key with correct format", func(t *testing.T) {
		key := GenerateAvatarKey(123, ".png")

		// Should start with avatars/
		if len(key) < 8 || key[:8] != "avatars/" {
			t.Errorf("key should start with 'avatars/', got %s", key)
		}

		// Should contain the user ID
		if key[8:11] != "123" {
			t.Errorf("key should contain user ID 123, got %s", key)
		}

		// Should end with the extension
		if key[len(key)-4:] != ".png" {
			t.Errorf("key should end with .png, got %s", key)
		}
	})

	t.Run("generates keys with timestamp component", func(t *testing.T) {
		key := GenerateAvatarKey(123, ".png")

		// Key format: avatars/{userID}_{timestamp}{extension}
		// Should have underscores separating user ID and timestamp
		if key[11] != '_' {
			t.Errorf("key should have underscore after user ID, got %s", key)
		}

		// Generate multiple keys and verify they all have the expected format
		for i := 0; i < 5; i++ {
			k := GenerateAvatarKey(int64(i), ".jpg")
			if len(k) < 20 {
				t.Errorf("key seems too short, expected timestamp component: %s", k)
			}
		}
	})

	t.Run("handles different extensions", func(t *testing.T) {
		extensions := []string{".png", ".jpg", ".gif", ".webp"}
		for _, ext := range extensions {
			key := GenerateAvatarKey(1, ext)
			if key[len(key)-len(ext):] != ext {
				t.Errorf("key should end with %s, got %s", ext, key)
			}
		}
	})
}

func TestGetContentType(t *testing.T) {
	tests := []struct {
		extension   string
		contentType string
	}{
		{".jpg", "image/jpeg"},
		{".jpeg", "image/jpeg"},
		{".JPG", "image/jpeg"},
		{".JPEG", "image/jpeg"},
		{".png", "image/png"},
		{".PNG", "image/png"},
		{".gif", "image/gif"},
		{".GIF", "image/gif"},
		{".webp", "image/webp"},
		{".WEBP", "image/webp"},
		{".txt", "application/octet-stream"},
		{".pdf", "application/octet-stream"},
		{"", "application/octet-stream"},
	}

	for _, tt := range tests {
		t.Run(tt.extension, func(t *testing.T) {
			result := GetContentType(tt.extension)
			if result != tt.contentType {
				t.Errorf("expected %s, got %s", tt.contentType, result)
			}
		})
	}
}
