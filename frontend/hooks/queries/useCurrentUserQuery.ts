import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCallback } from "react";
import { getCurrentUser } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { User } from "@/shared/types/user";
import { STALE_TIMES } from "@/lib/constants";

export interface UseCurrentUserQueryOptions {
  staleTime?: number;
  enabled?: boolean;
}

export interface UseCurrentUserQueryResult {
  currentUser: User | null;
  isLoading: boolean;
  isAuthLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  isSupervisor: boolean;
  isSupervisorOrAdmin: boolean;
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
}

export const useCurrentUserQuery = (
  options: UseCurrentUserQueryOptions = {},
): UseCurrentUserQueryResult => {
  const { staleTime = STALE_TIMES.STANDARD } = options;
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
    await queryClient.invalidateQueries({
      queryKey: queryKeys.users.current(),
    });
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
};

export default useCurrentUserQuery;
