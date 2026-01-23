import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCallback } from "react";
import { getAllUsers, getDepartments } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { User } from "@/shared/types/user";

// 5 minutes in milliseconds
const DEFAULT_STALE_TIME = 5 * 60 * 1000;

export interface UseAllUsersQueryOptions {
  /** Override the default stale time (5 minutes) */
  staleTime?: number;
  /** Whether to enable the query (default: true when authenticated) */
  enabled?: boolean;
}

export interface UseAllUsersQueryResult {
  /** List of all users */
  allUsers: User[];
  /** Whether the query is loading */
  isLoading: boolean;
  /** Error message if the query failed */
  error: string | null;
  /** Refetch the users data */
  refetch: () => Promise<void>;
  /** Invalidate and refetch */
  invalidate: () => Promise<void>;
}

/**
 * Hook for fetching all users (for dropdowns, assignments, etc).
 * Uses the centralized query key from queryKeys.allUsers.all()
 *
 * @example
 * ```tsx
 * const { allUsers, isLoading } = useAllUsersQuery();
 *
 * return (
 *   <select>
 *     {allUsers.map(user => (
 *       <option key={user.id} value={user.id}>
 *         {user.first_name} {user.last_name}
 *       </option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export const useAllUsersQuery = (options: UseAllUsersQueryOptions = {}): UseAllUsersQueryResult => {
  const { staleTime = DEFAULT_STALE_TIME } = options;
  const { user: auth0User, isLoading: authLoading } = useUser();
  const queryClient = useQueryClient();

  const isAuthenticated = !!auth0User && !authLoading;

  const {
    data: allUsers = [],
    isLoading: queryLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.allUsers.all(),
    queryFn: getAllUsers,
    enabled: options.enabled ?? isAuthenticated,
    staleTime,
  });

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.allUsers.all() });
  }, [queryClient]);

  return {
    allUsers,
    isLoading: authLoading || queryLoading,
    error: queryError
      ? queryError instanceof Error
        ? queryError.message
        : "Failed to fetch users"
      : null,
    refetch,
    invalidate,
  };
};

export interface UseDepartmentsQueryOptions {
  /** Override the default stale time (5 minutes) */
  staleTime?: number;
  /** Whether to enable the query (default: true when authenticated) */
  enabled?: boolean;
}

export interface UseDepartmentsQueryResult {
  /** List of department names */
  departments: string[];
  /** Whether the query is loading */
  isLoading: boolean;
  /** Error message if the query failed */
  error: string | null;
  /** Refetch the departments data */
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching departments.
 * Uses the centralized query key from queryKeys.departments.all()
 *
 * @example
 * ```tsx
 * const { departments, isLoading } = useDepartmentsQuery();
 * ```
 */
export const useDepartmentsQuery = (
  options: UseDepartmentsQueryOptions = {}
): UseDepartmentsQueryResult => {
  const { staleTime = DEFAULT_STALE_TIME } = options;
  const { user: auth0User, isLoading: authLoading } = useUser();

  const isAuthenticated = !!auth0User && !authLoading;

  const {
    data: departments = [],
    isLoading: queryLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.departments.all(),
    queryFn: getDepartments,
    enabled: options.enabled ?? isAuthenticated,
    staleTime,
  });

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  return {
    departments,
    isLoading: authLoading || queryLoading,
    error: queryError
      ? queryError instanceof Error
        ? queryError.message
        : "Failed to fetch departments"
      : null,
    refetch,
  };
};

export default useAllUsersQuery;
