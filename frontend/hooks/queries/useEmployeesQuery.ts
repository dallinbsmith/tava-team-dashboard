import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCallback } from "react";
import { getEmployees, getEmployeeGraphQL } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { User } from "@/shared/types/user";
import { STALE_TIMES } from "@/lib/constants";

export interface UseEmployeesQueryOptions {
  staleTime?: number;
  enabled?: boolean;
}

export interface UseEmployeesQueryResult {
  employees: User[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
}

export const useEmployeesQuery = (
  options: UseEmployeesQueryOptions = {},
): UseEmployeesQueryResult => {
  const { staleTime = STALE_TIMES.STANDARD } = options;
  const { user: auth0User, isLoading: authLoading } = useUser();
  const queryClient = useQueryClient();

  const isAuthenticated = !!auth0User && !authLoading;

  const {
    data: employees = [],
    isLoading: queryLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.employees.all(),
    queryFn: getEmployees,
    enabled: options.enabled ?? isAuthenticated,
    staleTime,
  });

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.employees.all(),
    });
  }, [queryClient]);

  return {
    employees,
    isLoading: authLoading || queryLoading,
    error: queryError
      ? queryError instanceof Error
        ? queryError.message
        : "Failed to fetch employees"
      : null,
    refetch,
    invalidate,
  };
};

export interface UseEmployeeQueryOptions {
  id: number;
  staleTime?: number;
  enabled?: boolean;
}

export interface UseEmployeeQueryResult {
  employee: User | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useEmployeeQuery = (
  options: UseEmployeeQueryOptions,
): UseEmployeeQueryResult => {
  const { id, staleTime = STALE_TIMES.STANDARD, enabled = true } = options;
  const { user: auth0User, isLoading: authLoading } = useUser();

  const isAuthenticated = !!auth0User && !authLoading;

  const {
    data: employee,
    isLoading: queryLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => getEmployeeGraphQL(id),
    enabled: enabled && isAuthenticated && id > 0,
    staleTime,
  });

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  return {
    employee: employee ?? null,
    isLoading: authLoading || queryLoading,
    error: queryError
      ? queryError instanceof Error
        ? queryError.message
        : "Failed to fetch employee"
      : null,
    refetch,
  };
};

export default useEmployeesQuery;
