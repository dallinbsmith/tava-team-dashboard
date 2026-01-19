"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCalendarEvents,
  getCalendarEventsWithMetadata,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  createMeeting,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  respondToMeeting,
} from "./api";
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

export const calendarKeys = {
  all: ["calendar"] as const,
  events: (start: Date, end: Date) => ["calendar", "events", start.toISOString(), end.toISOString()] as const,
  eventsWithMetadata: (start: Date, end: Date) => ["calendar", "eventsWithMetadata", start.toISOString(), end.toISOString()] as const,
  tasks: ["calendar", "tasks"] as const,
  task: (id: number) => ["calendar", "tasks", id] as const,
  meetings: ["calendar", "meetings"] as const,
  meeting: (id: number) => ["calendar", "meetings", id] as const,
};

export function useCalendarEvents(start: Date, end: Date) {
  return useQuery({
    queryKey: calendarKeys.events(start, end),
    queryFn: () => getCalendarEvents(start, end),
  });
}

export function useCalendarEventsWithMetadata(start: Date, end: Date) {
  return useQuery({
    queryKey: calendarKeys.eventsWithMetadata(start, end),
    queryFn: () => getCalendarEventsWithMetadata(start, end),
  });
}

export function useTask(id: number) {
  return useQuery({
    queryKey: calendarKeys.task(id),
    queryFn: () => getTask(id),
    enabled: id > 0,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskRequest }) => updateTask(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.task(variables.id) });
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useMeeting(id: number) {
  return useQuery({
    queryKey: calendarKeys.meeting(id),
    queryFn: () => getMeeting(id),
    enabled: id > 0,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMeetingRequest) => createMeeting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMeetingRequest }) => updateMeeting(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.meeting(variables.id) });
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteMeeting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useRespondToMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meetingId, response }: { meetingId: number; response: ResponseStatus }) =>
      respondToMeeting(meetingId, response),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.meeting(variables.meetingId) });
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}
