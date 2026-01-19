import "server-only";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { User, Squad } from "@/shared/types/user";
import { TimeOffRequest } from "@/app/(pages)/(dashboard)/time-off/types";
import { JiraSettings, JiraUserWithMapping } from "@/app/(pages)/jira/types";
import { OrgTreeNode, OrgChartDraft } from "@/app/(pages)/(dashboard)/orgchart/types";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/** Server-side fetch with Auth0 token. Use in Server Components. */
async function get<T>(path: string): Promise<T> {
  const { accessToken } = await getAccessToken();
  if (!accessToken) throw new Error("Unauthorized");

  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(await res.text().catch(() => `Failed to fetch ${path}`));
  return res.json();
}

// Server-side API functions
export const getUserByIdServer = (id: number) => get<User>(`/users/${id}`);
export const getCurrentUserServer = () => get<User>("/me");
export const getEmployeesServer = () => get<User[]>("/employees");
export const getAllUsersServer = () => get<User[]>("/users");
export const getMyTimeOffRequestsServer = () => get<TimeOffRequest[]>("/time-off");
export const getPendingTimeOffRequestsServer = () => get<TimeOffRequest[]>("/time-off/pending");
export const getJiraSettingsServer = () => get<JiraSettings>("/jira/settings");
export const getJiraUsersServer = () => get<JiraUserWithMapping[]>("/jira/users");
export const getOrgTreeServer = () => get<OrgTreeNode | OrgTreeNode[]>("/orgchart/tree");
export const getOrgChartDraftsServer = () => get<OrgChartDraft[]>("/orgchart/drafts");
export const getSquadsServer = () => get<Squad[]>("/squads");
export const getDepartmentsServer = () => get<string[]>("/departments");
