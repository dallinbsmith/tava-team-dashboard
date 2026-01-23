import {
  OrgChartDraft,
  DraftChange,
  CreateDraftRequest,
  UpdateDraftRequest,
  AddDraftChangeRequest,
  OrgTreeNode,
} from "../types";
import { Squad } from "@/shared/types/user";
import { fetchWithProxy, handleResponse } from "@/lib/api";

// Org Chart Drafts
export const getOrgChartDrafts = async (): Promise<OrgChartDraft[]> => {
  const response = await fetchWithProxy("/orgchart/drafts");
  return handleResponse<OrgChartDraft[]>(
    response,
    "Failed to fetch org chart drafts",
  );
};

export const getOrgChartDraft = async (id: number): Promise<OrgChartDraft> => {
  const response = await fetchWithProxy(`/orgchart/drafts/${id}`);
  return handleResponse<OrgChartDraft>(
    response,
    "Failed to fetch org chart draft",
  );
};

export const createOrgChartDraft = async (
  data: CreateDraftRequest,
): Promise<OrgChartDraft> => {
  const response = await fetchWithProxy("/orgchart/drafts", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<OrgChartDraft>(
    response,
    "Failed to create org chart draft",
  );
};

export const updateOrgChartDraft = async (
  id: number,
  data: UpdateDraftRequest,
): Promise<OrgChartDraft> => {
  const response = await fetchWithProxy(`/orgchart/drafts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<OrgChartDraft>(
    response,
    "Failed to update org chart draft",
  );
};

export const deleteOrgChartDraft = async (id: number): Promise<void> => {
  const response = await fetchWithProxy(`/orgchart/drafts/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete org chart draft");
};

export const addDraftChange = async (
  draftId: number,
  change: AddDraftChangeRequest,
): Promise<DraftChange> => {
  const response = await fetchWithProxy(`/orgchart/drafts/${draftId}/changes`, {
    method: "POST",
    body: JSON.stringify(change),
  });
  return handleResponse<DraftChange>(response, "Failed to add draft change");
};

export const removeDraftChange = async (
  draftId: number,
  userId: number,
): Promise<void> => {
  const response = await fetchWithProxy(
    `/orgchart/drafts/${draftId}/changes/${userId}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) throw new Error("Failed to remove draft change");
};

export const publishDraft = async (draftId: number): Promise<void> => {
  const response = await fetchWithProxy(`/orgchart/drafts/${draftId}/publish`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to publish draft");
};

// Org Tree
export const getOrgTree = async (): Promise<OrgTreeNode | OrgTreeNode[]> => {
  const response = await fetchWithProxy("/orgchart/tree");
  return handleResponse<OrgTreeNode | OrgTreeNode[]>(
    response,
    "Failed to fetch org tree",
  );
};

// Squads
export const getSquads = async (): Promise<Squad[]> => {
  const response = await fetchWithProxy("/squads");
  return handleResponse<Squad[]>(response, "Failed to fetch squads");
};

export const createSquad = async (name: string): Promise<Squad> => {
  const response = await fetchWithProxy("/squads", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return handleResponse<Squad>(response, "Failed to create squad");
};

export const deleteSquad = async (id: number): Promise<void> => {
  const response = await fetchWithProxy(`/squads/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete squad");
};

// Departments
export const getDepartments = async (): Promise<string[]> => {
  const response = await fetchWithProxy("/departments");
  return handleResponse<string[]>(response, "Failed to fetch departments");
};

export const deleteDepartment = async (name: string): Promise<void> => {
  const response = await fetchWithProxy(
    `/departments/${encodeURIComponent(name)}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) throw new Error("Failed to delete department");
};
