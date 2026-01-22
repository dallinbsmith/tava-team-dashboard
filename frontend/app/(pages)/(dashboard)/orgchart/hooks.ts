"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrgChartDrafts,
  getOrgChartDraft,
  createOrgChartDraft,
  updateOrgChartDraft,
  deleteOrgChartDraft,
  addDraftChange,
  removeDraftChange,
  publishDraft,
  getOrgTree,
  getSquads,
  createSquad,
  deleteSquad,
  getDepartments,
  deleteDepartment,
} from "./api";
import {
  CreateDraftRequest,
  UpdateDraftRequest,
  AddDraftChangeRequest,
} from "./types";
import { refetchQueries, queryKeyGroups } from "@/lib/queryUtils";

export const orgChartKeys = {
  all: ["orgChart"] as const,
  drafts: () => ["orgChart", "drafts"] as const,
  draft: (id: number) => ["orgChart", "drafts", id] as const,
  tree: () => ["orgChart", "tree"] as const,
  squads: () => ["orgChart", "squads"] as const,
  departments: () => ["orgChart", "departments"] as const,
};

// Drafts
export function useOrgChartDrafts() {
  return useQuery({
    queryKey: orgChartKeys.drafts(),
    queryFn: getOrgChartDrafts,
  });
}

export function useOrgChartDraft(id: number) {
  return useQuery({
    queryKey: orgChartKeys.draft(id),
    queryFn: () => getOrgChartDraft(id),
    enabled: id > 0,
  });
}

export function useCreateOrgChartDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDraftRequest) => createOrgChartDraft(data),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.orgChartDrafts());
    },
  });
}

export function useUpdateOrgChartDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDraftRequest }) => updateOrgChartDraft(id, data),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.orgChartDrafts());
    },
  });
}

export function useDeleteOrgChartDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteOrgChartDraft(id),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.orgChartDrafts());
    },
  });
}

export function useAddDraftChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ draftId, change }: { draftId: number; change: AddDraftChangeRequest }) =>
      addDraftChange(draftId, change),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.orgChartDrafts());
    },
  });
}

export function useRemoveDraftChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ draftId, userId }: { draftId: number; userId: number }) =>
      removeDraftChange(draftId, userId),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.orgChartDrafts());
    },
  });
}

export function usePublishDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draftId: number) => publishDraft(draftId),
    onSuccess: async () => {
      // Refetch org chart and organization data used across the app
      await refetchQueries(queryClient, queryKeyGroups.orgChartPublish());
    },
  });
}

// Tree
export function useOrgTree() {
  return useQuery({
    queryKey: orgChartKeys.tree(),
    queryFn: getOrgTree,
  });
}

// Squads
export function useSquads() {
  return useQuery({
    queryKey: orgChartKeys.squads(),
    queryFn: getSquads,
  });
}

export function useCreateSquad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createSquad(name),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.squadRelated());
    },
  });
}

export function useDeleteSquad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteSquad(id),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.squadRelated());
    },
  });
}

// Departments
export function useDepartments() {
  return useQuery({
    queryKey: orgChartKeys.departments(),
    queryFn: getDepartments,
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => deleteDepartment(name),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.departmentRelated());
    },
  });
}
