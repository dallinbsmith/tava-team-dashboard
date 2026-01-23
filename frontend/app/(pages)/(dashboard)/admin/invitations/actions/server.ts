"use server";

import { revalidatePath } from "next/cache";
import { Invitation, CreateInvitationRequest } from "../types";
import {
  ActionResult,
  authPost,
  authDelete,
  extractErrorMessage,
  success,
  failure,
} from "@/lib/server-actions";

export const createInvitationAction = async (
  data: CreateInvitationRequest
): Promise<ActionResult<Invitation>> => {
  try {
    const res = await authPost("/api/invitations", data);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to create invitation");
      return failure(error);
    }

    const invitation = await res.json();
    revalidatePath("/admin/invitations");
    return success(invitation);
  } catch (e) {
    console.error("createInvitationAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to create invitation");
  }
};

export const revokeInvitationAction = async (id: number): Promise<ActionResult<void>> => {
  try {
    const res = await authDelete(`/api/invitations/${id}`);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to revoke invitation");
      return failure(error);
    }

    revalidatePath("/admin/invitations");
    return success(undefined);
  } catch (e) {
    console.error("revokeInvitationAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to revoke invitation");
  }
};
