package cache

import (
	"errors"
	"sync"
	"testing"
	"time"
)

func TestNew(t *testing.T) {
	c := New(time.Minute, 0)
	defer c.Stop()

	if c == nil {
		t.Fatal("expected cache to be created")
	}
	if c.defaultTTL != time.Minute {
		t.Errorf("expected defaultTTL %v, got %v", time.Minute, c.defaultTTL)
	}
}

func TestSetAndGet(t *testing.T) {
	c := New(time.Minute, 0)
	defer c.Stop()

	// Test basic set and get
	c.Set("key1", "value1")
	val, found := c.Get("key1")
	if !found {
		t.Fatal("expected to find key1")
	}
	if val != "value1" {
		t.Errorf("expected value1, got %v", val)
	}

	// Test get non-existent key
	_, found = c.Get("nonexistent")
	if found {
		t.Error("expected not to find nonexistent key")
	}
}

func TestSetWithTTL(t *testing.T) {
	c := New(time.Hour, 0)
	defer c.Stop()

	// Set with short TTL
	c.SetWithTTL("shortkey", "shortvalue", 50*time.Millisecond)

	// Should exist immediately
	val, found := c.Get("shortkey")
	if !found {
		t.Fatal("expected to find shortkey immediately")
	}
	if val != "shortvalue" {
		t.Errorf("expected shortvalue, got %v", val)
	}

	// Wait for expiration
	time.Sleep(100 * time.Millisecond)

	// Should be expired now
	_, found = c.Get("shortkey")
	if found {
		t.Error("expected shortkey to be expired")
	}
}

func TestSetWithZeroTTL(t *testing.T) {
	c := New(0, 0)
	defer c.Stop()

	// Set with zero TTL (never expires)
	c.SetWithTTL("permanent", "value", 0)

	val, found := c.Get("permanent")
	if !found {
		t.Fatal("expected to find permanent key")
	}
	if val != "value" {
		t.Errorf("expected value, got %v", val)
	}
}

func TestDelete(t *testing.T) {
	c := New(time.Minute, 0)
	defer c.Stop()

	c.Set("key", "value")
	c.Delete("key")

	_, found := c.Get("key")
	if found {
		t.Error("expected key to be deleted")
	}
}

func TestDeletePrefix(t *testing.T) {
	c := New(time.Minute, 0)
	defer c.Stop()

	c.Set("users:1", "user1")
	c.Set("users:2", "user2")
	c.Set("users:3", "user3")
	c.Set("squads:1", "squad1")

	c.DeletePrefix("users:")

	// Users should be deleted
	if _, found := c.Get("users:1"); found {
		t.Error("expected users:1 to be deleted")
	}
	if _, found := c.Get("users:2"); found {
		t.Error("expected users:2 to be deleted")
	}
	if _, found := c.Get("users:3"); found {
		t.Error("expected users:3 to be deleted")
	}

	// Squads should remain
	if _, found := c.Get("squads:1"); !found {
		t.Error("expected squads:1 to remain")
	}
}

func TestClear(t *testing.T) {
	c := New(time.Minute, 0)
	defer c.Stop()

	c.Set("key1", "value1")
	c.Set("key2", "value2")
	c.Clear()

	if c.Count() != 0 {
		t.Errorf("expected count 0 after clear, got %d", c.Count())
	}
}

func TestCount(t *testing.T) {
	c := New(time.Minute, 0)
	defer c.Stop()

	if c.Count() != 0 {
		t.Errorf("expected initial count 0, got %d", c.Count())
	}

	c.Set("key1", "value1")
	c.Set("key2", "value2")

	if c.Count() != 2 {
		t.Errorf("expected count 2, got %d", c.Count())
	}
}

func TestGetOrSet(t *testing.T) {
	c := New(time.Minute, 0)
	defer c.Stop()

	callCount := 0
	fn := func() (interface{}, error) {
		callCount++
		return "computed_value", nil
	}

	// First call should invoke the function
	val, err := c.GetOrSet("key", fn)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if val != "computed_value" {
		t.Errorf("expected computed_value, got %v", val)
	}
	if callCount != 1 {
		t.Errorf("expected function to be called once, got %d", callCount)
	}

	// Second call should use cache
	val, err = c.GetOrSet("key", fn)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if val != "computed_value" {
		t.Errorf("expected computed_value, got %v", val)
	}
	if callCount != 1 {
		t.Errorf("expected function to still be called once, got %d", callCount)
	}
}

func TestGetOrSetWithError(t *testing.T) {
	c := New(time.Minute, 0)
	defer c.Stop()

	expectedErr := errors.New("fetch failed")
	fn := func() (interface{}, error) {
		return nil, expectedErr
	}

	val, err := c.GetOrSet("key", fn)
	if err != expectedErr {
		t.Errorf("expected error %v, got %v", expectedErr, err)
	}
	if val != nil {
		t.Errorf("expected nil value, got %v", val)
	}

	// Key should not be cached on error
	_, found := c.Get("key")
	if found {
		t.Error("expected key not to be cached after error")
	}
}

func TestGetOrSetWithTTL(t *testing.T) {
	c := New(time.Hour, 0)
	defer c.Stop()

	fn := func() (interface{}, error) {
		return "value", nil
	}

	// Set with short TTL
	val, err := c.GetOrSetWithTTL("key", 50*time.Millisecond, fn)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if val != "value" {
		t.Errorf("expected value, got %v", val)
	}

	// Wait for expiration
	time.Sleep(100 * time.Millisecond)

	// Should be expired
	_, found := c.Get("key")
	if found {
		t.Error("expected key to be expired")
	}
}

func TestItemIsExpired(t *testing.T) {
	// Test non-expiring item
	item := Item{Value: "test", Expiration: 0}
	if item.IsExpired() {
		t.Error("expected item with 0 expiration to not be expired")
	}

	// Test expired item
	item = Item{Value: "test", Expiration: time.Now().Add(-time.Hour).UnixNano()}
	if !item.IsExpired() {
		t.Error("expected past expiration to be expired")
	}

	// Test not yet expired item
	item = Item{Value: "test", Expiration: time.Now().Add(time.Hour).UnixNano()}
	if item.IsExpired() {
		t.Error("expected future expiration to not be expired")
	}
}

func TestCleanup(t *testing.T) {
	c := New(50*time.Millisecond, 30*time.Millisecond)
	defer c.Stop()

	c.Set("key", "value")

	// Wait for item to expire and cleanup to run
	time.Sleep(150 * time.Millisecond)

	// Item should be cleaned up
	c.mu.RLock()
	_, exists := c.items["key"]
	c.mu.RUnlock()

	if exists {
		t.Error("expected expired item to be cleaned up")
	}
}

func TestConcurrentAccess(t *testing.T) {
	c := New(time.Minute, 0)
	defer c.Stop()

	var wg sync.WaitGroup
	numGoroutines := 100

	// Concurrent writes
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			c.Set("key", i)
		}(i)
	}

	// Concurrent reads
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			c.Get("key")
		}()
	}

	wg.Wait()

	// Should not panic and key should exist
	_, found := c.Get("key")
	if !found {
		t.Error("expected key to exist after concurrent access")
	}
}

func TestDifferentValueTypes(t *testing.T) {
	c := New(time.Minute, 0)
	defer c.Stop()

	// Test string
	c.Set("string", "hello")
	val, _ := c.Get("string")
	if val != "hello" {
		t.Errorf("expected hello, got %v", val)
	}

	// Test int
	c.Set("int", 42)
	val, _ = c.Get("int")
	if val != 42 {
		t.Errorf("expected 42, got %v", val)
	}

	// Test slice
	slice := []string{"a", "b", "c"}
	c.Set("slice", slice)
	val, _ = c.Get("slice")
	if retrieved, ok := val.([]string); ok {
		if len(retrieved) != 3 {
			t.Errorf("expected slice of length 3, got %d", len(retrieved))
		}
	} else {
		t.Error("expected slice type")
	}

	// Test struct
	type User struct {
		ID   int
		Name string
	}
	user := User{ID: 1, Name: "Alice"}
	c.Set("user", user)
	val, _ = c.Get("user")
	if retrieved, ok := val.(User); ok {
		if retrieved.ID != 1 || retrieved.Name != "Alice" {
			t.Errorf("expected user {1, Alice}, got %v", retrieved)
		}
	} else {
		t.Error("expected User type")
	}
}
