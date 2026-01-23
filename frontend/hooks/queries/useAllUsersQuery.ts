import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCallback } from "react";
import { getAllUsers, getDepartments } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { User } from "@/shared/types/user";
import { STALE_TIMES } from "@/lib/constants";

export interface UseAllUsersQueryOptions {
  staleTime?: number;
  enabled?: boolean;
}

export interface UseAllUsersQueryResult {
  allUsers: User[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
}

export const useAllUsersQuery = (
  options: UseAllUsersQueryOptions = {},
): UseAllUsersQueryResult => {
  const { staleTime = STALE_TIMES.STANDARD } = options;
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
  staleTime?: number;
  enabled?: boolean;
}

export interface UseDepartmentsQueryResult {
  departments: string[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useDepartmentsQuery = (
  options: UseDepartmentsQueryOptions = {},
): UseDepartmentsQueryResult => {
  const { staleTime = STALE_TIMES.STANDARD } = options;
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
