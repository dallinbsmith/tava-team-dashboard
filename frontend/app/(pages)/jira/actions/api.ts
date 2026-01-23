import {
  JiraSettings,
  JiraOAuthAuthorizeResponse,
  JiraIssue,
  JiraProject,
  JiraUserWithMapping,
  AutoMatchResult,
  TeamTask,
} from "../types";
import { fetchWithProxy, handleResponse } from "@/lib/api";

// Settings
export const getJiraSettings = async (): Promise<JiraSettings> => {
  const response = await fetchWithProxy("/jira/settings");
  return handleResponse<JiraSettings>(
    response,
    "Failed to fetch Jira settings",
  );
};

export const disconnectJira = async (): Promise<void> => {
  const response = await fetchWithProxy("/jira/disconnect", {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to disconnect Jira");
};

// Tasks
export const getMyJiraTasks = async (
  maxResults: number = 50,
): Promise<JiraIssue[]> => {
  const response = await fetchWithProxy(`/jira/tasks?max=${maxResults}`);
  return handleResponse<JiraIssue[]>(response, "Failed to fetch Jira tasks");
};

export const getUserJiraTasks = async (
  userId: number,
  maxResults: number = 50,
): Promise<JiraIssue[]> => {
  const response = await fetchWithProxy(
    `/jira/tasks/user/${userId}?max=${maxResults}`,
  );
  return handleResponse<JiraIssue[]>(
    response,
    "Failed to fetch user's Jira tasks",
  );
};

export const getTeamJiraTasks = async (
  maxPerUser: number = 20,
): Promise<TeamTask[]> => {
  const response = await fetchWithProxy(
    `/jira/tasks/team?max_per_user=${maxPerUser}`,
  );
  return handleResponse<TeamTask[]>(
    response,
    "Failed to fetch team Jira tasks",
  );
};

// Projects
export const getJiraProjects = async (): Promise<JiraProject[]> => {
  const response = await fetchWithProxy("/jira/projects");
  return handleResponse<JiraProject[]>(
    response,
    "Failed to fetch Jira projects",
  );
};

export const getProjectJiraTasks = async (
  projectKey: string,
  maxResults: number = 50,
): Promise<JiraIssue[]> => {
  const response = await fetchWithProxy(
    `/jira/projects/${projectKey}/tasks?max=${maxResults}`,
  );
  return handleResponse<JiraIssue[]>(response, "Failed to fetch project tasks");
};

// Epics
export const getJiraEpics = async (
  maxResults: number = 100,
): Promise<JiraIssue[]> => {
  const response = await fetchWithProxy(`/jira/epics?max=${maxResults}`);
  return handleResponse<JiraIssue[]>(response, "Failed to fetch Jira epics");
};

// OAuth
export const getJiraOAuthAuthorizeURL =
  async (): Promise<JiraOAuthAuthorizeResponse> => {
    const response = await fetchWithProxy("/jira/oauth/authorize");
    return handleResponse<JiraOAuthAuthorizeResponse>(
      response,
      "Failed to get Jira OAuth authorization URL",
    );
  };

// User Mapping
export const getJiraUsers = async (): Promise<JiraUserWithMapping[]> => {
  const response = await fetchWithProxy("/jira/users");
  return handleResponse<JiraUserWithMapping[]>(
    response,
    "Failed to fetch Jira users",
  );
};

export const autoMatchJiraUsers = async (): Promise<AutoMatchResult> => {
  const response = await fetchWithProxy("/jira/users/auto-match", {
    method: "POST",
  });
  return handleResponse<AutoMatchResult>(
    response,
    "Failed to auto-match Jira users",
  );
};

export const updateUserJiraMapping = async (
  userId: number,
  jiraAccountId: string | null,
): Promise<void> => {
  const response = await fetchWithProxy(`/jira/users/${userId}/mapping`, {
    method: "PUT",
    body: JSON.stringify({ jira_account_id: jiraAccountId }),
  });
  if (!response.ok) throw new Error("Failed to update Jira mapping");
};
