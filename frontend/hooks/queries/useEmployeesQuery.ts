import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCallback } from "react";
import { getEmployees, getEmployeeGraphQL } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { User } from "@/shared/types/user";

export interface UseEmployeesQueryOptions {
  /** Override the default stale time (5 minutes) */
  staleTime?: number;
  /** Whether to enable the query (default: true when authenticated) */
  enabled?: boolean;
}

export interface UseEmployeesQueryResult {
  /** List of employees */
  employees: User[];
  /** Whether the query is loading */
  isLoading: boolean;
  /** Error message if the query failed */
  error: string | null;
  /** Refetch the employees data */
  refetch: () => Promise<void>;
  /** Invalidate and refetch */
  invalidate: () => Promise<void>;
}

/**
 * Hook for fetching employees (direct reports for supervisors, all for admins).
 * Uses the centralized query key from queryKeys.employees.all()
 *
 * @example
 * ```tsx
 * const { employees, isLoading, error } = useEmployeesQuery();
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error} />;
 *
 * return <EmployeeList employees={employees} />;
 * ```
 */
// 5 minutes in milliseconds
const DEFAULT_STALE_TIME = 5 * 60 * 1000;

export function useEmployeesQuery(
  options: UseEmployeesQueryOptions = {}
): UseEmployeesQueryResult {
  const { staleTime = DEFAULT_STALE_TIME } = options;
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
    await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
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
}

export interface UseEmployeeQueryOptions {
  /** The employee ID to fetch */
  id: number;
  /** Override the default stale time (5 minutes) */
  staleTime?: number;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseEmployeeQueryResult {
  /** The employee data */
  employee: User | null;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Error message if the query failed */
  error: string | null;
  /** Refetch the employee data */
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching a single employee by ID.
 * Uses the centralized query key from queryKeys.employees.detail(id)
 *
 * @example
 * ```tsx
 * const { employee, isLoading } = useEmployeeQuery({ id: 123 });
 * ```
 */
export function useEmployeeQuery(
  options: UseEmployeeQueryOptions
): UseEmployeeQueryResult {
  const { id, staleTime = DEFAULT_STALE_TIME, enabled = true } = options;
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
}

export default useEmployeesQuery;
