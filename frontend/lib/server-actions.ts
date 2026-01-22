/**
 * Shared utilities for Server Actions
 * Consolidates common patterns: auth, error handling, and typed results
 *
 * Note: This file does NOT use "use server" because it contains both
 * async utilities and sync helpers. The async functions are server-side
 * utilities called BY Server Actions, not client-callable actions themselves.
 */

import { auth0 } from "./auth0";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

// ============================================
// Type Definitions
// ============================================

/**
 * Type-safe action result - use this for all server action returns
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================
// Auth Utilities
// ============================================

/**
 * Get Auth0 access token for server actions
 * @throws Error if user is not authenticated
 */
export async function getAccessToken(): Promise<string> {
  const result = await auth0.getAccessToken();
  if (!result?.token) {
    throw new Error("Unauthorized - please log in again");
  }
  return result.token;
}

// ============================================
// Error Handling
// ============================================

/**
 * Extract error message from backend response
 * Tries JSON first, then text, falls back to provided message
 */
export async function extractErrorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  try {
    const data = await res.json();
    return data.error || data.message || fallback;
  } catch {
    try {
      const text = await res.text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
}

// ============================================
// Authenticated Fetch Helpers
// ============================================

interface FetchOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

/**
 * Make an authenticated request to the backend
 * Handles token acquisition and JSON serialization
 */
async function authenticatedFetch(
  path: string,
  options: FetchOptions
): Promise<Response> {
  const token = await getAccessToken();

  const fetchOptions: RequestInit = {
    method: options.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  return fetch(`${BACKEND_URL}${path}`, fetchOptions);
}

/**
 * POST request with authentication
 */
export async function authPost(path: string, body?: unknown): Promise<Response> {
  return authenticatedFetch(path, { method: "POST", body });
}

/**
 * PUT request with authentication
 */
export async function authPut(path: string, body?: unknown): Promise<Response> {
  return authenticatedFetch(path, { method: "PUT", body });
}

/**
 * DELETE request with authentication
 */
export async function authDelete(path: string): Promise<Response> {
  return authenticatedFetch(path, { method: "DELETE" });
}

/**
 * GET request with authentication
 */
export async function authGet(path: string): Promise<Response> {
  return authenticatedFetch(path, { method: "GET" });
}

// ============================================
// Action Helpers
// ============================================

/**
 * Execute an action with standard error handling
 * Wraps the action in try/catch and returns ActionResult
 */
export async function executeAction<T>(
  action: () => Promise<ActionResult<T>>,
  errorPrefix: string
): Promise<ActionResult<T>> {
  try {
    return await action();
  } catch (e) {
    console.error(`${errorPrefix} error:`, e);
    return {
      success: false,
      error: e instanceof Error ? e.message : errorPrefix,
    };
  }
}

/**
 * Create a successful action result
 */
export function success<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

/**
 * Create a failed action result
 */
export function failure<T>(error: string): ActionResult<T> {
  return { success: false, error };
}
