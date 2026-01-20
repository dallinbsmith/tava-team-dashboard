import { TimeOffRequest, TimeOffStatus, CreateTimeOffRequest, ReviewTimeOffRequest } from "./types";
import { fetchWithProxy, handleResponse } from "@/lib/api";

export async function createTimeOffRequest(
  data: CreateTimeOffRequest
): Promise<TimeOffRequest> {
  const response = await fetchWithProxy("/time-off", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<TimeOffRequest>(response, "Failed to create time off request");
}

export async function getMyTimeOffRequests(
  status?: TimeOffStatus
): Promise<TimeOffRequest[]> {
  const params = status ? `?status=${status}` : "";
  const response = await fetchWithProxy(`/time-off${params}`);
  return handleResponse<TimeOffRequest[]>(response, "Failed to fetch time off requests");
}

export async function getTimeOffRequest(id: number): Promise<TimeOffRequest> {
  const response = await fetchWithProxy(`/time-off/${id}`);
  return handleResponse<TimeOffRequest>(response, "Failed to fetch time off request");
}

export async function cancelTimeOffRequest(id: number): Promise<void> {
  const response = await fetchWithProxy(`/time-off/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Failed to cancel time off request");
  }
}

export async function getPendingTimeOffRequests(): Promise<TimeOffRequest[]> {
  const response = await fetchWithProxy("/time-off/pending");
  return handleResponse<TimeOffRequest[]>(response, "Failed to fetch pending time off requests");
}

export async function reviewTimeOffRequest(
  id: number,
  review: ReviewTimeOffRequest
): Promise<TimeOffRequest> {
  const response = await fetchWithProxy(`/time-off/${id}/review`, {
    method: "PUT",
    body: JSON.stringify(review),
  });
  return handleResponse<TimeOffRequest>(response, "Failed to review time off request");
}

export async function getTeamTimeOff(): Promise<TimeOffRequest[]> {
  const response = await fetchWithProxy("/time-off/team");
  return handleResponse<TimeOffRequest[]>(response, "Failed to fetch team time off");
}
