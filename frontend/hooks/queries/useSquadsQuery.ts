import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCallback } from "react";
import { getSquads, createSquad, deleteSquad, renameSquad } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { refetchQueries, queryKeyGroups } from "@/lib/query-utils";
import { Squad } from "@/shared/types/user";
import { STALE_TIMES } from "@/lib/constants";

export interface UseSquadsQueryOptions {
  enabled?: boolean;
}

export interface UseSquadsQueryResult {
  squads: Squad[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addSquad: (name: string) => Promise<Squad>;
  updateSquad: (id: number, newName: string) => Promise<Squad>;
  removeSquad: (id: number) => Promise<void>;
  isMutating: boolean;
}

export const useSquadsQuery = (options: UseSquadsQueryOptions = {}): UseSquadsQueryResult => {
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
    staleTime: STALE_TIMES.STANDARD,
  });

  const refetchRelatedQueries = useCallback(
    () => refetchQueries(queryClient, queryKeyGroups.squadRelated()),
    [queryClient]
  );

  const addMutation = useMutation({
    mutationFn: (name: string) => createSquad(name),
    onSuccess: async (newSquad) => {
      queryClient.setQueryData<Squad[]>(queryKeys.squads.all(), (old) =>
        old ? [...old, newSquad] : [newSquad]
      );
      await refetchRelatedQueries();
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameSquad(id, name),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.squads.all() });
      const previousSquads = queryClient.getQueryData<Squad[]>(queryKeys.squads.all());
      queryClient.setQueryData<Squad[]>(queryKeys.squads.all(), (old) =>
        old ? old.map((s) => (s.id === id ? { ...s, name } : s)) : []
      );
      return { previousSquads };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSquads) {
        queryClient.setQueryData(queryKeys.squads.all(), context.previousSquads);
      }
    },
    onSuccess: async () => {
      await refetchRelatedQueries();
    },
  });

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
    onSuccess: async () => {
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

  const updateSquad = useCallback(
    async (id: number, newName: string): Promise<Squad> => {
      return renameMutation.mutateAsync({ id, name: newName });
    },
    [renameMutation]
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
    updateSquad,
    removeSquad,
    isMutating: addMutation.isPending || renameMutation.isPending || deleteMutation.isPending,
  };
};

export default useSquadsQuery;
