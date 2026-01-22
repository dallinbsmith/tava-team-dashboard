import {
  CalendarEvent,
  CalendarEventsResponse,
  Task,
  Meeting,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  ResponseStatus,
} from "./types";
import { fetchWithProxy, handleResponse } from "@/lib/api";

// Calendar Events
export async function getCalendarEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
  const response = await fetchWithProxy(
    `/calendar/events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
  );
  const data = await handleResponse<CalendarEventsResponse>(response, "Failed to fetch calendar events");
  return data.events || [];
}

export async function getCalendarEventsWithMetadata(start: Date, end: Date): Promise<CalendarEventsResponse> {
  const response = await fetchWithProxy(
    `/calendar/events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
  );
  return handleResponse<CalendarEventsResponse>(response, "Failed to fetch calendar events");
}

// Tasks
export async function createTask(data: CreateTaskRequest): Promise<Task> {
  const response = await fetchWithProxy("/calendar/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<Task>(response, "Failed to create task");
}

export async function getTask(id: number): Promise<Task> {
  const response = await fetchWithProxy(`/calendar/tasks/${id}`);
  return handleResponse<Task>(response, "Failed to fetch task");
}

export async function updateTask(id: number, data: UpdateTaskRequest): Promise<Task> {
  const response = await fetchWithProxy(`/calendar/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<Task>(response, "Failed to update task");
}

export async function deleteTask(id: number): Promise<void> {
  const response = await fetchWithProxy(`/calendar/tasks/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete task");
}

// Meetings
export async function createMeeting(data: CreateMeetingRequest): Promise<Meeting> {
  const response = await fetchWithProxy("/calendar/meetings", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<Meeting>(response, "Failed to create meeting");
}

export async function getMeeting(id: number): Promise<Meeting> {
  const response = await fetchWithProxy(`/calendar/meetings/${id}`);
  return handleResponse<Meeting>(response, "Failed to fetch meeting");
}

export async function updateMeeting(id: number, data: UpdateMeetingRequest): Promise<Meeting> {
  const response = await fetchWithProxy(`/calendar/meetings/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<Meeting>(response, "Failed to update meeting");
}

export async function deleteMeeting(id: number): Promise<void> {
  const response = await fetchWithProxy(`/calendar/meetings/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete meeting");
}

export async function respondToMeeting(meetingId: number, response: ResponseStatus): Promise<void> {
  const res = await fetchWithProxy(`/calendar/meetings/${meetingId}/respond`, {
    method: "POST",
    body: JSON.stringify({ response }),
  });
  if (!res.ok) throw new Error("Failed to respond to meeting");
}
