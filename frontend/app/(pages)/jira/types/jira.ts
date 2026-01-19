import { User } from "../../../../shared/types/user";
import { TimeOffImpact } from "../../time-off/timeoff";

export interface JiraSettings {
  oauth_enabled: boolean;
  org_configured: boolean;
  jira_account_id?: string;
  jira_site_url?: string;
  jira_site_name?: string;
  configured_by_id?: number;
  can_configure: boolean;
}

export interface JiraOAuthAuthorizeResponse {
  authorization_url: string;
}

export interface JiraUser {
  account_id: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
}

export interface JiraUserWithMapping extends JiraUser {
  mapped_user_id?: number;
  mapped_user?: User;
}

export interface AutoMatchResult {
  matched: number;
  total_jira_users: number;
  matches: Array<{
    jira_user: JiraUser;
    user: User;
  }>;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status: string;
  priority?: string;
  issue_type: string;
  assignee?: JiraUser;
  reporter?: JiraUser;
  project: JiraProject;
  created: string;
  updated: string;
  start_date?: string;
  due_date?: string;
  labels?: string[];
  url: string;
  time_off_impact?: TimeOffImpact;
  sprint?: JiraSprint;
}

export interface TeamTaskEmployee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  department?: string;
}

export interface TeamTask extends JiraIssue {
  employee: TeamTaskEmployee;
  time_off_impact?: TimeOffImpact;
}
