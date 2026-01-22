import { User, Squad, UpdateUserRequest } from "@/shared/types/user";
import { Invitation, CreateInvitationRequest } from "@/app/(pages)/(dashboard)/admin/invitations/types";
import { JiraSettings, JiraOAuthAuthorizeResponse, JiraIssue, JiraProject, JiraUserWithMapping, AutoMatchResult, TeamTask } from "@/app/(pages)/jira/types";
import { OrgChartDraft, DraftChange, CreateDraftRequest, UpdateDraftRequest, AddDraftChangeRequest, OrgTreeNode } from "@/app/(pages)/(dashboard)/orgchart/types";
import { CalendarEventsResponse, Task, Meeting, CreateTaskRequest, UpdateTaskRequest, CreateMeetingRequest, UpdateMeetingRequest, ResponseStatus } from "@/app/(pages)/(dashboard)/calendar/types";
import { TimeOffRequest, TimeOffStatus, CreateTimeOffRequest, ReviewTimeOffRequest } from "@/app/(pages)/(dashboard)/time-off/types";
import { extractErrorMessage } from "./api-utils";

export { getEmployeesGraphQL, getEmployeeGraphQL, getCurrentUserGraphQL, createEmployeeGraphQL, updateEmployeeGraphQL, deleteEmployeeGraphQL } from "./graphql";

const API_BASE_URL = "/api/proxy";

// Get impersonated user ID from sessionStorage (client-side only)
function getImpersonationHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const impersonatedUserId = sessionStorage.getItem("impersonation_user_id");
  return impersonatedUserId ? { "X-Impersonate-User-Id": impersonatedUserId } : {};
}

export async function fetchWithProxy(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      ...getImpersonationHeader(),
    },
    credentials: "same-origin",
  });
}

/**
 * Generic response handler for API calls
 * Throws an error with the response text or fallback message if not ok
 */
export async function handleResponse<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    const error = await extractErrorMessage(response, errorMessage);
    throw new Error(error);
  }
  return response.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetchWithProxy(path);
  if (!res.ok) throw new Error(await extractErrorMessage(res, `GET ${path} failed`));
  return res.json();
}

async function mutate<T>(path: string, method: "POST" | "PUT", body?: unknown): Promise<T> {
  const res = await fetchWithProxy(path, { method, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(await extractErrorMessage(res, `${method} ${path} failed`));
  return res.json();
}

async function del(path: string): Promise<void> {
  const res = await fetchWithProxy(path, { method: "DELETE" });
  if (!res.ok) throw new Error(await extractErrorMessage(res, `DELETE ${path} failed`));
}

async function postVoid(path: string, body?: unknown): Promise<void> {
  const res = await fetchWithProxy(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(await extractErrorMessage(res, `POST ${path} failed`));
}

// User & Organization
export const getCurrentUser = () => get<User>("/me");
export const getEmployees = () => get<User[]>("/employees");
export const getUserById = (id: number) => get<User>(`/users/${id}`);
export const getSupervisors = () => get<User[]>("/supervisors");
export const getAllUsers = () => get<User[]>("/users");
export const updateUser = (userId: number, data: UpdateUserRequest) => mutate<User>(`/users/${userId}`, "PUT", data);
export const uploadAvatar = (userId: number, imageDataUrl: string) => mutate<User>(`/users/${userId}/avatar/base64`, "POST", { image: imageDataUrl });
export const deactivateUser = (userId: number) => postVoid(`/users/${userId}/deactivate`);

// Squads & Departments
export const getSquads = () => get<Squad[]>("/squads");
export const createSquad = (name: string) => mutate<Squad>("/squads", "POST", { name });
export const deleteSquad = (id: number) => del(`/squads/${id}`);
export const getDepartments = () => get<string[]>("/departments");
export const deleteDepartment = (name: string) => del(`/departments/${encodeURIComponent(name)}`);

// Invitations
export const getInvitations = () => get<Invitation[]>("/invitations");
export const createInvitation = (data: CreateInvitationRequest) => mutate<Invitation>("/invitations", "POST", data);
export const revokeInvitation = (id: number) => del(`/invitations/${id}`);

// Public invitation endpoints (no auth - direct to backend)
export interface ValidateInvitationResponse { valid: boolean; email: string; role: string; expires_at: string; status: string; }
export interface AcceptInvitationRequest { auth0_id: string; first_name: string; last_name: string; }

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function validateInvitation(token: string): Promise<ValidateInvitationResponse> {
  const res = await fetch(`${BACKEND_URL}/api/invitations/validate/${token}`);
  if (!res.ok) throw new Error("Invalid invitation");
  return res.json();
}

export async function acceptInvitation(token: string, data: AcceptInvitationRequest): Promise<User> {
  const res = await fetch(`${BACKEND_URL}/api/invitations/accept/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, "Failed to accept invitation"));
  return res.json();
}

// Jira
export const getJiraSettings = () => get<JiraSettings>("/jira/settings");
export const disconnectJira = () => del("/jira/disconnect");
export const getMyJiraTasks = (max = 50) => get<JiraIssue[]>(`/jira/tasks?max=${max}`);
export const getUserJiraTasks = (userId: number, max = 50) => get<JiraIssue[]>(`/jira/tasks/user/${userId}?max=${max}`);
export const getTeamJiraTasks = (maxPerUser = 20) => get<TeamTask[]>(`/jira/tasks/team?max_per_user=${maxPerUser}`);
export const getJiraProjects = () => get<JiraProject[]>("/jira/projects");
export const getProjectJiraTasks = (projectKey: string, max = 50) => get<JiraIssue[]>(`/jira/projects/${projectKey}/tasks?max=${max}`);
export const getJiraEpics = (max = 100) => get<JiraIssue[]>(`/jira/epics?max=${max}`);
export const getJiraOAuthAuthorizeURL = () => get<JiraOAuthAuthorizeResponse>("/jira/oauth/authorize");
export const getJiraUsers = () => get<JiraUserWithMapping[]>("/jira/users");
export const autoMatchJiraUsers = () => mutate<AutoMatchResult>("/jira/users/auto-match", "POST");

export async function updateUserJiraMapping(userId: number, jiraAccountId: string | null): Promise<void> {
  const res = await fetchWithProxy(`/jira/users/${userId}/mapping`, { method: "PUT", body: JSON.stringify({ jira_account_id: jiraAccountId }) });
  if (!res.ok) throw new Error("Failed to update Jira mapping");
}

// Org Chart
export const getOrgChartDrafts = () => get<OrgChartDraft[]>("/orgchart/drafts");
export const getOrgChartDraft = (id: number) => get<OrgChartDraft>(`/orgchart/drafts/${id}`);
export const createOrgChartDraft = (data: CreateDraftRequest) => mutate<OrgChartDraft>("/orgchart/drafts", "POST", data);
export const updateOrgChartDraft = (id: number, data: UpdateDraftRequest) => mutate<OrgChartDraft>(`/orgchart/drafts/${id}`, "PUT", data);
export const deleteOrgChartDraft = (id: number) => del(`/orgchart/drafts/${id}`);
export const addDraftChange = (draftId: number, change: AddDraftChangeRequest) => mutate<DraftChange>(`/orgchart/drafts/${draftId}/changes`, "POST", change);
export const removeDraftChange = (draftId: number, userId: number) => del(`/orgchart/drafts/${draftId}/changes/${userId}`);
export const publishDraft = (draftId: number) => postVoid(`/orgchart/drafts/${draftId}/publish`);
export const getOrgTree = () => get<OrgTreeNode | OrgTreeNode[]>("/orgchart/tree");

// Calendar
const calendarQuery = (start: Date, end: Date) => `/calendar/events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
export const getCalendarEvents = async (start: Date, end: Date) => (await get<CalendarEventsResponse>(calendarQuery(start, end))).events || [];
export const getCalendarEventsWithMetadata = (start: Date, end: Date) => get<CalendarEventsResponse>(calendarQuery(start, end));

// Tasks
export const createTask = (data: CreateTaskRequest) => mutate<Task>("/calendar/tasks", "POST", data);
export const getTask = (id: number) => get<Task>(`/calendar/tasks/${id}`);
export const updateTask = (id: number, data: UpdateTaskRequest) => mutate<Task>(`/calendar/tasks/${id}`, "PUT", data);
export const deleteTask = (id: number) => del(`/calendar/tasks/${id}`);

// Meetings
export const createMeeting = (data: CreateMeetingRequest) => mutate<Meeting>("/calendar/meetings", "POST", data);
export const getMeeting = (id: number) => get<Meeting>(`/calendar/meetings/${id}`);
export const updateMeeting = (id: number, data: UpdateMeetingRequest) => mutate<Meeting>(`/calendar/meetings/${id}`, "PUT", data);
export const deleteMeeting = (id: number) => del(`/calendar/meetings/${id}`);
export const respondToMeeting = (meetingId: number, response: ResponseStatus) => postVoid(`/calendar/meetings/${meetingId}/respond`, { response });

// Time Off
export const createTimeOffRequest = (data: CreateTimeOffRequest) => mutate<TimeOffRequest>("/time-off", "POST", data);
export const getMyTimeOffRequests = (status?: TimeOffStatus) => get<TimeOffRequest[]>(`/time-off${status ? `?status=${status}` : ""}`);
export const getTimeOffRequest = (id: number) => get<TimeOffRequest>(`/time-off/${id}`);
export const cancelTimeOffRequest = (id: number) => del(`/time-off/${id}`);
export const getPendingTimeOffRequests = () => get<TimeOffRequest[]>("/time-off/pending");
export const reviewTimeOffRequest = (id: number, review: ReviewTimeOffRequest) => mutate<TimeOffRequest>(`/time-off/${id}/review`, "PUT", review);
export const getTeamTimeOff = () => get<TimeOffRequest[]>("/time-off/team");
