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
export const getCalendarEvents = async (start: Date, end: Date): Promise<CalendarEvent[]> => {
  const response = await fetchWithProxy(
    `/calendar/events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
  );
  const data = await handleResponse<CalendarEventsResponse>(
    response,
    "Failed to fetch calendar events"
  );
  return data.events || [];
};

export const getCalendarEventsWithMetadata = async (
  start: Date,
  end: Date
): Promise<CalendarEventsResponse> => {
  const response = await fetchWithProxy(
    `/calendar/events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
  );
  return handleResponse<CalendarEventsResponse>(response, "Failed to fetch calendar events");
};

// Tasks
export const createTask = async (data: CreateTaskRequest): Promise<Task> => {
  const response = await fetchWithProxy("/calendar/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<Task>(response, "Failed to create task");
};

export const getTask = async (id: number): Promise<Task> => {
  const response = await fetchWithProxy(`/calendar/tasks/${id}`);
  return handleResponse<Task>(response, "Failed to fetch task");
};

export const updateTask = async (id: number, data: UpdateTaskRequest): Promise<Task> => {
  const response = await fetchWithProxy(`/calendar/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<Task>(response, "Failed to update task");
};

export const deleteTask = async (id: number): Promise<void> => {
  const response = await fetchWithProxy(`/calendar/tasks/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete task");
};

// Meetings
export const createMeeting = async (data: CreateMeetingRequest): Promise<Meeting> => {
  const response = await fetchWithProxy("/calendar/meetings", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<Meeting>(response, "Failed to create meeting");
};

export const getMeeting = async (id: number): Promise<Meeting> => {
  const response = await fetchWithProxy(`/calendar/meetings/${id}`);
  return handleResponse<Meeting>(response, "Failed to fetch meeting");
};

export const updateMeeting = async (id: number, data: UpdateMeetingRequest): Promise<Meeting> => {
  const response = await fetchWithProxy(`/calendar/meetings/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return handleResponse<Meeting>(response, "Failed to update meeting");
};

export const deleteMeeting = async (id: number): Promise<void> => {
  const response = await fetchWithProxy(`/calendar/meetings/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete meeting");
};

export const respondToMeeting = async (meetingId: number, response: ResponseStatus): Promise<void> => {
  const res = await fetchWithProxy(`/calendar/meetings/${meetingId}/respond`, {
    method: "POST",
    body: JSON.stringify({ response }),
  });
  if (!res.ok) throw new Error("Failed to respond to meeting");
};
