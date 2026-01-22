/**
 * Tests for hooks/queries/useSquadsQuery.ts
 * Squad query and mutation hooks
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import React, { ReactNode } from "react";
import { useSquadsQuery } from "../useSquadsQuery";
import * as api from "@/lib/api";
import * as queryUtils from "@/lib/queryUtils";
import { Squad } from "@/shared/types/user";
import { queryKeys } from "@/lib/queryKeys";

// Mock the Auth0 hook
jest.mock("@auth0/nextjs-auth0/client");
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

// Mock the API
jest.mock("@/lib/api", () => ({
  getSquads: jest.fn(),
  createSquad: jest.fn(),
  deleteSquad: jest.fn(),
}));
const mockGetSquads = api.getSquads as jest.MockedFunction<typeof api.getSquads>;
const mockCreateSquad = api.createSquad as jest.MockedFunction<typeof api.createSquad>;
const mockDeleteSquad = api.deleteSquad as jest.MockedFunction<typeof api.deleteSquad>;

// Mock the queryUtils
jest.mock("@/lib/queryUtils", () => ({
  refetchQueries: jest.fn().mockResolvedValue(undefined),
  queryKeyGroups: {
    squadRelated: jest.fn().mockReturnValue([["squads"], ["employees"]]),
  },
}));
const mockRefetchQueries = queryUtils.refetchQueries as jest.MockedFunction<typeof queryUtils.refetchQueries>;

// Test fixtures
const mockSquads: Squad[] = [
  { id: 1, name: "Frontend Team" },
  { id: 2, name: "Backend Team" },
  { id: 3, name: "DevOps Team" },
];

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

describe("useSquadsQuery", () => {
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

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.squads).toEqual([]);
    });

    it("returns loading true while query is loading", async () => {
      mockGetSquads.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSquads), 100))
      );

      const { result } = renderHook(() => useSquadsQuery(), {
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

      renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetSquads).not.toHaveBeenCalled();
    });

    it("fetches when user is authenticated", async () => {
      mockGetSquads.mockResolvedValue(mockSquads);

      renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetSquads).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("successful data fetching", () => {
    it("returns squads list after successful fetch", async () => {
      mockGetSquads.mockResolvedValue(mockSquads);

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.squads).toEqual(mockSquads);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("returns empty array for squads when no data", async () => {
      mockGetSquads.mockResolvedValue([]);

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.squads).toEqual([]);
    });

    it("returns empty array when unauthenticated", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.squads).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("returns error message when query fails with Error", async () => {
      mockGetSquads.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Network error");
      });

      expect(result.current.squads).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("returns generic error for non-Error rejections", async () => {
      mockGetSquads.mockRejectedValue("Something went wrong");

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to fetch squads");
      });
    });
  });

  describe("options", () => {
    it("respects enabled: false option", () => {
      mockGetSquads.mockResolvedValue(mockSquads);

      renderHook(() => useSquadsQuery({ enabled: false }), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockGetSquads).not.toHaveBeenCalled();
    });

    it("respects enabled: true even when not authenticated", async () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });
      mockGetSquads.mockResolvedValue(mockSquads);

      renderHook(() => useSquadsQuery({ enabled: true }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetSquads).toHaveBeenCalled();
      });
    });
  });

  describe("refetch function", () => {
    it("refetches squad data when called", async () => {
      mockGetSquads.mockResolvedValue(mockSquads);

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.squads.length).toBeGreaterThan(0);
      });

      expect(mockGetSquads).toHaveBeenCalledTimes(1);

      const updatedSquads = [...mockSquads, { id: 4, name: "New Squad" }];
      mockGetSquads.mockResolvedValue(updatedSquads);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.squads.length).toBe(4);
      });

      expect(mockGetSquads).toHaveBeenCalledTimes(2);
    });
  });

  describe("addSquad mutation", () => {
    it("adds a new squad successfully", async () => {
      mockGetSquads.mockResolvedValue(mockSquads);
      const newSquad: Squad = { id: 4, name: "QA Team" };
      mockCreateSquad.mockResolvedValue(newSquad);

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.squads.length).toBe(3);
      });

      let returnedSquad: Squad | undefined;
      await act(async () => {
        returnedSquad = await result.current.addSquad("QA Team");
      });

      expect(mockCreateSquad).toHaveBeenCalledWith("QA Team");
      expect(returnedSquad).toEqual(newSquad);

      // Cache should be updated
      await waitFor(() => {
        expect(result.current.squads).toContainEqual(newSquad);
      });
    });

    it("refetches related queries after adding squad", async () => {
      mockGetSquads.mockResolvedValue(mockSquads);
      const newSquad: Squad = { id: 4, name: "QA Team" };
      mockCreateSquad.mockResolvedValue(newSquad);

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.squads.length).toBe(3);
      });

      await act(async () => {
        await result.current.addSquad("QA Team");
      });

      expect(mockRefetchQueries).toHaveBeenCalled();
    });

    it("isMutating is false when no mutation in progress", async () => {
      mockGetSquads.mockResolvedValue(mockSquads);

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.squads.length).toBe(3);
      });

      // No mutations - should be false
      expect(result.current.isMutating).toBe(false);
    });

    it("completes add mutation successfully", async () => {
      mockGetSquads.mockResolvedValue(mockSquads);
      const newSquad: Squad = { id: 4, name: "QA Team" };
      mockCreateSquad.mockResolvedValue(newSquad);

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.squads.length).toBe(3);
      });

      await act(async () => {
        await result.current.addSquad("QA Team");
      });

      // After mutation completes, isMutating should be false
      expect(result.current.isMutating).toBe(false);
    });
  });

  describe("removeSquad mutation", () => {
    it("removes a squad successfully with optimistic update", async () => {
      mockGetSquads.mockResolvedValue(mockSquads);
      mockDeleteSquad.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.squads.length).toBe(3);
      });

      await act(async () => {
        await result.current.removeSquad(1);
      });

      expect(mockDeleteSquad).toHaveBeenCalledWith(1);

      // Squad should be removed
      await waitFor(() => {
        expect(result.current.squads.find((s) => s.id === 1)).toBeUndefined();
      });
    });

    it("refetches related queries after removing squad", async () => {
      mockGetSquads.mockResolvedValue(mockSquads);
      mockDeleteSquad.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.squads.length).toBe(3);
      });

      await act(async () => {
        await result.current.removeSquad(1);
      });

      expect(mockRefetchQueries).toHaveBeenCalled();
    });

    it("rolls back on delete error", async () => {
      mockGetSquads.mockResolvedValue(mockSquads);
      mockDeleteSquad.mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.squads.length).toBe(3);
      });

      // Try to delete - should fail
      try {
        await act(async () => {
          await result.current.removeSquad(1);
        });
      } catch {
        // Expected to throw
      }

      // Squad should still be there (rolled back)
      await waitFor(() => {
        expect(result.current.squads.find((s) => s.id === 1)).toBeDefined();
      });
    });

    it("completes remove mutation successfully", async () => {
      mockGetSquads.mockResolvedValue(mockSquads);
      mockDeleteSquad.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.squads.length).toBe(3);
      });

      await act(async () => {
        await result.current.removeSquad(1);
      });

      // After mutation completes, isMutating should be false
      expect(result.current.isMutating).toBe(false);
    });
  });

  describe("query key usage", () => {
    it("uses correct query key for caching", async () => {
      mockGetSquads.mockResolvedValue(mockSquads);

      renderHook(() => useSquadsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetSquads).toHaveBeenCalled();
      });

      const cachedData = queryClient.getQueryData(queryKeys.squads.all());
      expect(cachedData).toEqual(mockSquads);
    });
  });
});
