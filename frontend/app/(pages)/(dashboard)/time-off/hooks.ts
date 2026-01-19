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

// Query keys for this feature
export const timeOffKeys = {
  all: ["timeOff"] as const,
  my: (status?: TimeOffStatus) => ["timeOff", "my", status ?? "all"] as const,
  pending: () => ["timeOff", "pending"] as const,
  team: () => ["timeOff", "team"] as const,
  detail: (id: number) => ["timeOff", id] as const,
};

// Queries
export function useMyTimeOffRequests(status?: TimeOffStatus) {
  return useQuery({
    queryKey: timeOffKeys.my(status),
    queryFn: () => getMyTimeOffRequests(status),
  });
}

export function usePendingTimeOffRequests() {
  return useQuery({
    queryKey: timeOffKeys.pending(),
    queryFn: getPendingTimeOffRequests,
  });
}

export function useTeamTimeOff() {
  return useQuery({
    queryKey: timeOffKeys.team(),
    queryFn: getTeamTimeOff,
  });
}

// Mutations
export function useCreateTimeOffRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTimeOffRequest) => createTimeOffRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeOffKeys.all });
    },
  });
}

export function useCancelTimeOffRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cancelTimeOffRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeOffKeys.all });
    },
  });
}

export function useReviewTimeOffRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, review }: { id: number; review: ReviewTimeOffRequest }) =>
      reviewTimeOffRequest(id, review),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeOffKeys.all });
    },
  });
}
