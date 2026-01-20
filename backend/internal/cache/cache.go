package cache

import (
	"sync"
	"time"
)

// Item represents a cached item with its value and expiration time
type Item struct {
	Value      interface{}
	Expiration int64
}

// IsExpired returns true if the item has expired
func (item Item) IsExpired() bool {
	if item.Expiration == 0 {
		return false
	}
	return time.Now().UnixNano() > item.Expiration
}

// Cache is a thread-safe in-memory cache with TTL support
type Cache struct {
	items      map[string]Item
	mu         sync.RWMutex
	defaultTTL time.Duration
	cleanupInt time.Duration
	stopCleanup chan struct{}
}

// New creates a new cache with the specified default TTL and cleanup interval
func New(defaultTTL, cleanupInterval time.Duration) *Cache {
	c := &Cache{
		items:      make(map[string]Item),
		defaultTTL: defaultTTL,
		cleanupInt: cleanupInterval,
		stopCleanup: make(chan struct{}),
	}

	if cleanupInterval > 0 {
		go c.startCleanup()
	}

	return c
}

// Set adds an item to the cache with the default TTL
func (c *Cache) Set(key string, value interface{}) {
	c.SetWithTTL(key, value, c.defaultTTL)
}

// SetWithTTL adds an item to the cache with a specific TTL
func (c *Cache) SetWithTTL(key string, value interface{}, ttl time.Duration) {
	var expiration int64
	if ttl > 0 {
		expiration = time.Now().Add(ttl).UnixNano()
	}

	c.mu.Lock()
	c.items[key] = Item{
		Value:      value,
		Expiration: expiration,
	}
	c.mu.Unlock()
}

// Get retrieves an item from the cache
// Returns the value and true if found and not expired, otherwise nil and false
func (c *Cache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	item, found := c.items[key]
	c.mu.RUnlock()

	if !found {
		return nil, false
	}

	if item.IsExpired() {
		c.Delete(key)
		return nil, false
	}

	return item.Value, true
}

// Delete removes an item from the cache
func (c *Cache) Delete(key string) {
	c.mu.Lock()
	delete(c.items, key)
	c.mu.Unlock()
}

// DeletePrefix removes all items with keys starting with the given prefix
func (c *Cache) DeletePrefix(prefix string) {
	c.mu.Lock()
	for key := range c.items {
		if len(key) >= len(prefix) && key[:len(prefix)] == prefix {
			delete(c.items, key)
		}
	}
	c.mu.Unlock()
}

// Clear removes all items from the cache
func (c *Cache) Clear() {
	c.mu.Lock()
	c.items = make(map[string]Item)
	c.mu.Unlock()
}

// Count returns the number of items in the cache (including expired)
func (c *Cache) Count() int {
	c.mu.RLock()
	count := len(c.items)
	c.mu.RUnlock()
	return count
}

// Stop stops the cleanup goroutine
func (c *Cache) Stop() {
	close(c.stopCleanup)
}

// startCleanup runs the cleanup routine
func (c *Cache) startCleanup() {
	ticker := time.NewTicker(c.cleanupInt)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.deleteExpired()
		case <-c.stopCleanup:
			return
		}
	}
}

// deleteExpired removes all expired items from the cache
func (c *Cache) deleteExpired() {
	c.mu.Lock()
	for key, item := range c.items {
		if item.IsExpired() {
			delete(c.items, key)
		}
	}
	c.mu.Unlock()
}

// GetOrSet retrieves an item from cache, or calls the function to populate it
func (c *Cache) GetOrSet(key string, fn func() (interface{}, error)) (interface{}, error) {
	if value, found := c.Get(key); found {
		return value, nil
	}

	value, err := fn()
	if err != nil {
		return nil, err
	}

	c.Set(key, value)
	return value, nil
}

// GetOrSetWithTTL retrieves an item from cache, or calls the function to populate it with specific TTL
func (c *Cache) GetOrSetWithTTL(key string, ttl time.Duration, fn func() (interface{}, error)) (interface{}, error) {
	if value, found := c.Get(key); found {
		return value, nil
	}

	value, err := fn()
	if err != nil {
		return nil, err
	}

	c.SetWithTTL(key, value, ttl)
	return value, nil
}
