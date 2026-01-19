import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCallback } from "react";
import { getCurrentUser } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { User } from "@/shared/types";

export interface UseCurrentUserQueryOptions {
  /** Override the default stale time (5 minutes) */
  staleTime?: number;
  /** Whether to enable the query (default: true when authenticated) */
  enabled?: boolean;
}

export interface UseCurrentUserQueryResult {
  /** The current user data */
  currentUser: User | null;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether auth is still loading */
  isAuthLoading: boolean;
  /** Error message if the query failed */
  error: string | null;
  /** Whether the user is an admin */
  isAdmin: boolean;
  /** Whether the user is a supervisor */
  isSupervisor: boolean;
  /** Whether the user is a supervisor or admin */
  isSupervisorOrAdmin: boolean;
  /** Refetch the current user data */
  refetch: () => Promise<void>;
  /** Invalidate and refetch */
  invalidate: () => Promise<void>;
}

/**
 * Hook for fetching and managing the current user's data.
 * Uses the centralized query key from queryKeys.users.current()
 *
 * @example
 * ```tsx
 * const { currentUser, isLoading, isAdmin } = useCurrentUserQuery();
 *
 * if (isLoading) return <Loading />;
 * if (!currentUser) return <Login />;
 *
 * return <div>Welcome, {currentUser.first_name}</div>;
 * ```
 */
export function useCurrentUserQuery(
  options: UseCurrentUserQueryOptions = {}
): UseCurrentUserQueryResult {
  const { staleTime = 5 * 60 * 1000 } = options;
  const { user: auth0User, isLoading: authLoading } = useUser();
  const queryClient = useQueryClient();

  const isAuthenticated = !!auth0User && !authLoading;

  const {
    data: currentUser,
    isLoading: queryLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.users.current(),
    queryFn: getCurrentUser,
    enabled: options.enabled ?? isAuthenticated,
    staleTime,
  });

  const isAdmin = currentUser?.role === "admin";
  const isSupervisor = currentUser?.role === "supervisor";
  const isSupervisorOrAdmin = isAdmin || isSupervisor;

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.users.current() });
  }, [queryClient]);

  return {
    currentUser: currentUser ?? null,
    isLoading: authLoading || queryLoading,
    isAuthLoading: authLoading,
    error: queryError
      ? queryError instanceof Error
        ? queryError.message
        : "Failed to fetch user"
      : null,
    isAdmin,
    isSupervisor,
    isSupervisorOrAdmin,
    refetch,
    invalidate,
  };
}

export default useCurrentUserQuery;
