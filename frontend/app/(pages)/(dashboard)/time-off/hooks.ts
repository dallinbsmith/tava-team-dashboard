"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyTimeOffRequests,
  getPendingTimeOffRequests,
  getTeamTimeOff,
  createTimeOffRequest,
  cancelTimeOffRequest,
  reviewTimeOffRequest,
} from "./api";
import { TimeOffStatus, CreateTimeOffRequest, ReviewTimeOffRequest } from "./types";
import { refetchQueries, queryKeyGroups } from "@/lib/queryUtils";

// Query keys for this feature
export const timeOffKeys = {
  all: ["timeOff"] as const,
  my: (status?: TimeOffStatus) => ["timeOff", "my", status ?? "all"] as const,
  pending: () => ["timeOff", "pending"] as const,
  team: () => ["timeOff", "team"] as const,
  detail: (id: number) => ["timeOff", id] as const,
};

// Queries
export const useMyTimeOffRequests = (status?: TimeOffStatus) => {
  return useQuery({
    queryKey: timeOffKeys.my(status),
    queryFn: () => getMyTimeOffRequests(status),
  });
};

export const usePendingTimeOffRequests = () => {
  return useQuery({
    queryKey: timeOffKeys.pending(),
    queryFn: getPendingTimeOffRequests,
  });
};

export const useTeamTimeOff = () => {
  return useQuery({
    queryKey: timeOffKeys.team(),
    queryFn: getTeamTimeOff,
  });
};

// Mutations
export const useCreateTimeOffRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTimeOffRequest) => createTimeOffRequest(data),
    onSuccess: async () => {
      // Force refetch all time-off and calendar queries
      await refetchQueries(queryClient, queryKeyGroups.timeOffRelated());
    },
  });
};

export const useCancelTimeOffRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cancelTimeOffRequest(id),
    onSuccess: async () => {
      // Force refetch all time-off and calendar queries
      await refetchQueries(queryClient, queryKeyGroups.timeOffRelated());
    },
  });
};

export const useReviewTimeOffRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, review }: { id: number; review: ReviewTimeOffRequest }) =>
      reviewTimeOffRequest(id, review),
    onSuccess: async () => {
      // Force refetch all time-off and calendar queries
      await refetchQueries(queryClient, queryKeyGroups.timeOffRelated());
    },
  });
};
