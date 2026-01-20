import { User } from "@/shared/types/user";
import { JiraIssue } from "@/app/(pages)/jira/types";
import { TimeOffRequest } from "../time-off/types";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type AssignmentType = "user" | "squad" | "department";
export type RecurrenceType = "daily" | "weekly" | "monthly";
export type ResponseStatus = "pending" | "accepted" | "declined" | "tentative";
export type CalendarEventType = "jira" | "epic" | "task" | "meeting" | "time_off";

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  due_date: string;
  start_time?: string;
  end_time?: string;
  all_day: boolean;
  created_by_id: number;
  assignment_type: AssignmentType;
  assigned_user_id?: number;
  assigned_squad_id?: number;
  assigned_department?: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingAttendee {
  id: number;
  meeting_id: number;
  user_id: number;
  response_status: ResponseStatus;
  user?: User;
  created_at: string;
  updated_at?: string;
}

export interface Meeting {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  created_by_id: number;
  recurrence_type?: RecurrenceType;
  recurrence_interval: number;
  recurrence_end_date?: string;
  recurrence_days_of_week?: number[];
  recurrence_day_of_month?: number;
  parent_meeting_id?: number;
  attendees?: MeetingAttendee[];
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  start: string;
  end?: string;
  all_day: boolean;
  url?: string;
  task?: Task;
  meeting?: Meeting;
  jira_issue?: JiraIssue;
  time_off_request?: TimeOffRequest;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  due_date: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  assignment_type: AssignmentType;
  assigned_user_id?: number;
  assigned_squad_id?: number;
  assigned_department?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  assignment_type?: AssignmentType;
  assigned_user_id?: number;
  assigned_squad_id?: number;
  assigned_department?: string;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  attendee_ids: number[];
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  recurrence_days_of_week?: number[];
  recurrence_day_of_month?: number;
}

export interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  attendee_ids?: number[];
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  recurrence_days_of_week?: number[];
  recurrence_day_of_month?: number;
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
  jira_connected: boolean;
  task_count: number;
  meeting_count: number;
  jira_count: number;
  time_off_count: number;
}
