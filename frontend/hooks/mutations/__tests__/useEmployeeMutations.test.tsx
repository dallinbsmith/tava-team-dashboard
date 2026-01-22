/**
 * Tests for hooks/mutations/useEmployeeMutations.ts
 * Employee update and deactivate mutations
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";
import { useUpdateEmployee, useDeactivateEmployee } from "../useEmployeeMutations";
import * as api from "@/lib/api";
import * as queryUtils from "@/lib/queryUtils";
import { User } from "@/shared/types/user";
import { queryKeys } from "@/lib/queryKeys";

// Mock the API
jest.mock("@/lib/api", () => ({
  updateUser: jest.fn(),
  deactivateUser: jest.fn(),
}));
const mockUpdateUser = api.updateUser as jest.MockedFunction<typeof api.updateUser>;
const mockDeactivateUser = api.deactivateUser as jest.MockedFunction<typeof api.deactivateUser>;

// Mock queryUtils
jest.mock("@/lib/queryUtils", () => ({
  refetchQueries: jest.fn().mockResolvedValue(undefined),
  queryKeyGroups: {
    employeeRelated: jest.fn().mockReturnValue([["employees"], ["allUsers"]]),
    users: jest.fn().mockReturnValue([["employees"], ["allUsers"], ["currentUser"]]),
  },
}));
const mockRefetchQueries = queryUtils.refetchQueries as jest.MockedFunction<typeof queryUtils.refetchQueries>;

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

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
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

describe("useUpdateEmployee", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("mutation execution", () => {
    it("calls updateUser API with correct parameters", async () => {
      const updatedUser = createMockUser({ first_name: "Updated" });
      mockUpdateUser.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUpdateEmployee(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: { first_name: "Updated" },
        });
      });

      expect(mockUpdateUser).toHaveBeenCalledWith(1, { first_name: "Updated" });
    });

    it("returns updated user on success", async () => {
      const updatedUser = createMockUser({ first_name: "Updated" });
      mockUpdateUser.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUpdateEmployee(), {
        wrapper: createWrapper(queryClient),
      });

      let returnedUser: User | undefined;
      await act(async () => {
        returnedUser = await result.current.mutateAsync({
          id: 1,
          data: { first_name: "Updated" },
        });
      });

      expect(returnedUser).toEqual(updatedUser);
    });

    it("updates query cache for employee detail", async () => {
      const updatedUser = createMockUser({ id: 5, first_name: "Updated" });
      mockUpdateUser.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUpdateEmployee(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 5,
          data: { first_name: "Updated" },
        });
      });

      const cachedUser = queryClient.getQueryData(queryKeys.employees.detail(5));
      expect(cachedUser).toEqual(updatedUser);
    });

    it("refetches related queries on success", async () => {
      const updatedUser = createMockUser();
      mockUpdateUser.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUpdateEmployee(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: { first_name: "Updated" },
        });
      });

      expect(mockRefetchQueries).toHaveBeenCalled();
    });
  });

  describe("callbacks", () => {
    it("calls onSuccess callback with updated user", async () => {
      const updatedUser = createMockUser({ first_name: "Updated" });
      mockUpdateUser.mockResolvedValue(updatedUser);
      const onSuccess = jest.fn();

      const { result } = renderHook(() => useUpdateEmployee({ onSuccess }), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: { first_name: "Updated" },
        });
      });

      expect(onSuccess).toHaveBeenCalledWith(updatedUser);
    });

    it("calls onError callback when mutation fails", async () => {
      const error = new Error("Update failed");
      mockUpdateUser.mockRejectedValue(error);
      const onError = jest.fn();

      const { result } = renderHook(() => useUpdateEmployee({ onError }), {
        wrapper: createWrapper(queryClient),
      });

      try {
        await act(async () => {
          await result.current.mutateAsync({
            id: 1,
            data: { first_name: "Updated" },
          });
        });
      } catch {
        // Expected to throw
      }

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe("mutation state", () => {
    it("isPending is false initially", () => {
      const { result } = renderHook(() => useUpdateEmployee(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isPending).toBe(false);
    });

    it("isPending is false after mutation completes", async () => {
      const updatedUser = createMockUser();
      mockUpdateUser.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUpdateEmployee(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: { first_name: "Updated" },
        });
      });

      expect(result.current.isPending).toBe(false);
    });

    it("throws error when mutation fails", async () => {
      mockUpdateUser.mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useUpdateEmployee(), {
        wrapper: createWrapper(queryClient),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            id: 1,
            data: { first_name: "Updated" },
          });
        })
      ).rejects.toThrow("Failed");
    });
  });
});

describe("useDeactivateEmployee", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("mutation execution", () => {
    it("calls deactivateUser API with correct user ID", async () => {
      mockDeactivateUser.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeactivateEmployee(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync(123);
      });

      expect(mockDeactivateUser).toHaveBeenCalledWith(123);
    });

    it("removes employee from query cache on success", async () => {
      mockDeactivateUser.mockResolvedValue(undefined);

      // Pre-populate cache
      const user = createMockUser({ id: 123 });
      queryClient.setQueryData(queryKeys.employees.detail(123), user);

      const { result } = renderHook(() => useDeactivateEmployee(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync(123);
      });

      const cachedUser = queryClient.getQueryData(queryKeys.employees.detail(123));
      expect(cachedUser).toBeUndefined();
    });

    it("refetches related queries on success", async () => {
      mockDeactivateUser.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeactivateEmployee(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync(123);
      });

      expect(mockRefetchQueries).toHaveBeenCalled();
    });
  });

  describe("callbacks", () => {
    it("calls onSuccess callback after deactivation", async () => {
      mockDeactivateUser.mockResolvedValue(undefined);
      const onSuccess = jest.fn();

      const { result } = renderHook(() => useDeactivateEmployee({ onSuccess }), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync(123);
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it("calls onError callback when deactivation fails", async () => {
      const error = new Error("Deactivation failed");
      mockDeactivateUser.mockRejectedValue(error);
      const onError = jest.fn();

      const { result } = renderHook(() => useDeactivateEmployee({ onError }), {
        wrapper: createWrapper(queryClient),
      });

      try {
        await act(async () => {
          await result.current.mutateAsync(123);
        });
      } catch {
        // Expected to throw
      }

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe("mutation state", () => {
    it("isPending is false initially", () => {
      const { result } = renderHook(() => useDeactivateEmployee(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isPending).toBe(false);
    });

    it("isPending is false after mutation completes", async () => {
      mockDeactivateUser.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeactivateEmployee(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync(123);
      });

      expect(result.current.isPending).toBe(false);
    });

    it("throws error when mutation fails", async () => {
      mockDeactivateUser.mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useDeactivateEmployee(), {
        wrapper: createWrapper(queryClient),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync(123);
        })
      ).rejects.toThrow("Failed");
    });
  });
});
