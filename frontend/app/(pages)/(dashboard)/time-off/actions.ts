"use server";

import { revalidatePath } from "next/cache";
import { TimeOffRequest, CreateTimeOffRequest, ReviewTimeOffRequest } from "./types";
import {
  ActionResult,
  authPost,
  authPut,
  authDelete,
  extractErrorMessage,
  success,
  failure,
} from "@/lib/server-actions";

/**
 * Server Action: Create a new time off request
 */
export const createTimeOffRequestAction = async (
  data: CreateTimeOffRequest
): Promise<ActionResult<TimeOffRequest>> => {
  try {
    const res = await authPost("/api/time-off", data);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to create time off request");
      return failure(error);
    }

    const request = await res.json();
    revalidatePath("/time-off");
    revalidatePath("/"); // Dashboard also shows time off
    return success(request);
  } catch (e) {
    console.error("createTimeOffRequestAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to create time off request");
  }
};

/**
 * Server Action: Cancel a time off request
 */
export const cancelTimeOffRequestAction = async (id: number): Promise<ActionResult<void>> => {
  try {
    const res = await authDelete(`/api/time-off/${id}`);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to cancel time off request");
      return failure(error);
    }

    revalidatePath("/time-off");
    revalidatePath("/");
    return success(undefined);
  } catch (e) {
    console.error("cancelTimeOffRequestAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to cancel time off request");
  }
};

/**
 * Server Action: Review (approve/reject) a time off request
 */
export const reviewTimeOffRequestAction = async (
  id: number,
  review: ReviewTimeOffRequest
): Promise<ActionResult<TimeOffRequest>> => {
  try {
    const res = await authPut(`/api/time-off/${id}/review`, review);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to review time off request");
      return failure(error);
    }

    const request = await res.json();
    revalidatePath("/time-off");
    revalidatePath("/");
    return success(request);
  } catch (e) {
    console.error("reviewTimeOffRequestAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to review time off request");
  }
};
