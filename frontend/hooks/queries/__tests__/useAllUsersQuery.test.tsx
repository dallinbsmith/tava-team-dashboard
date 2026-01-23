/**
 * Tests for hooks/queries/useAllUsersQuery.ts
 * useAllUsersQuery and useDepartmentsQuery hooks
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import React, { ReactNode } from "react";
import { useAllUsersQuery, useDepartmentsQuery } from "../useAllUsersQuery";
import * as api from "@/lib/api";
import { User } from "@/shared/types/user";
import { queryKeys } from "@/lib/query-keys";

// Mock the Auth0 hook
jest.mock("@auth0/nextjs-auth0/client");
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

// Mock the API
jest.mock("@/lib/api", () => ({
  getAllUsers: jest.fn(),
  getDepartments: jest.fn(),
}));
const mockGetAllUsers = api.getAllUsers as jest.MockedFunction<typeof api.getAllUsers>;
const mockGetDepartments = api.getDepartments as jest.MockedFunction<typeof api.getDepartments>;

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

const mockUsers: User[] = [
  createMockUser({ id: 1, first_name: "Alice", last_name: "Smith", role: "admin" }),
  createMockUser({ id: 2, first_name: "Bob", last_name: "Jones", role: "supervisor" }),
  createMockUser({ id: 3, first_name: "Charlie", last_name: "Brown", role: "employee" }),
];

const mockDepartments = ["Engineering", "Product", "Design", "Marketing", "Sales"];

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

describe("useAllUsersQuery", () => {
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

      const { result } = renderHook(() => useAllUsersQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.allUsers).toEqual([]);
    });

    it("returns loading true while query is loading", async () => {
      mockGetAllUsers.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockUsers), 100))
      );

      const { result } = renderHook(() => useAllUsersQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

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

      renderHook(() => useAllUsersQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetAllUsers).not.toHaveBeenCalled();
    });

    it("fetches when user is authenticated", async () => {
      mockGetAllUsers.mockResolvedValue(mockUsers);

      renderHook(() => useAllUsersQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetAllUsers).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("successful data fetching", () => {
    it("returns user list after successful fetch", async () => {
      mockGetAllUsers.mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useAllUsersQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.allUsers).toEqual(mockUsers);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("returns empty array for allUsers when no data", async () => {
      mockGetAllUsers.mockResolvedValue([]);

      const { result } = renderHook(() => useAllUsersQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.allUsers).toEqual([]);
    });

    it("returns empty array when unauthenticated", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });

      const { result } = renderHook(() => useAllUsersQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.allUsers).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("returns error message when query fails with Error", async () => {
      mockGetAllUsers.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAllUsersQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Network error");
      });

      expect(result.current.allUsers).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("returns generic error for non-Error rejections", async () => {
      mockGetAllUsers.mockRejectedValue("Something went wrong");

      const { result } = renderHook(() => useAllUsersQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to fetch users");
      });
    });

    it("clears error on successful refetch", async () => {
      mockGetAllUsers.mockRejectedValueOnce(new Error("Failed"));

      const { result } = renderHook(() => useAllUsersQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed");
      });

      mockGetAllUsers.mockResolvedValueOnce(mockUsers);

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.allUsers).toEqual(mockUsers);
      });
    });
  });

  describe("options", () => {
    it("respects custom staleTime option", async () => {
      mockGetAllUsers.mockResolvedValue(mockUsers);

      const customStaleTime = 10 * 60 * 1000;

      renderHook(() => useAllUsersQuery({ staleTime: customStaleTime }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetAllUsers).toHaveBeenCalled();
      });
    });

    it("respects enabled: false option", () => {
      mockGetAllUsers.mockResolvedValue(mockUsers);

      renderHook(() => useAllUsersQuery({ enabled: false }), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetAllUsers).not.toHaveBeenCalled();
    });

    it("respects enabled: true even when not authenticated", async () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });
      mockGetAllUsers.mockResolvedValue(mockUsers);

      renderHook(() => useAllUsersQuery({ enabled: true }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetAllUsers).toHaveBeenCalled();
      });
    });
  });

  describe("refetch function", () => {
    it("refetches user data when called", async () => {
      mockGetAllUsers.mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useAllUsersQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.allUsers.length).toBeGreaterThan(0);
      });

      expect(mockGetAllUsers).toHaveBeenCalledTimes(1);

      const updatedUsers = [...mockUsers, createMockUser({ id: 4, first_name: "New" })];
      mockGetAllUsers.mockResolvedValue(updatedUsers);

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.allUsers.length).toBe(4);
      });

      expect(mockGetAllUsers).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalidate function", () => {
    it("invalidates and refetches the query", async () => {
      mockGetAllUsers.mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useAllUsersQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.allUsers.length).toBeGreaterThan(0);
      });

      const initialCallCount = mockGetAllUsers.mock.calls.length;

      const updatedUsers = mockUsers.slice(0, 2);
      mockGetAllUsers.mockResolvedValue(updatedUsers);

      await result.current.invalidate();

      await waitFor(() => {
        expect(mockGetAllUsers.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe("query key usage", () => {
    it("uses correct query key for caching", async () => {
      mockGetAllUsers.mockResolvedValue(mockUsers);

      renderHook(() => useAllUsersQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetAllUsers).toHaveBeenCalled();
      });

      const cachedData = queryClient.getQueryData(queryKeys.allUsers.all());
      expect(cachedData).toEqual(mockUsers);
    });
  });
});

describe("useDepartmentsQuery", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();

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

      const { result } = renderHook(() => useDepartmentsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.departments).toEqual([]);
    });

    it("returns loading true while query is loading", async () => {
      mockGetDepartments.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockDepartments), 100))
      );

      const { result } = renderHook(() => useDepartmentsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

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

      renderHook(() => useDepartmentsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetDepartments).not.toHaveBeenCalled();
    });

    it("fetches when user is authenticated", async () => {
      mockGetDepartments.mockResolvedValue(mockDepartments);

      renderHook(() => useDepartmentsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetDepartments).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("successful data fetching", () => {
    it("returns departments list after successful fetch", async () => {
      mockGetDepartments.mockResolvedValue(mockDepartments);

      const { result } = renderHook(() => useDepartmentsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.departments).toEqual(mockDepartments);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("returns empty array for departments when no data", async () => {
      mockGetDepartments.mockResolvedValue([]);

      const { result } = renderHook(() => useDepartmentsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.departments).toEqual([]);
    });

    it("returns empty array when unauthenticated", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });

      const { result } = renderHook(() => useDepartmentsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.departments).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("returns error message when query fails with Error", async () => {
      mockGetDepartments.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useDepartmentsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Network error");
      });

      expect(result.current.departments).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("returns generic error for non-Error rejections", async () => {
      mockGetDepartments.mockRejectedValue("Something went wrong");

      const { result } = renderHook(() => useDepartmentsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to fetch departments");
      });
    });

    it("clears error on successful refetch", async () => {
      mockGetDepartments.mockRejectedValueOnce(new Error("Failed"));

      const { result } = renderHook(() => useDepartmentsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed");
      });

      mockGetDepartments.mockResolvedValueOnce(mockDepartments);

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.departments).toEqual(mockDepartments);
      });
    });
  });

  describe("options", () => {
    it("respects custom staleTime option", async () => {
      mockGetDepartments.mockResolvedValue(mockDepartments);

      const customStaleTime = 10 * 60 * 1000;

      renderHook(() => useDepartmentsQuery({ staleTime: customStaleTime }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetDepartments).toHaveBeenCalled();
      });
    });

    it("respects enabled: false option", () => {
      mockGetDepartments.mockResolvedValue(mockDepartments);

      renderHook(() => useDepartmentsQuery({ enabled: false }), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetDepartments).not.toHaveBeenCalled();
    });

    it("respects enabled: true even when not authenticated", async () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });
      mockGetDepartments.mockResolvedValue(mockDepartments);

      renderHook(() => useDepartmentsQuery({ enabled: true }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetDepartments).toHaveBeenCalled();
      });
    });
  });

  describe("refetch function", () => {
    it("refetches department data when called", async () => {
      mockGetDepartments.mockResolvedValue(mockDepartments);

      const { result } = renderHook(() => useDepartmentsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.departments.length).toBeGreaterThan(0);
      });

      expect(mockGetDepartments).toHaveBeenCalledTimes(1);

      const updatedDepartments = [...mockDepartments, "HR"];
      mockGetDepartments.mockResolvedValue(updatedDepartments);

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.departments.length).toBe(6);
      });

      expect(mockGetDepartments).toHaveBeenCalledTimes(2);
    });
  });

  describe("query key usage", () => {
    it("uses correct query key for caching", async () => {
      mockGetDepartments.mockResolvedValue(mockDepartments);

      renderHook(() => useDepartmentsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetDepartments).toHaveBeenCalled();
      });

      const cachedData = queryClient.getQueryData(queryKeys.departments.all());
      expect(cachedData).toEqual(mockDepartments);
    });
  });
});
