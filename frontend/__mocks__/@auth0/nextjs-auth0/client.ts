/**
 * Mock for @auth0/nextjs-auth0/client
 * Provides mocked authentication hooks for testing
 *
 * @example
 * ```ts
 * import { useUser } from '@auth0/nextjs-auth0/client';
 * import { mockUser, mockAuthLoading, mockAuthError } from '@/__mocks__/@auth0/nextjs-auth0/client';
 *
 * jest.mock('@auth0/nextjs-auth0/client');
 *
 * test('shows user name when authenticated', () => {
 *   mockUser({ name: 'John Doe', email: 'john@example.com' });
 *   // ... render component
 * });
 *
 * test('shows loading state', () => {
 *   mockAuthLoading();
 *   // ... render component
 * });
 * ```
 */

import React, { ReactNode } from "react";

export interface UserProfile {
  email?: string | null;
  email_verified?: boolean | null;
  name?: string | null;
  nickname?: string | null;
  picture?: string | null;
  sub?: string | null;
  updated_at?: string | null;
  org_id?: string | null;
  [key: string]: unknown;
}

export interface UserContext {
  user?: UserProfile;
  error?: Error;
  isLoading: boolean;
  checkSession: () => Promise<void>;
}

// Default mock state
let mockState: UserContext = {
  user: undefined,
  error: undefined,
  isLoading: false,
  checkSession: jest.fn().mockResolvedValue(undefined),
};

/**
 * Mock useUser hook
 */
export const useUser = jest.fn((): UserContext => mockState);

/**
 * Mock UserProvider component - just renders children
 */
export const UserProvider = ({ children }: { children: ReactNode }) => {
  return React.createElement(React.Fragment, null, children);
};

// ============ Helper Functions ============

/**
 * Mock an authenticated user
 */
export const mockUser = (user: Partial<UserProfile> = {}) => {
  const defaultUser: UserProfile = {
    sub: "auth0|123456789",
    email: "test@example.com",
    email_verified: true,
    name: "Test User",
    nickname: "testuser",
    picture: "https://example.com/avatar.png",
    updated_at: new Date().toISOString(),
  };

  mockState = {
    user: { ...defaultUser, ...user },
    error: undefined,
    isLoading: false,
    checkSession: jest.fn().mockResolvedValue(undefined),
  };

  (useUser as jest.Mock).mockReturnValue(mockState);
  return mockState;
};

/**
 * Mock loading state (auth check in progress)
 */
export const mockAuthLoading = () => {
  mockState = {
    user: undefined,
    error: undefined,
    isLoading: true,
    checkSession: jest.fn().mockResolvedValue(undefined),
  };

  (useUser as jest.Mock).mockReturnValue(mockState);
  return mockState;
};

/**
 * Mock unauthenticated state (no user)
 */
export const mockUnauthenticated = () => {
  mockState = {
    user: undefined,
    error: undefined,
    isLoading: false,
    checkSession: jest.fn().mockResolvedValue(undefined),
  };

  (useUser as jest.Mock).mockReturnValue(mockState);
  return mockState;
};

/**
 * Mock authentication error
 */
export const mockAuthError = (message = "Authentication failed") => {
  mockState = {
    user: undefined,
    error: new Error(message),
    isLoading: false,
    checkSession: jest.fn().mockResolvedValue(undefined),
  };

  (useUser as jest.Mock).mockReturnValue(mockState);
  return mockState;
};

/**
 * Reset all Auth0 mocks to default state
 */
export const resetAuthMocks = () => {
  mockState = {
    user: undefined,
    error: undefined,
    isLoading: false,
    checkSession: jest.fn().mockResolvedValue(undefined),
  };

  (useUser as jest.Mock).mockClear();
  (useUser as jest.Mock).mockReturnValue(mockState);
};
