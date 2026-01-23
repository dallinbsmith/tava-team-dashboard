package storage

import (
	"path/filepath"
)

// ExtractKeyFromURL extracts the storage key from a full URL
// Useful when deleting old avatars
func ExtractKeyFromURL(url, baseURL string) string {
	if baseURL != "" && len(url) > len(baseURL) {
		key := url[len(baseURL):]
		// Remove leading slash if present
		if len(key) > 0 && key[0] == '/' {
			key = key[1:]
		}
		return key
	}
	// Try to extract from path
	return filepath.Base(url)
}
