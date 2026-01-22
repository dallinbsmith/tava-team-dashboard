/**
 * Tests for hooks/queries/useEmployeesQuery.ts
 * Employee data fetching hooks: useEmployeesQuery and useEmployeeQuery
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import React, { ReactNode } from "react";
import { useEmployeesQuery, useEmployeeQuery } from "../useEmployeesQuery";
import * as api from "@/lib/api";
import { User } from "@/shared/types/user";
import { queryKeys } from "@/lib/queryKeys";

// Mock the Auth0 hook
jest.mock("@auth0/nextjs-auth0/client");
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

// Mock the API
jest.mock("@/lib/api", () => ({
  getEmployees: jest.fn(),
  getEmployeeGraphQL: jest.fn(),
}));
const mockGetEmployees = api.getEmployees as jest.MockedFunction<
  typeof api.getEmployees
>;
const mockGetEmployeeGraphQL = api.getEmployeeGraphQL as jest.MockedFunction<
  typeof api.getEmployeeGraphQL
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

const mockEmployees: User[] = [
  createMockUser({ id: 1, first_name: "Alice", last_name: "Smith" }),
  createMockUser({ id: 2, first_name: "Bob", last_name: "Jones" }),
  createMockUser({ id: 3, first_name: "Charlie", last_name: "Brown" }),
];

const singleEmployee = createMockUser({ id: 42, first_name: "Single", last_name: "Employee" });

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

describe("useEmployeesQuery", () => {
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

      const { result } = renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.employees).toEqual([]);
    });

    it("returns loading true while query is loading", async () => {
      mockGetEmployees.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockEmployees), 100))
      );

      const { result } = renderHook(() => useEmployeesQuery(), {
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

      renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetEmployees).not.toHaveBeenCalled();
    });

    it("fetches when user is authenticated", async () => {
      mockGetEmployees.mockResolvedValue(mockEmployees);

      renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetEmployees).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("successful data fetching", () => {
    it("returns employee list after successful fetch", async () => {
      mockGetEmployees.mockResolvedValue(mockEmployees);

      const { result } = renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.employees).toEqual(mockEmployees);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("returns empty array for employees when no data", async () => {
      mockGetEmployees.mockResolvedValue([]);

      const { result } = renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.employees).toEqual([]);
    });

    it("returns empty array when unauthenticated", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });

      const { result } = renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.employees).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("returns error message when query fails with Error", async () => {
      mockGetEmployees.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Network error");
      });

      expect(result.current.employees).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("returns generic error for non-Error rejections", async () => {
      mockGetEmployees.mockRejectedValue("Something went wrong");

      const { result } = renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to fetch employees");
      });
    });

    it("clears error on successful refetch", async () => {
      // First call fails
      mockGetEmployees.mockRejectedValueOnce(new Error("Failed"));

      const { result } = renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed");
      });

      // Second call succeeds
      mockGetEmployees.mockResolvedValueOnce(mockEmployees);

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.employees).toEqual(mockEmployees);
      });
    });
  });

  describe("options", () => {
    it("respects custom staleTime option", async () => {
      mockGetEmployees.mockResolvedValue(mockEmployees);

      const customStaleTime = 10 * 60 * 1000; // 10 minutes

      renderHook(() => useEmployeesQuery({ staleTime: customStaleTime }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetEmployees).toHaveBeenCalled();
      });
    });

    it("respects enabled: false option", () => {
      mockGetEmployees.mockResolvedValue(mockEmployees);

      renderHook(() => useEmployeesQuery({ enabled: false }), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetEmployees).not.toHaveBeenCalled();
    });

    it("respects enabled: true even when not authenticated", async () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });
      mockGetEmployees.mockResolvedValue(mockEmployees);

      renderHook(() => useEmployeesQuery({ enabled: true }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetEmployees).toHaveBeenCalled();
      });
    });
  });

  describe("refetch function", () => {
    it("refetches employee data when called", async () => {
      mockGetEmployees.mockResolvedValue(mockEmployees);

      const { result } = renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.employees.length).toBeGreaterThan(0);
      });

      expect(mockGetEmployees).toHaveBeenCalledTimes(1);

      // Update mock to return different data
      const updatedEmployees = [
        ...mockEmployees,
        createMockUser({ id: 4, first_name: "New" }),
      ];
      mockGetEmployees.mockResolvedValue(updatedEmployees);

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.employees.length).toBe(4);
      });

      expect(mockGetEmployees).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalidate function", () => {
    it("invalidates and refetches the query", async () => {
      mockGetEmployees.mockResolvedValue(mockEmployees);

      const { result } = renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.employees.length).toBeGreaterThan(0);
      });

      const initialCallCount = mockGetEmployees.mock.calls.length;

      // Update mock
      const updatedEmployees = mockEmployees.slice(0, 2);
      mockGetEmployees.mockResolvedValue(updatedEmployees);

      await result.current.invalidate();

      await waitFor(() => {
        expect(mockGetEmployees.mock.calls.length).toBeGreaterThan(initialCallCount);
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

      const { result } = renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("isLoading is true when query is loading", async () => {
      let resolveQuery: (users: User[]) => void;
      mockGetEmployees.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveQuery = resolve;
          })
      );

      const { result } = renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

      // Resolve the query
      resolveQuery!(mockEmployees);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("isLoading is false when both auth and query are complete", async () => {
      mockGetEmployees.mockResolvedValue(mockEmployees);

      const { result } = renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("query key usage", () => {
    it("uses correct query key for caching", async () => {
      mockGetEmployees.mockResolvedValue(mockEmployees);

      renderHook(() => useEmployeesQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetEmployees).toHaveBeenCalled();
      });

      // Check that data is cached under the correct key
      const cachedData = queryClient.getQueryData(queryKeys.employees.all());
      expect(cachedData).toEqual(mockEmployees);
    });
  });
});

describe("useEmployeeQuery", () => {
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

      const { result } = renderHook(() => useEmployeeQuery({ id: 42 }), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.employee).toBeNull();
    });

    it("returns loading true while query is loading", async () => {
      mockGetEmployeeGraphQL.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(singleEmployee), 100))
      );

      const { result } = renderHook(() => useEmployeeQuery({ id: 42 }), {
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

      renderHook(() => useEmployeeQuery({ id: 42 }), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetEmployeeGraphQL).not.toHaveBeenCalled();
    });

    it("fetches when user is authenticated", async () => {
      mockGetEmployeeGraphQL.mockResolvedValue(singleEmployee);

      renderHook(() => useEmployeeQuery({ id: 42 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetEmployeeGraphQL).toHaveBeenCalledTimes(1);
        expect(mockGetEmployeeGraphQL).toHaveBeenCalledWith(42);
      });
    });
  });

  describe("successful data fetching", () => {
    it("returns employee data after successful fetch", async () => {
      mockGetEmployeeGraphQL.mockResolvedValue(singleEmployee);

      const { result } = renderHook(() => useEmployeeQuery({ id: 42 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.employee).toEqual(singleEmployee);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("returns null for employee when no data", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });

      const { result } = renderHook(() => useEmployeeQuery({ id: 42 }), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.employee).toBeNull();
    });
  });

  describe("id validation", () => {
    it("does not fetch when id is 0", () => {
      mockGetEmployeeGraphQL.mockResolvedValue(singleEmployee);

      renderHook(() => useEmployeeQuery({ id: 0 }), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetEmployeeGraphQL).not.toHaveBeenCalled();
    });

    it("does not fetch when id is negative", () => {
      mockGetEmployeeGraphQL.mockResolvedValue(singleEmployee);

      renderHook(() => useEmployeeQuery({ id: -1 }), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetEmployeeGraphQL).not.toHaveBeenCalled();
    });

    it("fetches when id is positive", async () => {
      mockGetEmployeeGraphQL.mockResolvedValue(singleEmployee);

      renderHook(() => useEmployeeQuery({ id: 1 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetEmployeeGraphQL).toHaveBeenCalledWith(1);
      });
    });
  });

  describe("error handling", () => {
    it("returns error message when query fails with Error", async () => {
      mockGetEmployeeGraphQL.mockRejectedValue(new Error("Employee not found"));

      const { result } = renderHook(() => useEmployeeQuery({ id: 42 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Employee not found");
      });

      expect(result.current.employee).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("returns generic error for non-Error rejections", async () => {
      mockGetEmployeeGraphQL.mockRejectedValue("Something went wrong");

      const { result } = renderHook(() => useEmployeeQuery({ id: 42 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to fetch employee");
      });
    });

    it("clears error on successful refetch", async () => {
      // First call fails
      mockGetEmployeeGraphQL.mockRejectedValueOnce(new Error("Failed"));

      const { result } = renderHook(() => useEmployeeQuery({ id: 42 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed");
      });

      // Second call succeeds
      mockGetEmployeeGraphQL.mockResolvedValueOnce(singleEmployee);

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.employee).toEqual(singleEmployee);
      });
    });
  });

  describe("options", () => {
    it("respects custom staleTime option", async () => {
      mockGetEmployeeGraphQL.mockResolvedValue(singleEmployee);

      const customStaleTime = 10 * 60 * 1000; // 10 minutes

      renderHook(() => useEmployeeQuery({ id: 42, staleTime: customStaleTime }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetEmployeeGraphQL).toHaveBeenCalled();
      });
    });

    it("respects enabled: false option", () => {
      mockGetEmployeeGraphQL.mockResolvedValue(singleEmployee);

      renderHook(() => useEmployeeQuery({ id: 42, enabled: false }), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetEmployeeGraphQL).not.toHaveBeenCalled();
    });

    it("enabled: false takes precedence over valid id", () => {
      mockGetEmployeeGraphQL.mockResolvedValue(singleEmployee);

      renderHook(() => useEmployeeQuery({ id: 42, enabled: false }), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetEmployeeGraphQL).not.toHaveBeenCalled();
    });
  });

  describe("refetch function", () => {
    it("refetches employee data when called", async () => {
      mockGetEmployeeGraphQL.mockResolvedValue(singleEmployee);

      const { result } = renderHook(() => useEmployeeQuery({ id: 42 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.employee).not.toBeNull();
      });

      expect(mockGetEmployeeGraphQL).toHaveBeenCalledTimes(1);

      // Update mock to return different data
      const updatedEmployee = { ...singleEmployee, first_name: "Updated" };
      mockGetEmployeeGraphQL.mockResolvedValue(updatedEmployee);

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.employee?.first_name).toBe("Updated");
      });

      expect(mockGetEmployeeGraphQL).toHaveBeenCalledTimes(2);
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

      const { result } = renderHook(() => useEmployeeQuery({ id: 42 }), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("isLoading is true when query is loading", async () => {
      let resolveQuery: (user: User) => void;
      mockGetEmployeeGraphQL.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveQuery = resolve;
          })
      );

      const { result } = renderHook(() => useEmployeeQuery({ id: 42 }), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

      // Resolve the query
      resolveQuery!(singleEmployee);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("isLoading is false when both auth and query are complete", async () => {
      mockGetEmployeeGraphQL.mockResolvedValue(singleEmployee);

      const { result } = renderHook(() => useEmployeeQuery({ id: 42 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("query key usage", () => {
    it("uses correct query key for caching", async () => {
      mockGetEmployeeGraphQL.mockResolvedValue(singleEmployee);

      renderHook(() => useEmployeeQuery({ id: 42 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetEmployeeGraphQL).toHaveBeenCalled();
      });

      // Check that data is cached under the correct key
      const cachedData = queryClient.getQueryData(queryKeys.employees.detail(42));
      expect(cachedData).toEqual(singleEmployee);
    });

    it("uses different keys for different ids", async () => {
      const employee1 = createMockUser({ id: 1 });
      const employee2 = createMockUser({ id: 2 });

      mockGetEmployeeGraphQL
        .mockResolvedValueOnce(employee1)
        .mockResolvedValueOnce(employee2);

      // Render first hook
      renderHook(() => useEmployeeQuery({ id: 1 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(queryKeys.employees.detail(1))).toEqual(employee1);
      });

      // Render second hook
      renderHook(() => useEmployeeQuery({ id: 2 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(queryKeys.employees.detail(2))).toEqual(employee2);
      });

      // Both should be cached separately
      expect(queryClient.getQueryData(queryKeys.employees.detail(1))).toEqual(employee1);
      expect(queryClient.getQueryData(queryKeys.employees.detail(2))).toEqual(employee2);
    });
  });

  describe("id changes", () => {
    it("refetches when id changes", async () => {
      const employee1 = createMockUser({ id: 1, first_name: "First" });
      const employee2 = createMockUser({ id: 2, first_name: "Second" });

      mockGetEmployeeGraphQL
        .mockResolvedValueOnce(employee1)
        .mockResolvedValueOnce(employee2);

      const { result, rerender } = renderHook(
        (props: { id: number }) => useEmployeeQuery({ id: props.id }),
        {
          wrapper: createWrapper(queryClient),
          initialProps: { id: 1 },
        }
      );

      await waitFor(() => {
        expect(result.current.employee?.first_name).toBe("First");
      });

      // Change the id
      rerender({ id: 2 });

      await waitFor(() => {
        expect(result.current.employee?.first_name).toBe("Second");
      });

      expect(mockGetEmployeeGraphQL).toHaveBeenCalledTimes(2);
      expect(mockGetEmployeeGraphQL).toHaveBeenNthCalledWith(1, 1);
      expect(mockGetEmployeeGraphQL).toHaveBeenNthCalledWith(2, 2);
    });
  });
});
