import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCallback } from "react";
import { getSquads, createSquad, deleteSquad } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { refetchQueries, queryKeyGroups } from "@/lib/queryUtils";
import { Squad } from "@/shared/types/user";

// 5 minutes in milliseconds
const DEFAULT_STALE_TIME = 5 * 60 * 1000;

export interface UseSquadsQueryOptions {
  /** Whether to enable the query (default: true when authenticated) */
  enabled?: boolean;
}

export interface UseSquadsQueryResult {
  /** List of squads */
  squads: Squad[];
  /** Whether the query is loading */
  isLoading: boolean;
  /** Error message if the query failed */
  error: string | null;
  /** Refetch the squads data */
  refetch: () => Promise<void>;
  /** Add a new squad */
  addSquad: (name: string) => Promise<Squad>;
  /** Delete a squad */
  removeSquad: (id: number) => Promise<void>;
  /** Whether a mutation is in progress */
  isMutating: boolean;
}

/**
 * Hook for fetching and managing squads.
 * Includes mutations for add/remove with automatic cache invalidation.
 */
export function useSquadsQuery(
  options: UseSquadsQueryOptions = {}
): UseSquadsQueryResult {
  const { user: auth0User, isLoading: authLoading } = useUser();
  const queryClient = useQueryClient();

  const isAuthenticated = !!auth0User && !authLoading;

  const {
    data: squads = [],
    isLoading: queryLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.squads.all(),
    queryFn: getSquads,
    enabled: options.enabled ?? isAuthenticated,
    staleTime: DEFAULT_STALE_TIME,
  });

  // Force refetch all related queries after squad changes
  const refetchRelatedQueries = useCallback(
    () => refetchQueries(queryClient, queryKeyGroups.squadRelated()),
    [queryClient]
  );

  // Add squad mutation
  const addMutation = useMutation({
    mutationFn: (name: string) => createSquad(name),
    onSuccess: async (newSquad) => {
      // Immediately update cache
      queryClient.setQueryData<Squad[]>(queryKeys.squads.all(), (old) =>
        old ? [...old, newSquad] : [newSquad]
      );
      // Force refetch related queries to ensure consistency
      await refetchRelatedQueries();
    },
  });

  // Delete squad mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSquad(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.squads.all() });
      const previousSquads = queryClient.getQueryData<Squad[]>(queryKeys.squads.all());
      // Optimistic update
      queryClient.setQueryData<Squad[]>(queryKeys.squads.all(), (old) =>
        old ? old.filter((s) => s.id !== id) : []
      );
      return { previousSquads };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousSquads) {
        queryClient.setQueryData(queryKeys.squads.all(), context.previousSquads);
      }
    },
    onSuccess: async () => {
      // Force refetch related queries
      await refetchRelatedQueries();
    },
  });

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  const addSquad = useCallback(
    async (name: string): Promise<Squad> => {
      return addMutation.mutateAsync(name);
    },
    [addMutation]
  );

  const removeSquad = useCallback(
    async (id: number): Promise<void> => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  return {
    squads,
    isLoading: authLoading || queryLoading,
    error: queryError
      ? queryError instanceof Error
        ? queryError.message
        : "Failed to fetch squads"
      : null,
    refetch,
    addSquad,
    removeSquad,
    isMutating: addMutation.isPending || deleteMutation.isPending,
  };
}

export default useSquadsQuery;
