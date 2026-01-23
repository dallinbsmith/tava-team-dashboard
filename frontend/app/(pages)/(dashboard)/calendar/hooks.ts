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
} from "./actions";
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  ResponseStatus,
} from "./types";
import { refetchQueries, queryKeyGroups } from "@/lib/query-utils";

export const calendarKeys = {
  all: ["calendar"] as const,
  events: (start: Date, end: Date) =>
    ["calendar", "events", start.toISOString(), end.toISOString()] as const,
  eventsWithMetadata: (start: Date, end: Date) =>
    [
      "calendar",
      "eventsWithMetadata",
      start.toISOString(),
      end.toISOString(),
    ] as const,
  tasks: ["calendar", "tasks"] as const,
  task: (id: number) => ["calendar", "tasks", id] as const,
  meetings: ["calendar", "meetings"] as const,
  meeting: (id: number) => ["calendar", "meetings", id] as const,
};

export const useCalendarEvents = (start: Date, end: Date) => {
  return useQuery({
    queryKey: calendarKeys.events(start, end),
    queryFn: () => getCalendarEvents(start, end),
  });
};

export const useCalendarEventsWithMetadata = (start: Date, end: Date) => {
  return useQuery({
    queryKey: calendarKeys.eventsWithMetadata(start, end),
    queryFn: () => getCalendarEventsWithMetadata(start, end),
  });
};

export const useTask = (id: number) => {
  return useQuery({
    queryKey: calendarKeys.task(id),
    queryFn: () => getTask(id),
    enabled: id > 0,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => createTask(data),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.calendarRelated());
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskRequest }) =>
      updateTask(id, data),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.calendarRelated());
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.calendarRelated());
    },
  });
};

export const useMeeting = (id: number) => {
  return useQuery({
    queryKey: calendarKeys.meeting(id),
    queryFn: () => getMeeting(id),
    enabled: id > 0,
  });
};

export const useCreateMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMeetingRequest) => createMeeting(data),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.calendarRelated());
    },
  });
};

export const useUpdateMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMeetingRequest }) =>
      updateMeeting(id, data),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.calendarRelated());
    },
  });
};

export const useDeleteMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteMeeting(id),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.calendarRelated());
    },
  });
};

export const useRespondToMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      meetingId,
      response,
    }: {
      meetingId: number;
      response: ResponseStatus;
    }) => respondToMeeting(meetingId, response),
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.calendarRelated());
    },
  });
};
