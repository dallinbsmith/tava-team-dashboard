/**
 * Jest Setup File
 * This file runs before each test file
 */

import "@testing-library/jest-dom";

// ============ Global Mocks ============

/**
 * Mock window.matchMedia
 * Required for components that use media queries
 */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

/**
 * Mock ResizeObserver
 * Required for components that observe element sizes
 */
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});

/**
 * Mock IntersectionObserver
 * Required for components that use intersection observation (lazy loading, etc.)
 */
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];

  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn().mockReturnValue([]);
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

/**
 * Mock scrollTo
 * Prevents errors when components try to scroll
 */
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: jest.fn(),
});

/**
 * Mock fetch globally
 * Individual tests can override this mock as needed
 */
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    headers: new Headers(),
  } as Response)
);

/**
 * Mock console.error to fail tests on React warnings
 * This helps catch issues like missing keys, invalid prop types, etc.
 * Comment out if you need to debug specific errors
 */
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Still log the error for debugging
    originalError.call(console, ...args);

    // Fail on specific React errors (uncomment to enable strict mode)
    // const message = args[0]?.toString() || '';
    // if (
    //   message.includes('Warning: Each child in a list should have a unique "key" prop') ||
    //   message.includes('Warning: Failed prop type')
    // ) {
    //   throw new Error(message);
    // }
  };
});

afterAll(() => {
  console.error = originalError;
});

/**
 * Reset all mocks after each test
 */
afterEach(() => {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockClear();
});

/**
 * Suppress specific console warnings in tests
 * Add patterns here for known warnings you want to ignore
 */
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = args[0]?.toString() || "";

  // Ignore React Query devtools warning in tests
  if (message.includes("React Query Devtools")) {
    return;
  }

  originalWarn.call(console, ...args);
};

// ============ Test Timeout ============

/**
 * Increase timeout for slower tests (e.g., integration tests)
 * Default is 5000ms
 */
jest.setTimeout(10000);

// ============ Custom Matchers ============

/**
 * Add any custom Jest matchers here
 * Example:
 *
 * expect.extend({
 *   toBeWithinRange(received, floor, ceiling) {
 *     const pass = received >= floor && received <= ceiling;
 *     return {
 *       pass,
 *       message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
 *     };
 *   },
 * });
 */
