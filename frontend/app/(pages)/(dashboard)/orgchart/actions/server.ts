"use server";

import { revalidatePath } from "next/cache";
import {
  OrgChartDraft,
  DraftChange,
  CreateDraftRequest,
  UpdateDraftRequest,
  AddDraftChangeRequest,
} from "../types";
import { Squad } from "@/shared/types/user";
import {
  ActionResult,
  authPost,
  authPut,
  authDelete,
  extractErrorMessage,
  success,
  failure,
} from "@/lib/server-actions";

export const createDraftAction = async (
  data: CreateDraftRequest
): Promise<ActionResult<OrgChartDraft>> => {
  try {
    const res = await authPost("/api/orgchart/drafts", data);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to create draft");
      return failure(error);
    }

    const draft = await res.json();
    revalidatePath("/orgchart");
    return success(draft);
  } catch (e) {
    console.error("createDraftAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to create draft");
  }
};

export const updateDraftAction = async (
  id: number,
  data: UpdateDraftRequest
): Promise<ActionResult<OrgChartDraft>> => {
  try {
    const res = await authPut(`/api/orgchart/drafts/${id}`, data);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to update draft");
      return failure(error);
    }

    const draft = await res.json();
    revalidatePath("/orgchart");
    return success(draft);
  } catch (e) {
    console.error("updateDraftAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to update draft");
  }
};

export const deleteDraftAction = async (id: number): Promise<ActionResult<void>> => {
  try {
    const res = await authDelete(`/api/orgchart/drafts/${id}`);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to delete draft");
      return failure(error);
    }

    revalidatePath("/orgchart");
    return success(undefined);
  } catch (e) {
    console.error("deleteDraftAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to delete draft");
  }
};

export const publishDraftAction = async (id: number): Promise<ActionResult<void>> => {
  try {
    const res = await authPost(`/api/orgchart/drafts/${id}/publish`);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to publish draft");
      return failure(error);
    }

    revalidatePath("/orgchart");
    revalidatePath("/");
    return success(undefined);
  } catch (e) {
    console.error("publishDraftAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to publish draft");
  }
};

export const addDraftChangeAction = async (
  draftId: number,
  change: AddDraftChangeRequest
): Promise<ActionResult<DraftChange>> => {
  try {
    const res = await authPost(`/api/orgchart/drafts/${draftId}/changes`, change);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to add change");
      return failure(error);
    }

    const draftChange = await res.json();
    revalidatePath("/orgchart");
    return success(draftChange);
  } catch (e) {
    console.error("addDraftChangeAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to add change");
  }
};

export const removeDraftChangeAction = async (
  draftId: number,
  userId: number
): Promise<ActionResult<void>> => {
  try {
    const res = await authDelete(`/api/orgchart/drafts/${draftId}/changes/${userId}`);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to remove change");
      return failure(error);
    }

    revalidatePath("/orgchart");
    return success(undefined);
  } catch (e) {
    console.error("removeDraftChangeAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to remove change");
  }
};

export const createSquadAction = async (name: string): Promise<ActionResult<Squad>> => {
  try {
    const res = await authPost("/api/squads", { name });

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to create squad");
      return failure(error);
    }

    const squad = await res.json();
    revalidatePath("/orgchart");
    return success(squad);
  } catch (e) {
    console.error("createSquadAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to create squad");
  }
};

export const deleteSquadAction = async (id: number): Promise<ActionResult<void>> => {
  try {
    const res = await authDelete(`/api/squads/${id}`);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to delete squad");
      return failure(error);
    }

    revalidatePath("/orgchart");
    return success(undefined);
  } catch (e) {
    console.error("deleteSquadAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to delete squad");
  }
};

export const deleteDepartmentAction = async (name: string): Promise<ActionResult<void>> => {
  try {
    const res = await authDelete(`/api/departments/${encodeURIComponent(name)}`);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to delete department");
      return failure(error);
    }

    revalidatePath("/orgchart");
    return success(undefined);
  } catch (e) {
    console.error("deleteDepartmentAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to delete department");
  }
};
