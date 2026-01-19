"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getJiraSettings,
  disconnectJira,
  getMyJiraTasks,
  getUserJiraTasks,
  getTeamJiraTasks,
  getJiraProjects,
  getProjectJiraTasks,
  getJiraEpics,
  getJiraOAuthAuthorizeURL,
  getJiraUsers,
  autoMatchJiraUsers,
  updateUserJiraMapping,
} from "./api";
import {
  JiraSettings,
  JiraIssue,
  JiraProject,
  JiraUserWithMapping,
  AutoMatchResult,
  TeamTask,
} from "./types";

export const jiraKeys = {
  all: ["jira"] as const,
  settings: () => ["jira", "settings"] as const,
  myTasks: (maxResults?: number) => ["jira", "myTasks", maxResults ?? 50] as const,
  userTasks: (userId: number, maxResults?: number) => ["jira", "userTasks", userId, maxResults ?? 50] as const,
  teamTasks: (maxPerUser?: number) => ["jira", "teamTasks", maxPerUser ?? 20] as const,
  projects: () => ["jira", "projects"] as const,
  projectTasks: (projectKey: string, maxResults?: number) => ["jira", "projectTasks", projectKey, maxResults ?? 50] as const,
  epics: (maxResults?: number) => ["jira", "epics", maxResults ?? 100] as const,
  users: () => ["jira", "users"] as const,
};

export function useJiraSettings() {
  return useQuery({
    queryKey: jiraKeys.settings(),
    queryFn: getJiraSettings,
  });
}

export function useDisconnectJira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnectJira,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jiraKeys.all });
    },
  });
}

export function useMyJiraTasks(maxResults?: number) {
  return useQuery({
    queryKey: jiraKeys.myTasks(maxResults),
    queryFn: () => getMyJiraTasks(maxResults),
  });
}

export function useUserJiraTasks(userId: number, maxResults?: number) {
  return useQuery({
    queryKey: jiraKeys.userTasks(userId, maxResults),
    queryFn: () => getUserJiraTasks(userId, maxResults),
    enabled: userId > 0,
  });
}

export function useTeamJiraTasks(maxPerUser?: number) {
  return useQuery({
    queryKey: jiraKeys.teamTasks(maxPerUser),
    queryFn: () => getTeamJiraTasks(maxPerUser),
  });
}

export function useJiraProjects() {
  return useQuery({
    queryKey: jiraKeys.projects(),
    queryFn: getJiraProjects,
  });
}

export function useProjectJiraTasks(projectKey: string, maxResults?: number) {
  return useQuery({
    queryKey: jiraKeys.projectTasks(projectKey, maxResults),
    queryFn: () => getProjectJiraTasks(projectKey, maxResults),
    enabled: !!projectKey,
  });
}

export function useJiraEpics(maxResults?: number) {
  return useQuery({
    queryKey: jiraKeys.epics(maxResults),
    queryFn: () => getJiraEpics(maxResults),
  });
}

export function useJiraOAuthAuthorizeURL() {
  return useQuery({
    queryKey: ["jira", "oauth", "authorize"],
    queryFn: getJiraOAuthAuthorizeURL,
    enabled: false, // Only fetch when explicitly requested
  });
}

export function useJiraUsers() {
  return useQuery({
    queryKey: jiraKeys.users(),
    queryFn: getJiraUsers,
  });
}

export function useAutoMatchJiraUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: autoMatchJiraUsers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jiraKeys.users() });
    },
  });
}

export function useUpdateUserJiraMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, jiraAccountId }: { userId: number; jiraAccountId: string | null }) =>
      updateUserJiraMapping(userId, jiraAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jiraKeys.users() });
    },
  });
}
