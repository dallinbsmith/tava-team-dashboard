"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInvitations,
  createInvitation,
  revokeInvitation,
} from "./api";
import { CreateInvitationRequest } from "./types";
import { refetchQueries, queryKeyGroups } from "@/lib/queryUtils";

export const invitationKeys = {
  all: ["invitations"] as const,
  list: () => ["invitations", "list"] as const,
};

export function useInvitations() {
  return useQuery({
    queryKey: invitationKeys.list(),
    queryFn: getInvitations,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvitationRequest) => createInvitation(data),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.invitations());
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => revokeInvitation(id),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.invitations());
    },
  });
}
