package storage

import (
	"bytes"
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	appconfig "github.com/smith-dallin/manager-dashboard/config"
)

// Storage interface for file operations
type Storage interface {
	Upload(ctx context.Context, key string, data []byte, contentType string) (string, error)
	Delete(ctx context.Context, key string) error
	GetURL(key string) string
}

// S3Storage implements Storage interface for AWS S3 and compatible services
type S3Storage struct {
	client    *s3.Client
	bucket    string
	publicURL string
	region    string
	timeout   time.Duration
}

// NewS3Storage creates a new S3 storage instance
func NewS3Storage(cfg *appconfig.Config) (*S3Storage, error) {
	if !cfg.S3Enabled {
		return nil, fmt.Errorf("S3 is not enabled")
	}

	// Create custom credentials provider
	creds := credentials.NewStaticCredentialsProvider(
		cfg.S3AccessKeyID,
		cfg.S3SecretAccessKey,
		"",
	)

	// Build AWS config options
	opts := []func(*config.LoadOptions) error{
		config.WithRegion(cfg.S3Region),
		config.WithCredentialsProvider(creds),
	}

	// Load AWS config
	awsCfg, err := config.LoadDefaultConfig(context.Background(), opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Create S3 client options
	s3Opts := []func(*s3.Options){}

	// If custom endpoint is provided (for R2, MinIO, etc.)
	if cfg.S3Endpoint != "" {
		s3Opts = append(s3Opts, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(cfg.S3Endpoint)
			o.UsePathStyle = true // Required for most S3-compatible services
		})
	}

	client := s3.NewFromConfig(awsCfg, s3Opts...)

	return &S3Storage{
		client:    client,
		bucket:    cfg.S3Bucket,
		publicURL: cfg.S3PublicURL,
		region:    cfg.S3Region,
		timeout:   time.Duration(cfg.S3TimeoutSecs) * time.Second,
	}, nil
}

// Upload uploads a file to S3 and returns the public URL
func (s *S3Storage) Upload(ctx context.Context, key string, data []byte, contentType string) (string, error) {
	// Apply timeout to prevent indefinite blocking on slow uploads
	ctx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	input := &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
	}

	_, err := s.client.PutObject(ctx, input)
	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %w", err)
	}

	return s.GetURL(key), nil
}

// Delete removes a file from S3
func (s *S3Storage) Delete(ctx context.Context, key string) error {
	// Apply timeout to prevent indefinite blocking
	ctx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	input := &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	_, err := s.client.DeleteObject(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to delete from S3: %w", err)
	}

	return nil
}

// GetURL returns the public URL for a given key
func (s *S3Storage) GetURL(key string) string {
	if s.publicURL != "" {
		// Use custom public URL (for CDN or custom domains)
		return fmt.Sprintf("%s/%s", strings.TrimRight(s.publicURL, "/"), key)
	}

	// Default S3 URL format
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucket, s.region, key)
}

// LocalStorage implements Storage interface for local file system (fallback)
type LocalStorage struct {
	basePath  string
	baseURL   string
}

// NewLocalStorage creates a new local storage instance
func NewLocalStorage(basePath, baseURL string) *LocalStorage {
	return &LocalStorage{
		basePath: basePath,
		baseURL:  baseURL,
	}
}

// Upload saves a file locally and returns the URL
func (l *LocalStorage) Upload(ctx context.Context, key string, data []byte, contentType string) (string, error) {
	fullPath := filepath.Join(l.basePath, key)

	// Create directory if needed
	dir := filepath.Dir(fullPath)
	if err := createDirIfNotExists(dir); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	// Write file
	if err := writeFile(fullPath, data); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	return l.GetURL(key), nil
}

// Delete removes a local file
func (l *LocalStorage) Delete(ctx context.Context, key string) error {
	fullPath := filepath.Join(l.basePath, key)
	return deleteFile(fullPath)
}

// GetURL returns the URL for a local file
func (l *LocalStorage) GetURL(key string) string {
	return fmt.Sprintf("%s/%s", strings.TrimRight(l.baseURL, "/"), key)
}

// GenerateAvatarKey creates a unique key for avatar storage
func GenerateAvatarKey(userID int64, extension string) string {
	timestamp := time.Now().UnixNano()
	return fmt.Sprintf("avatars/%d_%d%s", userID, timestamp, extension)
}

// Helper to get content type from extension
func GetContentType(extension string) string {
	switch strings.ToLower(extension) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	default:
		return "application/octet-stream"
	}
}
