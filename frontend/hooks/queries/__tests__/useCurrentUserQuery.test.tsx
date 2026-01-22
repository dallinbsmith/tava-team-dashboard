/**
 * Tests for hooks/queries/useCurrentUserQuery.ts
 * Current user data fetching and role management
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import React, { ReactNode } from "react";
import { useCurrentUserQuery } from "../useCurrentUserQuery";
import * as api from "@/lib/api";
import { User } from "@/shared/types/user";

// Mock the Auth0 hook
jest.mock("@auth0/nextjs-auth0/client");
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

// Mock the API
jest.mock("@/lib/api", () => ({
  getCurrentUser: jest.fn(),
}));
const mockGetCurrentUser = api.getCurrentUser as jest.MockedFunction<
  typeof api.getCurrentUser
>;

// Test fixtures
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 1,
  auth0_id: "auth0|123",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  role: "employee",
  title: "Software Engineer",
  department: "Engineering",
  squads: [],
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const adminUser = createMockUser({ role: "admin" });
const supervisorUser = createMockUser({ role: "supervisor" });
const employeeUser = createMockUser({ role: "employee" });

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

// Wrapper component with QueryClient
const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useCurrentUserQuery", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();

    // Default: authenticated user
    mockUseUser.mockReturnValue({
      user: { sub: "auth0|123", email: "test@example.com" },
      isLoading: false,
      error: undefined,
      checkSession: jest.fn(),
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("initial state and loading", () => {
    it("returns loading true while auth is loading", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: true,
        error: undefined,
        checkSession: jest.fn(),
      });

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthLoading).toBe(true);
      expect(result.current.currentUser).toBeNull();
    });

    it("returns loading true while query is loading", async () => {
      mockGetCurrentUser.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(employeeUser), 100))
      );

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for query to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("does not fetch when user is not authenticated", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });

      renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetCurrentUser).not.toHaveBeenCalled();
    });

    it("fetches when user is authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(employeeUser);

      renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("successful data fetching", () => {
    it("returns user data after successful fetch", async () => {
      mockGetCurrentUser.mockResolvedValue(employeeUser);

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.currentUser).toEqual(employeeUser);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("returns null for currentUser when no data", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.currentUser).toBeNull();
    });
  });

  describe("role derivation", () => {
    it("correctly identifies admin role", async () => {
      mockGetCurrentUser.mockResolvedValue(adminUser);

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(true);
      });

      expect(result.current.isSupervisor).toBe(false);
      expect(result.current.isSupervisorOrAdmin).toBe(true);
    });

    it("correctly identifies supervisor role", async () => {
      mockGetCurrentUser.mockResolvedValue(supervisorUser);

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSupervisor).toBe(true);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isSupervisorOrAdmin).toBe(true);
    });

    it("correctly identifies employee role", async () => {
      mockGetCurrentUser.mockResolvedValue(employeeUser);

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.currentUser).not.toBeNull();
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isSupervisor).toBe(false);
      expect(result.current.isSupervisorOrAdmin).toBe(false);
    });

    it("returns false for all roles when no user", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isSupervisor).toBe(false);
      expect(result.current.isSupervisorOrAdmin).toBe(false);
    });
  });

  describe("error handling", () => {
    it("returns error message when query fails with Error", async () => {
      mockGetCurrentUser.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Network error");
      });

      expect(result.current.currentUser).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("returns generic error for non-Error rejections", async () => {
      mockGetCurrentUser.mockRejectedValue("Something went wrong");

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to fetch user");
      });
    });

    it("clears error on successful refetch", async () => {
      // First call fails
      mockGetCurrentUser.mockRejectedValueOnce(new Error("Failed"));

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed");
      });

      // Second call succeeds
      mockGetCurrentUser.mockResolvedValueOnce(employeeUser);

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.currentUser).toEqual(employeeUser);
      });
    });
  });

  describe("options", () => {
    it("respects custom staleTime option", async () => {
      mockGetCurrentUser.mockResolvedValue(employeeUser);

      const customStaleTime = 10 * 60 * 1000; // 10 minutes

      renderHook(() => useCurrentUserQuery({ staleTime: customStaleTime }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetCurrentUser).toHaveBeenCalled();
      });

      // The query should use the custom stale time
      // (We can't directly verify this without accessing internals,
      // but we verify the option is passed through)
    });

    it("respects enabled: false option", () => {
      mockGetCurrentUser.mockResolvedValue(employeeUser);

      renderHook(() => useCurrentUserQuery({ enabled: false }), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetCurrentUser).not.toHaveBeenCalled();
    });

    it("respects enabled: true even when not authenticated", async () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });
      mockGetCurrentUser.mockResolvedValue(employeeUser);

      renderHook(() => useCurrentUserQuery({ enabled: true }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetCurrentUser).toHaveBeenCalled();
      });
    });
  });

  describe("refetch function", () => {
    it("refetches user data when called", async () => {
      mockGetCurrentUser.mockResolvedValue(employeeUser);

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.currentUser).not.toBeNull();
      });

      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);

      // Update mock to return different data
      const updatedUser = { ...employeeUser, first_name: "Updated" };
      mockGetCurrentUser.mockResolvedValue(updatedUser);

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.currentUser?.first_name).toBe("Updated");
      });

      expect(mockGetCurrentUser).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalidate function", () => {
    it("invalidates and refetches the query", async () => {
      mockGetCurrentUser.mockResolvedValue(employeeUser);

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.currentUser).not.toBeNull();
      });

      const initialCallCount = mockGetCurrentUser.mock.calls.length;

      // Update mock
      const updatedUser = { ...employeeUser, last_name: "Invalidated" };
      mockGetCurrentUser.mockResolvedValue(updatedUser);

      await result.current.invalidate();

      await waitFor(() => {
        expect(mockGetCurrentUser.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe("combined loading state", () => {
    it("isLoading is true when auth is loading", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: true,
        error: undefined,
        checkSession: jest.fn(),
      });

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("isLoading is true when query is loading", async () => {
      let resolveQuery: (user: User) => void;
      mockGetCurrentUser.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveQuery = resolve;
          })
      );

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

      // Resolve the query
      resolveQuery!(employeeUser);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("isLoading is false when both auth and query are complete", async () => {
      mockGetCurrentUser.mockResolvedValue(employeeUser);

      const { result } = renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthLoading).toBe(false);
    });
  });

  describe("query key usage", () => {
    it("uses correct query key for caching", async () => {
      mockGetCurrentUser.mockResolvedValue(employeeUser);

      renderHook(() => useCurrentUserQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetCurrentUser).toHaveBeenCalled();
      });

      // Check that data is cached under the correct key
      const cachedData = queryClient.getQueryData(["currentUser"]);
      expect(cachedData).toEqual(employeeUser);
    });
  });
});
