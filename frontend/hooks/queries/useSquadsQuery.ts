import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCallback } from "react";
import { getSquads, createSquad, deleteSquad } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { Squad } from "@/shared/types";

export interface UseSquadsQueryOptions {
  /** Override the default stale time (5 minutes) */
  staleTime?: number;
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
  /** Invalidate and refetch */
  invalidate: () => Promise<void>;
  /** Add a new squad */
  addSquad: (name: string) => Promise<Squad>;
  /** Delete a squad */
  removeSquad: (id: number) => Promise<void>;
  /** Whether a mutation is in progress */
  isMutating: boolean;
}

/**
 * Hook for fetching and managing squads.
 * Uses the centralized query key from queryKeys.squads.all()
 *
 * @example
 * ```tsx
 * const { squads, isLoading, addSquad } = useSquadsQuery();
 *
 * const handleCreate = async () => {
 *   const newSquad = await addSquad("Engineering");
 *   console.log("Created squad:", newSquad);
 * };
 * ```
 */
export function useSquadsQuery(
  options: UseSquadsQueryOptions = {}
): UseSquadsQueryResult {
  const { staleTime = 5 * 60 * 1000 } = options;
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
    staleTime,
  });

  // Add squad mutation with optimistic update
  const addMutation = useMutation({
    mutationFn: (name: string) => createSquad(name),
    onSuccess: (newSquad) => {
      queryClient.setQueryData<Squad[]>(queryKeys.squads.all(), (old) =>
        old ? [...old, newSquad] : [newSquad]
      );
    },
  });

  // Delete squad mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSquad(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.squads.all() });
      const previousSquads = queryClient.getQueryData<Squad[]>(queryKeys.squads.all());
      queryClient.setQueryData<Squad[]>(queryKeys.squads.all(), (old) =>
        old ? old.filter((s) => s.id !== id) : []
      );
      return { previousSquads };
    },
    onError: (_err, _id, context) => {
      if (context?.previousSquads) {
        queryClient.setQueryData(queryKeys.squads.all(), context.previousSquads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.squads.all() });
    },
  });

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.squads.all() });
  }, [queryClient]);

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
    invalidate,
    addSquad,
    removeSquad,
    isMutating: addMutation.isPending || deleteMutation.isPending,
  };
}

export default useSquadsQuery;
