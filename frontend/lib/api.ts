import { User, Squad, Invitation, CreateInvitationRequest, JiraSettings, JiraOAuthAuthorizeResponse, JiraIssue, JiraProject, JiraUser, JiraUserWithMapping, AutoMatchResult, OrgChartDraft, DraftChange, CreateDraftRequest, UpdateDraftRequest, AddDraftChangeRequest, OrgTreeNode, TeamTask, CalendarEvent, CalendarEventsResponse, Task, Meeting, CreateTaskRequest, UpdateTaskRequest, CreateMeetingRequest, UpdateMeetingRequest, ResponseStatus, UpdateUserRequest, TimeOffRequest, TimeOffStatus, CreateTimeOffRequest, ReviewTimeOffRequest } from "@/shared/types";

// Re-export GraphQL functions for convenience
export {
  getEmployeesGraphQL,
  getEmployeeGraphQL,
  getCurrentUserGraphQL,
  createEmployeeGraphQL,
  updateEmployeeGraphQL,
  deleteEmployeeGraphQL,
} from "./graphql";

// API base URL - uses the Next.js proxy which handles token management server-side
// This keeps access tokens secure and never exposes them to client JavaScript
const API_BASE_URL = "/api/proxy";

/**
 * Fetch helper that uses the server-side proxy.
 * The proxy automatically adds the Auth0 access token from the session.
 * No access token is needed in client code.
 */
export async function fetchWithProxy(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
    },
    credentials: "same-origin", // Include cookies for session
  });

  return response;
}

/**
 * @deprecated Use fetchWithProxy instead. This function is kept for backward
 * compatibility during migration but will be removed in a future version.
 */
export async function fetchWithAuth(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  // Ignore the accessToken parameter and use the proxy instead
  return fetchWithProxy(path, options);
}

// Helper to handle API responses with consistent error handling
async function handleResponse<T>(
  response: Response,
  errorMessage: string
): Promise<T> {
  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new Error(error || errorMessage);
  }
  return response.json();
}

// Helper for simple GET requests that just need JSON response
async function apiGet<T>(
  path: string,
  errorMessage: string
): Promise<T> {
  const response = await fetchWithProxy(path);
  return handleResponse<T>(response, errorMessage);
}

// Helper for POST/PUT/DELETE requests with body
async function apiMutate<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  errorMessage: string,
  body?: unknown
): Promise<T> {
  const response = await fetchWithProxy(path, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response, errorMessage);
}

// Helper for DELETE requests that return void
async function apiDelete(
  path: string,
  errorMessage: string
): Promise<void> {
  const response = await fetchWithProxy(path, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(errorMessage);
  }
}

// ============================================================================
// Backward-compatible functions that accept accessToken but ignore it
// These can be gradually migrated to not require the accessToken parameter
// ============================================================================

export async function getCurrentUser(accessToken?: string): Promise<User> {
  return apiGet<User>("/me", "Failed to fetch current user");
}

export async function getEmployees(accessToken?: string): Promise<User[]> {
  return apiGet<User[]>("/employees", "Failed to fetch employees");
}

export async function getUserById(accessToken: string | undefined, id: number): Promise<User> {
  return apiGet<User>(`/users/${id}`, "Failed to fetch user");
}

export async function getSupervisors(accessToken?: string): Promise<User[]> {
  return apiGet<User[]>("/supervisors", "Failed to fetch supervisors");
}

export async function getSquads(accessToken?: string): Promise<Squad[]> {
  return apiGet<Squad[]>("/squads", "Failed to fetch squads");
}

export async function createSquad(name: string, accessToken?: string): Promise<Squad> {
  return apiMutate<Squad>("/squads", "POST", "Failed to create squad", { name });
}

export async function deleteSquad(id: number, accessToken?: string): Promise<void> {
  return apiDelete(`/squads/${id}`, "Failed to delete squad");
}

export async function getDepartments(accessToken?: string): Promise<string[]> {
  return apiGet<string[]>("/departments", "Failed to fetch departments");
}

export async function deleteDepartment(name: string, accessToken?: string): Promise<void> {
  return apiDelete(`/departments/${encodeURIComponent(name)}`, "Failed to delete department");
}

export async function updateUser(
  userId: number,
  data: UpdateUserRequest,
  accessToken?: string
): Promise<User> {
  return apiMutate<User>(
    `/users/${userId}`,
    "PUT",
    "Failed to update user",
    data
  );
}

export async function getAllUsers(accessToken?: string): Promise<User[]> {
  return apiGet<User[]>("/users", "Failed to fetch users");
}

export async function uploadAvatar(
  accessToken: string | undefined,
  userId: number,
  imageDataUrl: string
): Promise<User> {
  return apiMutate<User>(
    `/users/${userId}/avatar/base64`,
    "POST",
    "Failed to upload avatar",
    { image: imageDataUrl }
  );
}

// Invitation APIs (admin only)

export async function getInvitations(accessToken?: string): Promise<Invitation[]> {
  return apiGet<Invitation[]>("/invitations", "Failed to fetch invitations");
}

export async function createInvitation(
  accessToken: string | undefined,
  data: CreateInvitationRequest
): Promise<Invitation> {
  return apiMutate<Invitation>(
    "/invitations",
    "POST",
    "Failed to create invitation",
    data
  );
}

export async function revokeInvitation(accessToken: string | undefined, id: number): Promise<void> {
  return apiDelete(`/invitations/${id}`, "Failed to revoke invitation");
}

// Public invitation endpoints (no auth required - these still go directly to backend)

export interface ValidateInvitationResponse {
  valid: boolean;
  email: string;
  role: string;
  expires_at: string;
  status: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function validateInvitation(token: string): Promise<ValidateInvitationResponse> {
  const url = `${BACKEND_URL}/api/invitations/validate/${token}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Invalid invitation");
  }

  return response.json();
}

export interface AcceptInvitationRequest {
  auth0_id: string;
  first_name: string;
  last_name: string;
}

export async function acceptInvitation(
  token: string,
  data: AcceptInvitationRequest
): Promise<User> {
  const url = `${BACKEND_URL}/api/invitations/accept/${token}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to accept invitation");
  }

  return response.json();
}

// Jira Integration APIs

export async function getJiraSettings(accessToken?: string): Promise<JiraSettings> {
  return apiGet<JiraSettings>("/jira/settings", "Failed to fetch Jira settings");
}

// Disconnect organization-wide Jira (admin only)
export async function disconnectJira(accessToken?: string): Promise<void> {
  return apiDelete("/jira/disconnect", "Failed to disconnect Jira");
}

export async function getMyJiraTasks(
  accessToken?: string,
  maxResults: number = 50
): Promise<JiraIssue[]> {
  return apiGet<JiraIssue[]>(
    `/jira/tasks?max=${maxResults}`,
    "Failed to fetch Jira tasks"
  );
}

export async function getUserJiraTasks(
  accessToken: string | undefined,
  userId: number,
  maxResults: number = 50
): Promise<JiraIssue[]> {
  return apiGet<JiraIssue[]>(
    `/jira/tasks/user/${userId}?max=${maxResults}`,
    "Failed to fetch user's Jira tasks"
  );
}

export async function getTeamJiraTasks(
  accessToken?: string,
  maxPerUser: number = 20
): Promise<TeamTask[]> {
  return apiGet<TeamTask[]>(
    `/jira/tasks/team?max_per_user=${maxPerUser}`,
    "Failed to fetch team Jira tasks"
  );
}

export async function getJiraProjects(accessToken?: string): Promise<JiraProject[]> {
  return apiGet<JiraProject[]>("/jira/projects", "Failed to fetch Jira projects");
}

export async function getProjectJiraTasks(
  accessToken: string | undefined,
  projectKey: string,
  maxResults: number = 50
): Promise<JiraIssue[]> {
  return apiGet<JiraIssue[]>(
    `/jira/projects/${projectKey}/tasks?max=${maxResults}`,
    "Failed to fetch project tasks"
  );
}

export async function getJiraEpics(
  accessToken?: string,
  maxResults: number = 100
): Promise<JiraIssue[]> {
  return apiGet<JiraIssue[]>(
    `/jira/epics?max=${maxResults}`,
    "Failed to fetch Jira epics"
  );
}

// Jira OAuth APIs

export async function getJiraOAuthAuthorizeURL(accessToken?: string): Promise<JiraOAuthAuthorizeResponse> {
  return apiGet<JiraOAuthAuthorizeResponse>(
    "/jira/oauth/authorize",
    "Failed to get Jira OAuth authorization URL"
  );
}

// Jira User Mapping APIs (admin only)

export async function getJiraUsers(accessToken?: string): Promise<JiraUserWithMapping[]> {
  return apiGet<JiraUserWithMapping[]>("/jira/users", "Failed to fetch Jira users");
}

export async function autoMatchJiraUsers(accessToken?: string): Promise<AutoMatchResult> {
  return apiMutate<AutoMatchResult>(
    "/jira/users/auto-match",
    "POST",
    "Failed to auto-match Jira users"
  );
}

export async function updateUserJiraMapping(
  accessToken: string | undefined,
  userId: number,
  jiraAccountId: string | null
): Promise<void> {
  const response = await fetchWithProxy(`/jira/users/${userId}/mapping`, {
    method: "PUT",
    body: JSON.stringify({ jira_account_id: jiraAccountId }),
  });
  if (!response.ok) {
    throw new Error("Failed to update Jira mapping");
  }
}

// Org Chart APIs (supervisor only)

export async function getOrgChartDrafts(accessToken?: string): Promise<OrgChartDraft[]> {
  return apiGet<OrgChartDraft[]>("/orgchart/drafts", "Failed to fetch org chart drafts");
}

export async function createOrgChartDraft(
  accessToken: string | undefined,
  data: CreateDraftRequest
): Promise<OrgChartDraft> {
  return apiMutate<OrgChartDraft>(
    "/orgchart/drafts",
    "POST",
    "Failed to create draft",
    data
  );
}

export async function getOrgChartDraft(accessToken: string | undefined, id: number): Promise<OrgChartDraft> {
  return apiGet<OrgChartDraft>(`/orgchart/drafts/${id}`, "Failed to fetch draft");
}

export async function updateOrgChartDraft(
  accessToken: string | undefined,
  id: number,
  data: UpdateDraftRequest
): Promise<OrgChartDraft> {
  return apiMutate<OrgChartDraft>(
    `/orgchart/drafts/${id}`,
    "PUT",
    "Failed to update draft",
    data
  );
}

export async function deleteOrgChartDraft(accessToken: string | undefined, id: number): Promise<void> {
  return apiDelete(`/orgchart/drafts/${id}`, "Failed to delete draft");
}

export async function addDraftChange(
  accessToken: string | undefined,
  draftId: number,
  change: AddDraftChangeRequest
): Promise<DraftChange> {
  return apiMutate<DraftChange>(
    `/orgchart/drafts/${draftId}/changes`,
    "POST",
    "Failed to add change",
    change
  );
}

export async function removeDraftChange(
  accessToken: string | undefined,
  draftId: number,
  userId: number
): Promise<void> {
  return apiDelete(
    `/orgchart/drafts/${draftId}/changes/${userId}`,
    "Failed to remove change"
  );
}

export async function publishDraft(accessToken: string | undefined, draftId: number): Promise<void> {
  const response = await fetchWithProxy(
    `/orgchart/drafts/${draftId}/publish`,
    { method: "POST" }
  );
  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new Error(error || "Failed to publish draft");
  }
}

// Returns a single OrgTreeNode for supervisors, or array of OrgTreeNode for admins
export async function getOrgTree(accessToken?: string): Promise<OrgTreeNode | OrgTreeNode[]> {
  return apiGet<OrgTreeNode | OrgTreeNode[]>("/orgchart/tree", "Failed to fetch org tree");
}

// Calendar APIs

export async function getCalendarEvents(
  start: Date,
  end: Date,
  accessToken?: string
): Promise<CalendarEvent[]> {
  const startStr = start.toISOString();
  const endStr = end.toISOString();
  const response = await apiGet<CalendarEventsResponse>(
    `/calendar/events?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`,
    "Failed to fetch calendar events"
  );
  // Extract events array from BFF response
  return response.events || [];
}

// Get full calendar events response including metadata (jira_connected, counts, etc.)
export async function getCalendarEventsWithMetadata(
  start: Date,
  end: Date,
  accessToken?: string
): Promise<CalendarEventsResponse> {
  const startStr = start.toISOString();
  const endStr = end.toISOString();
  return apiGet<CalendarEventsResponse>(
    `/calendar/events?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`,
    "Failed to fetch calendar events"
  );
}

// Task APIs

export async function createTask(
  data: CreateTaskRequest,
  accessToken?: string
): Promise<Task> {
  return apiMutate<Task>(
    "/calendar/tasks",
    "POST",
    "Failed to create task",
    data
  );
}

export async function getTask(id: number, accessToken?: string): Promise<Task> {
  return apiGet<Task>(`/calendar/tasks/${id}`, "Failed to fetch task");
}

export async function updateTask(
  id: number,
  data: UpdateTaskRequest,
  accessToken?: string
): Promise<Task> {
  return apiMutate<Task>(
    `/calendar/tasks/${id}`,
    "PUT",
    "Failed to update task",
    data
  );
}

export async function deleteTask(id: number, accessToken?: string): Promise<void> {
  return apiDelete(`/calendar/tasks/${id}`, "Failed to delete task");
}

// Meeting APIs

export async function createMeeting(
  data: CreateMeetingRequest,
  accessToken?: string
): Promise<Meeting> {
  return apiMutate<Meeting>(
    "/calendar/meetings",
    "POST",
    "Failed to create meeting",
    data
  );
}

export async function getMeeting(id: number, accessToken?: string): Promise<Meeting> {
  return apiGet<Meeting>(`/calendar/meetings/${id}`, "Failed to fetch meeting");
}

export async function updateMeeting(
  id: number,
  data: UpdateMeetingRequest,
  accessToken?: string
): Promise<Meeting> {
  return apiMutate<Meeting>(
    `/calendar/meetings/${id}`,
    "PUT",
    "Failed to update meeting",
    data
  );
}

export async function deleteMeeting(id: number, accessToken?: string): Promise<void> {
  return apiDelete(`/calendar/meetings/${id}`, "Failed to delete meeting");
}

export async function respondToMeeting(
  meetingId: number,
  response: ResponseStatus,
  accessToken?: string
): Promise<void> {
  const res = await fetchWithProxy(`/calendar/meetings/${meetingId}/respond`, {
    method: "POST",
    body: JSON.stringify({ response }),
  });
  if (!res.ok) {
    throw new Error("Failed to respond to meeting");
  }
}

// Time Off APIs

export async function createTimeOffRequest(
  data: CreateTimeOffRequest,
  accessToken?: string
): Promise<TimeOffRequest> {
  return apiMutate<TimeOffRequest>(
    "/time-off",
    "POST",
    "Failed to create time off request",
    data
  );
}

export async function getMyTimeOffRequests(
  status?: TimeOffStatus,
  accessToken?: string
): Promise<TimeOffRequest[]> {
  const params = status ? `?status=${status}` : "";
  return apiGet<TimeOffRequest[]>(
    `/time-off${params}`,
    "Failed to fetch time off requests"
  );
}

export async function getTimeOffRequest(
  id: number,
  accessToken?: string
): Promise<TimeOffRequest> {
  return apiGet<TimeOffRequest>(
    `/time-off/${id}`,
    "Failed to fetch time off request"
  );
}

export async function cancelTimeOffRequest(
  id: number,
  accessToken?: string
): Promise<void> {
  return apiDelete(`/time-off/${id}`, "Failed to cancel time off request");
}

export async function getPendingTimeOffRequests(
  accessToken?: string
): Promise<TimeOffRequest[]> {
  return apiGet<TimeOffRequest[]>(
    "/time-off/pending",
    "Failed to fetch pending time off requests"
  );
}

export async function reviewTimeOffRequest(
  id: number,
  review: ReviewTimeOffRequest,
  accessToken?: string
): Promise<TimeOffRequest> {
  return apiMutate<TimeOffRequest>(
    `/time-off/${id}/review`,
    "PUT",
    "Failed to review time off request",
    review
  );
}

export async function getTeamTimeOff(
  accessToken?: string
): Promise<TimeOffRequest[]> {
  return apiGet<TimeOffRequest[]>(
    "/time-off/team",
    "Failed to fetch team time off"
  );
}
