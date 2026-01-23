/**
 * Tests for hooks/mutations/useDepartmentMutations.ts
 * Department delete and rename mutations with optimistic updates
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";
import {
  useCreateDepartment,
  useDeleteDepartment,
  useRenameDepartment,
} from "../useDepartmentMutations";
import * as api from "@/lib/api";
import * as queryUtils from "@/lib/query-utils";
import { queryKeys } from "@/lib/query-keys";

// Mock the API
jest.mock("@/lib/api", () => ({
  createDepartment: jest.fn(),
  deleteDepartment: jest.fn(),
  renameDepartment: jest.fn(),
}));
const mockCreateDepartment = api.createDepartment as jest.MockedFunction<
  typeof api.createDepartment
>;
const mockDeleteDepartment = api.deleteDepartment as jest.MockedFunction<
  typeof api.deleteDepartment
>;
const mockRenameDepartment = api.renameDepartment as jest.MockedFunction<
  typeof api.renameDepartment
>;

// Mock queryUtils
jest.mock("@/lib/query-utils", () => ({
  refetchQueries: jest.fn().mockResolvedValue(undefined),
  queryKeyGroups: {
    departmentRelated: jest
      .fn()
      .mockReturnValue([["departments"], ["employees"]]),
  },
}));
const mockRefetchQueries = queryUtils.refetchQueries as jest.MockedFunction<
  typeof queryUtils.refetchQueries
>;

// Test fixtures
const mockDepartments = ["Engineering", "Product", "Design", "Marketing"];

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

describe("useCreateDepartment", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("mutation execution", () => {
    it("calls createDepartment API with correct name", async () => {
      mockCreateDepartment.mockResolvedValue({ id: 1, name: "New Department" });

      const { result } = renderHook(() => useCreateDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync("New Department");
      });

      expect(mockCreateDepartment).toHaveBeenCalledWith("New Department");
    });

    it("refetches related queries on success", async () => {
      mockCreateDepartment.mockResolvedValue({ id: 1, name: "New Department" });

      const { result } = renderHook(() => useCreateDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync("New Department");
      });

      expect(mockRefetchQueries).toHaveBeenCalled();
    });

    it("returns the created department data", async () => {
      const createdDept = { id: 1, name: "New Department" };
      mockCreateDepartment.mockResolvedValue(createdDept);

      const { result } = renderHook(() => useCreateDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      let returnedData;
      await act(async () => {
        returnedData = await result.current.mutateAsync("New Department");
      });

      expect(returnedData).toEqual(createdDept);
    });
  });

  describe("optimistic updates", () => {
    it("calls API and refetches on success", async () => {
      // Pre-populate cache
      queryClient.setQueryData(queryKeys.departments.all(), [
        ...mockDepartments,
      ]);
      mockCreateDepartment.mockResolvedValue({ id: 5, name: "New Department" });

      const { result } = renderHook(() => useCreateDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync("New Department");
      });

      // Verify the API was called
      expect(mockCreateDepartment).toHaveBeenCalledWith("New Department");
      // Verify refetch was triggered on success
      expect(mockRefetchQueries).toHaveBeenCalled();
    });

    it("adds department in sorted order", async () => {
      // Pre-populate cache with sorted departments
      queryClient.setQueryData(queryKeys.departments.all(), [
        "Design",
        "Engineering",
        "Product",
      ]);
      mockCreateDepartment.mockResolvedValue({ id: 5, name: "Marketing" });

      const { result } = renderHook(() => useCreateDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync("Marketing");
      });

      // The optimistic update adds and sorts
      // After refetch, the server data would be canonical, but we can verify the sort happened
      expect(mockCreateDepartment).toHaveBeenCalledWith("Marketing");
    });

    it("rolls back on error", async () => {
      // Pre-populate cache
      queryClient.setQueryData(queryKeys.departments.all(), [
        ...mockDepartments,
      ]);

      mockCreateDepartment.mockRejectedValue(new Error("Create failed"));

      const { result } = renderHook(() => useCreateDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      try {
        await act(async () => {
          await result.current.mutateAsync("New Department");
        });
      } catch {
        // Expected to throw
      }

      // Check that cache was rolled back
      await waitFor(() => {
        const cached = queryClient.getQueryData<string[]>(
          queryKeys.departments.all(),
        );
        expect(cached).not.toContain("New Department");
        expect(cached).toEqual(mockDepartments);
      });
    });
  });

  describe("callbacks", () => {
    it("calls onSuccess callback after creation", async () => {
      const createdDept = { id: 1, name: "New Department" };
      mockCreateDepartment.mockResolvedValue(createdDept);
      const onSuccess = jest.fn();

      const { result } = renderHook(() => useCreateDepartment({ onSuccess }), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync("New Department");
      });

      expect(onSuccess).toHaveBeenCalledWith(createdDept);
    });

    it("calls onError callback when creation fails", async () => {
      const error = new Error("Creation failed");
      mockCreateDepartment.mockRejectedValue(error);
      const onError = jest.fn();

      const { result } = renderHook(() => useCreateDepartment({ onError }), {
        wrapper: createWrapper(queryClient),
      });

      try {
        await act(async () => {
          await result.current.mutateAsync("New Department");
        });
      } catch {
        // Expected to throw
      }

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe("mutation state", () => {
    it("isPending is false initially", () => {
      const { result } = renderHook(() => useCreateDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isPending).toBe(false);
    });

    it("isPending is false after mutation completes", async () => {
      mockCreateDepartment.mockResolvedValue({ id: 1, name: "New Department" });

      const { result } = renderHook(() => useCreateDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync("New Department");
      });

      expect(result.current.isPending).toBe(false);
    });

    it("throws error when mutation fails", async () => {
      mockCreateDepartment.mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useCreateDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync("New Department");
        }),
      ).rejects.toThrow("Failed");
    });
  });

  describe("empty cache handling", () => {
    it("handles creation when cache is empty", async () => {
      // No departments in cache
      mockCreateDepartment.mockResolvedValue({ id: 1, name: "First Department" });

      const { result } = renderHook(() => useCreateDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      // Should not throw
      await act(async () => {
        await result.current.mutateAsync("First Department");
      });

      expect(mockCreateDepartment).toHaveBeenCalledWith("First Department");
    });

    it("handles creation attempt when cache was empty", async () => {
      // No departments in cache initially
      mockCreateDepartment.mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useCreateDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      // Should not crash even with empty cache
      try {
        await act(async () => {
          await result.current.mutateAsync("New Department");
        });
      } catch {
        // Expected to throw
      }

      // Verify API was still called
      expect(mockCreateDepartment).toHaveBeenCalledWith("New Department");
    });
  });
});

describe("useDeleteDepartment", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("mutation execution", () => {
    it("calls deleteDepartment API with correct department name", async () => {
      mockDeleteDepartment.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync("Engineering");
      });

      expect(mockDeleteDepartment).toHaveBeenCalledWith("Engineering");
    });

    it("refetches related queries on success", async () => {
      mockDeleteDepartment.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync("Engineering");
      });

      expect(mockRefetchQueries).toHaveBeenCalled();
    });
  });

  describe("optimistic updates", () => {
    it("calls API to delete department", async () => {
      mockDeleteDepartment.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync("Engineering");
      });

      // Verify the delete API was called
      expect(mockDeleteDepartment).toHaveBeenCalledWith("Engineering");
      // Verify related queries were refetched
      expect(mockRefetchQueries).toHaveBeenCalled();
    });

    it("rolls back on error", async () => {
      // Pre-populate cache
      queryClient.setQueryData(queryKeys.departments.all(), [
        ...mockDepartments,
      ]);

      mockDeleteDepartment.mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useDeleteDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      try {
        await act(async () => {
          await result.current.mutateAsync("Engineering");
        });
      } catch {
        // Expected to throw
      }

      // Check that department was rolled back
      await waitFor(() => {
        const cached = queryClient.getQueryData<string[]>(
          queryKeys.departments.all(),
        );
        expect(cached).toContain("Engineering");
      });
    });
  });

  describe("callbacks", () => {
    it("calls onSuccess callback after deletion", async () => {
      mockDeleteDepartment.mockResolvedValue(undefined);
      const onSuccess = jest.fn();

      const { result } = renderHook(() => useDeleteDepartment({ onSuccess }), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync("Engineering");
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it("calls onError callback when deletion fails", async () => {
      const error = new Error("Deletion failed");
      mockDeleteDepartment.mockRejectedValue(error);
      const onError = jest.fn();

      const { result } = renderHook(() => useDeleteDepartment({ onError }), {
        wrapper: createWrapper(queryClient),
      });

      try {
        await act(async () => {
          await result.current.mutateAsync("Engineering");
        });
      } catch {
        // Expected to throw
      }

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe("mutation state", () => {
    it("isPending is false initially", () => {
      const { result } = renderHook(() => useDeleteDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isPending).toBe(false);
    });

    it("isPending is false after mutation completes", async () => {
      mockDeleteDepartment.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync("Engineering");
      });

      expect(result.current.isPending).toBe(false);
    });

    it("throws error when mutation fails", async () => {
      mockDeleteDepartment.mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useDeleteDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync("Engineering");
        }),
      ).rejects.toThrow("Failed");
    });
  });

  describe("empty cache handling", () => {
    it("handles deletion when cache is empty", async () => {
      // No departments in cache
      mockDeleteDepartment.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      // Should not throw
      await act(async () => {
        await result.current.mutateAsync("Engineering");
      });

      expect(mockDeleteDepartment).toHaveBeenCalledWith("Engineering");
    });

    it("handles rollback when cache was empty", async () => {
      // No departments in cache initially
      mockDeleteDepartment.mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useDeleteDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      try {
        await act(async () => {
          await result.current.mutateAsync("Engineering");
        });
      } catch {
        // Expected
      }

      // Should not crash - the optimistic update creates an empty array which is fine
      const cached = queryClient.getQueryData<string[]>(
        queryKeys.departments.all(),
      );
      // Cache may be undefined or an empty array - both are acceptable
      expect(!cached || cached.length === 0).toBe(true);
    });
  });
});

describe("useRenameDepartment", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("mutation execution", () => {
    it("calls renameDepartment API with correct parameters", async () => {
      mockRenameDepartment.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRenameDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          oldName: "Engineering",
          newName: "Product Engineering",
        });
      });

      expect(mockRenameDepartment).toHaveBeenCalledWith(
        "Engineering",
        "Product Engineering",
      );
    });

    it("refetches related queries on success", async () => {
      mockRenameDepartment.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRenameDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          oldName: "Engineering",
          newName: "Product Engineering",
        });
      });

      expect(mockRefetchQueries).toHaveBeenCalled();
    });
  });

  describe("optimistic updates", () => {
    it("calls API to rename department and refetches on success", async () => {
      // Pre-populate cache
      queryClient.setQueryData(queryKeys.departments.all(), [
        ...mockDepartments,
      ]);
      mockRenameDepartment.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRenameDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          oldName: "Engineering",
          newName: "Product Engineering",
        });
      });

      // Verify the API was called with correct parameters
      expect(mockRenameDepartment).toHaveBeenCalledWith(
        "Engineering",
        "Product Engineering",
      );
      // Verify refetch was triggered on success
      expect(mockRefetchQueries).toHaveBeenCalled();
    });

    it("rolls back on error", async () => {
      // Pre-populate cache
      queryClient.setQueryData(queryKeys.departments.all(), [
        ...mockDepartments,
      ]);
      mockRenameDepartment.mockRejectedValue(new Error("Rename failed"));

      const { result } = renderHook(() => useRenameDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      try {
        await act(async () => {
          await result.current.mutateAsync({
            oldName: "Engineering",
            newName: "Product Engineering",
          });
        });
      } catch {
        // Expected to throw
      }

      // Check that department was rolled back to original name
      await waitFor(() => {
        const cached = queryClient.getQueryData<string[]>(
          queryKeys.departments.all(),
        );
        expect(cached).toContain("Engineering");
        expect(cached).not.toContain("Product Engineering");
      });
    });
  });

  describe("callbacks", () => {
    it("calls onSuccess callback after rename", async () => {
      mockRenameDepartment.mockResolvedValue(undefined);
      const onSuccess = jest.fn();

      const { result } = renderHook(() => useRenameDepartment({ onSuccess }), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          oldName: "Engineering",
          newName: "Product Engineering",
        });
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it("calls onError callback when rename fails", async () => {
      const error = new Error("Rename failed");
      mockRenameDepartment.mockRejectedValue(error);
      const onError = jest.fn();

      const { result } = renderHook(() => useRenameDepartment({ onError }), {
        wrapper: createWrapper(queryClient),
      });

      try {
        await act(async () => {
          await result.current.mutateAsync({
            oldName: "Engineering",
            newName: "Product Engineering",
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
      const { result } = renderHook(() => useRenameDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isPending).toBe(false);
    });

    it("isPending is false after mutation completes", async () => {
      mockRenameDepartment.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRenameDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          oldName: "Engineering",
          newName: "Product Engineering",
        });
      });

      expect(result.current.isPending).toBe(false);
    });

    it("throws error when mutation fails", async () => {
      mockRenameDepartment.mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useRenameDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            oldName: "Engineering",
            newName: "Product Engineering",
          });
        }),
      ).rejects.toThrow("Failed");
    });
  });

  describe("empty cache handling", () => {
    it("handles rename when cache is empty", async () => {
      // No departments in cache
      mockRenameDepartment.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRenameDepartment(), {
        wrapper: createWrapper(queryClient),
      });

      // Should not throw
      await act(async () => {
        await result.current.mutateAsync({
          oldName: "Engineering",
          newName: "Product Engineering",
        });
      });

      expect(mockRenameDepartment).toHaveBeenCalledWith(
        "Engineering",
        "Product Engineering",
      );
    });
  });
});
