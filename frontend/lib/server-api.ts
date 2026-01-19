import "server-only";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { User, TimeOffRequest, JiraSettings, JiraUserWithMapping, OrgTreeNode, OrgChartDraft, Squad } from "@/shared/types";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * Server-side fetch helper that gets the access token from Auth0 session
 * and calls the backend directly. Use this in Server Components.
 */
async function serverFetch<T>(
  path: string,
  errorMessage: string
): Promise<T> {
  const { accessToken } = await getAccessToken();

  if (!accessToken) {
    throw new Error("Unauthorized");
  }

  const response = await fetch(`${BACKEND_URL}/api${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store", // Don't cache authenticated requests
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new Error(error || errorMessage);
  }

  return response.json();
}

// Server-side API functions for use in Server Components

export async function getUserByIdServer(id: number): Promise<User> {
  return serverFetch<User>(`/users/${id}`, "Failed to fetch user");
}

export async function getCurrentUserServer(): Promise<User> {
  return serverFetch<User>("/me", "Failed to fetch current user");
}

export async function getEmployeesServer(): Promise<User[]> {
  return serverFetch<User[]>("/employees", "Failed to fetch employees");
}

export async function getMyTimeOffRequestsServer(): Promise<TimeOffRequest[]> {
  return serverFetch<TimeOffRequest[]>("/time-off", "Failed to fetch time off requests");
}

export async function getPendingTimeOffRequestsServer(): Promise<TimeOffRequest[]> {
  return serverFetch<TimeOffRequest[]>("/time-off/pending", "Failed to fetch pending requests");
}

export async function getJiraSettingsServer(): Promise<JiraSettings> {
  return serverFetch<JiraSettings>("/jira/settings", "Failed to fetch Jira settings");
}

export async function getJiraUsersServer(): Promise<JiraUserWithMapping[]> {
  return serverFetch<JiraUserWithMapping[]>("/jira/users", "Failed to fetch Jira users");
}

export async function getAllUsersServer(): Promise<User[]> {
  return serverFetch<User[]>("/users", "Failed to fetch users");
}

export async function getOrgTreeServer(): Promise<OrgTreeNode | OrgTreeNode[]> {
  return serverFetch<OrgTreeNode | OrgTreeNode[]>("/orgchart/tree", "Failed to fetch org tree");
}

export async function getOrgChartDraftsServer(): Promise<OrgChartDraft[]> {
  return serverFetch<OrgChartDraft[]>("/orgchart/drafts", "Failed to fetch org chart drafts");
}

export async function getSquadsServer(): Promise<Squad[]> {
  return serverFetch<Squad[]>("/squads", "Failed to fetch squads");
}

export async function getDepartmentsServer(): Promise<string[]> {
  return serverFetch<string[]>("/departments", "Failed to fetch departments");
}
