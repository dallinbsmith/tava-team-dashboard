package storage

import (
	"os"
	"path/filepath"
)

// createDirIfNotExists creates a directory if it doesn't exist
func createDirIfNotExists(dir string) error {
	return os.MkdirAll(dir, 0755)
}

// writeFile writes data to a file
func writeFile(path string, data []byte) error {
	return os.WriteFile(path, data, 0644)
}

// deleteFile removes a file
func deleteFile(path string) error {
	return os.Remove(path)
}

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
