import {
  JiraSettings,
  JiraOAuthAuthorizeResponse,
  JiraIssue,
  JiraProject,
  JiraUserWithMapping,
  AutoMatchResult,
  TeamTask,
} from "./types";

const API_BASE_URL = "/api/proxy";

async function fetchWithProxy(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...options.headers, "Content-Type": "application/json" },
    credentials: "same-origin",
  });
}

async function handleResponse<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new Error(error || errorMessage);
  }
  return response.json();
}

// Settings
export async function getJiraSettings(): Promise<JiraSettings> {
  const response = await fetchWithProxy("/jira/settings");
  return handleResponse<JiraSettings>(response, "Failed to fetch Jira settings");
}

export async function disconnectJira(): Promise<void> {
  const response = await fetchWithProxy("/jira/disconnect", { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to disconnect Jira");
}

// Tasks
export async function getMyJiraTasks(maxResults: number = 50): Promise<JiraIssue[]> {
  const response = await fetchWithProxy(`/jira/tasks?max=${maxResults}`);
  return handleResponse<JiraIssue[]>(response, "Failed to fetch Jira tasks");
}

export async function getUserJiraTasks(userId: number, maxResults: number = 50): Promise<JiraIssue[]> {
  const response = await fetchWithProxy(`/jira/tasks/user/${userId}?max=${maxResults}`);
  return handleResponse<JiraIssue[]>(response, "Failed to fetch user's Jira tasks");
}

export async function getTeamJiraTasks(maxPerUser: number = 20): Promise<TeamTask[]> {
  const response = await fetchWithProxy(`/jira/tasks/team?max_per_user=${maxPerUser}`);
  return handleResponse<TeamTask[]>(response, "Failed to fetch team Jira tasks");
}

// Projects
export async function getJiraProjects(): Promise<JiraProject[]> {
  const response = await fetchWithProxy("/jira/projects");
  return handleResponse<JiraProject[]>(response, "Failed to fetch Jira projects");
}

export async function getProjectJiraTasks(projectKey: string, maxResults: number = 50): Promise<JiraIssue[]> {
  const response = await fetchWithProxy(`/jira/projects/${projectKey}/tasks?max=${maxResults}`);
  return handleResponse<JiraIssue[]>(response, "Failed to fetch project tasks");
}

// Epics
export async function getJiraEpics(maxResults: number = 100): Promise<JiraIssue[]> {
  const response = await fetchWithProxy(`/jira/epics?max=${maxResults}`);
  return handleResponse<JiraIssue[]>(response, "Failed to fetch Jira epics");
}

// OAuth
export async function getJiraOAuthAuthorizeURL(): Promise<JiraOAuthAuthorizeResponse> {
  const response = await fetchWithProxy("/jira/oauth/authorize");
  return handleResponse<JiraOAuthAuthorizeResponse>(response, "Failed to get Jira OAuth authorization URL");
}

// User Mapping
export async function getJiraUsers(): Promise<JiraUserWithMapping[]> {
  const response = await fetchWithProxy("/jira/users");
  return handleResponse<JiraUserWithMapping[]>(response, "Failed to fetch Jira users");
}

export async function autoMatchJiraUsers(): Promise<AutoMatchResult> {
  const response = await fetchWithProxy("/jira/users/auto-match", { method: "POST" });
  return handleResponse<AutoMatchResult>(response, "Failed to auto-match Jira users");
}

export async function updateUserJiraMapping(userId: number, jiraAccountId: string | null): Promise<void> {
  const response = await fetchWithProxy(`/jira/users/${userId}/mapping`, {
    method: "PUT",
    body: JSON.stringify({ jira_account_id: jiraAccountId }),
  });
  if (!response.ok) throw new Error("Failed to update Jira mapping");
}
