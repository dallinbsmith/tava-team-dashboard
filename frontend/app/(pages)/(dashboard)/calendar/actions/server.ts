"use server";

import { revalidatePath } from "next/cache";
import {
  Task,
  Meeting,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  ResponseStatus,
} from "../types";
import {
  ActionResult,
  authPost,
  authPut,
  authDelete,
  extractErrorMessage,
  success,
  failure,
} from "@/lib/server-actions";

export const createTaskAction = async (
  data: CreateTaskRequest,
): Promise<ActionResult<Task>> => {
  try {
    const res = await authPost("/api/calendar/tasks", data);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to create task");
      return failure(error);
    }

    const task = await res.json();
    revalidatePath("/calendar");
    revalidatePath("/"); // Dashboard shows calendar widget
    return success(task);
  } catch (e) {
    console.error("createTaskAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to create task");
  }
};

export const updateTaskAction = async (
  id: number,
  data: UpdateTaskRequest,
): Promise<ActionResult<Task>> => {
  try {
    const res = await authPut(`/api/calendar/tasks/${id}`, data);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to update task");
      return failure(error);
    }

    const task = await res.json();
    revalidatePath("/calendar");
    revalidatePath("/");
    return success(task);
  } catch (e) {
    console.error("updateTaskAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to update task");
  }
};

export const deleteTaskAction = async (
  id: number,
): Promise<ActionResult<void>> => {
  try {
    const res = await authDelete(`/api/calendar/tasks/${id}`);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to delete task");
      return failure(error);
    }

    revalidatePath("/calendar");
    revalidatePath("/");
    return success(undefined);
  } catch (e) {
    console.error("deleteTaskAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to delete task");
  }
};

export const createMeetingAction = async (
  data: CreateMeetingRequest,
): Promise<ActionResult<Meeting>> => {
  try {
    const res = await authPost("/api/calendar/meetings", data);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to create meeting");
      return failure(error);
    }

    const meeting = await res.json();
    revalidatePath("/calendar");
    revalidatePath("/");
    return success(meeting);
  } catch (e) {
    console.error("createMeetingAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to create meeting");
  }
};

export const updateMeetingAction = async (
  id: number,
  data: UpdateMeetingRequest,
): Promise<ActionResult<Meeting>> => {
  try {
    const res = await authPut(`/api/calendar/meetings/${id}`, data);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to update meeting");
      return failure(error);
    }

    const meeting = await res.json();
    revalidatePath("/calendar");
    revalidatePath("/");
    return success(meeting);
  } catch (e) {
    console.error("updateMeetingAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to update meeting");
  }
};

export const deleteMeetingAction = async (
  id: number,
): Promise<ActionResult<void>> => {
  try {
    const res = await authDelete(`/api/calendar/meetings/${id}`);

    if (!res.ok) {
      const error = await extractErrorMessage(res, "Failed to delete meeting");
      return failure(error);
    }

    revalidatePath("/calendar");
    revalidatePath("/");
    return success(undefined);
  } catch (e) {
    console.error("deleteMeetingAction error:", e);
    return failure(e instanceof Error ? e.message : "Failed to delete meeting");
  }
};

export const respondToMeetingAction = async (
  meetingId: number,
  response: ResponseStatus,
): Promise<ActionResult<void>> => {
  try {
    const res = await authPost(`/api/calendar/meetings/${meetingId}/respond`, {
      response,
    });

    if (!res.ok) {
      const error = await extractErrorMessage(
        res,
        "Failed to respond to meeting",
      );
      return failure(error);
    }

    revalidatePath("/calendar");
    revalidatePath("/");
    return success(undefined);
  } catch (e) {
    console.error("respondToMeetingAction error:", e);
    return failure(
      e instanceof Error ? e.message : "Failed to respond to meeting",
    );
  }
};
