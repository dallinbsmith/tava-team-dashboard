import {
  OrgChartDraft,
  DraftChange,
  CreateDraftRequest,
  UpdateDraftRequest,
  AddDraftChangeRequest,
  OrgTreeNode,
} from "./types";
import { Squad } from "@/shared/types/user";
import { fetchWithProxy, handleResponse } from "@/lib/api";

// Org Chart Drafts
export async function getOrgChartDrafts(): Promise<OrgChartDraft[]> {
  const response = await fetchWithProxy("/orgchart/drafts");
  return handleResponse<OrgChartDraft[]>(response, "Failed to fetch org chart drafts");
}

export async function getOrgChartDraft(id: number): Promise<OrgChartDraft> {
  const response = await fetchWithProxy(`/orgchart/drafts/${id}`);
  return handleResponse<OrgChartDraft>(response, "Failed to fetch org chart draft");
}

export async function createOrgChartDraft(data: CreateDraftRequest): Promise<OrgChartDraft> {
  const response = await fetchWithProxy("/orgchart/drafts", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<OrgChartDraft>(response, "Failed to create org chart draft");
}

export async function updateOrgChartDraft(id: number, data: UpdateDraftRequest): Promise<OrgChartDraft> {
  const response = await fetchWithProxy(`/orgchart/drafts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<OrgChartDraft>(response, "Failed to update org chart draft");
}

export async function deleteOrgChartDraft(id: number): Promise<void> {
  const response = await fetchWithProxy(`/orgchart/drafts/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete org chart draft");
}

export async function addDraftChange(draftId: number, change: AddDraftChangeRequest): Promise<DraftChange> {
  const response = await fetchWithProxy(`/orgchart/drafts/${draftId}/changes`, {
    method: "POST",
    body: JSON.stringify(change),
  });
  return handleResponse<DraftChange>(response, "Failed to add draft change");
}

export async function removeDraftChange(draftId: number, userId: number): Promise<void> {
  const response = await fetchWithProxy(`/orgchart/drafts/${draftId}/changes/${userId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to remove draft change");
}

export async function publishDraft(draftId: number): Promise<void> {
  const response = await fetchWithProxy(`/orgchart/drafts/${draftId}/publish`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to publish draft");
}

// Org Tree
export async function getOrgTree(): Promise<OrgTreeNode | OrgTreeNode[]> {
  const response = await fetchWithProxy("/orgchart/tree");
  return handleResponse<OrgTreeNode | OrgTreeNode[]>(response, "Failed to fetch org tree");
}

// Squads
export async function getSquads(): Promise<Squad[]> {
  const response = await fetchWithProxy("/squads");
  return handleResponse<Squad[]>(response, "Failed to fetch squads");
}

export async function createSquad(name: string): Promise<Squad> {
  const response = await fetchWithProxy("/squads", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return handleResponse<Squad>(response, "Failed to create squad");
}

export async function deleteSquad(id: number): Promise<void> {
  const response = await fetchWithProxy(`/squads/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete squad");
}

// Departments
export async function getDepartments(): Promise<string[]> {
  const response = await fetchWithProxy("/departments");
  return handleResponse<string[]>(response, "Failed to fetch departments");
}

export async function deleteDepartment(name: string): Promise<void> {
  const response = await fetchWithProxy(`/departments/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete department");
}
