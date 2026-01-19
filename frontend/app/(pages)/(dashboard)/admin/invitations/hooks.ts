"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInvitations,
  createInvitation,
  revokeInvitation,
} from "./api";
import { CreateInvitationRequest } from "./types";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => revokeInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    },
  });
}
