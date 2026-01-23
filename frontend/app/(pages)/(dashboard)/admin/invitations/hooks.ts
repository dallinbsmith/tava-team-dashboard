"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvitations, createInvitation, revokeInvitation } from "./actions";
import { CreateInvitationRequest } from "./types";
import { refetchQueries, queryKeyGroups } from "@/lib/query-utils";

export const invitationKeys = {
  all: ["invitations"] as const,
  list: () => ["invitations", "list"] as const,
};

export const useInvitations = () => {
  return useQuery({
    queryKey: invitationKeys.list(),
    queryFn: getInvitations,
  });
};

export const useCreateInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvitationRequest) => createInvitation(data),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.invitations());
    },
  });
};

export const useRevokeInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => revokeInvitation(id),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.invitations());
    },
  });
};
