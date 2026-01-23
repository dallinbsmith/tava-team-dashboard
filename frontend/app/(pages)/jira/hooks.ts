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
} from "./actions";

export const jiraKeys = {
  all: ["jira"] as const,
  settings: () => ["jira", "settings"] as const,
  myTasks: (maxResults?: number) =>
    ["jira", "myTasks", maxResults ?? 50] as const,
  userTasks: (userId: number, maxResults?: number) =>
    ["jira", "userTasks", userId, maxResults ?? 50] as const,
  teamTasks: (maxPerUser?: number) =>
    ["jira", "teamTasks", maxPerUser ?? 20] as const,
  projects: () => ["jira", "projects"] as const,
  projectTasks: (projectKey: string, maxResults?: number) =>
    ["jira", "projectTasks", projectKey, maxResults ?? 50] as const,
  epics: (maxResults?: number) => ["jira", "epics", maxResults ?? 100] as const,
  users: () => ["jira", "users"] as const,
};

export const useJiraSettings = () => {
  return useQuery({
    queryKey: jiraKeys.settings(),
    queryFn: getJiraSettings,
  });
};

export const useDisconnectJira = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnectJira,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jiraKeys.all });
    },
  });
};

export const useMyJiraTasks = (maxResults?: number) => {
  return useQuery({
    queryKey: jiraKeys.myTasks(maxResults),
    queryFn: () => getMyJiraTasks(maxResults),
  });
};

export const useUserJiraTasks = (userId: number, maxResults?: number) => {
  return useQuery({
    queryKey: jiraKeys.userTasks(userId, maxResults),
    queryFn: () => getUserJiraTasks(userId, maxResults),
    enabled: userId > 0,
  });
};

export const useTeamJiraTasks = (maxPerUser?: number) => {
  return useQuery({
    queryKey: jiraKeys.teamTasks(maxPerUser),
    queryFn: () => getTeamJiraTasks(maxPerUser),
  });
};

export const useJiraProjects = () => {
  return useQuery({
    queryKey: jiraKeys.projects(),
    queryFn: getJiraProjects,
  });
};

export const useProjectJiraTasks = (
  projectKey: string,
  maxResults?: number,
) => {
  return useQuery({
    queryKey: jiraKeys.projectTasks(projectKey, maxResults),
    queryFn: () => getProjectJiraTasks(projectKey, maxResults),
    enabled: !!projectKey,
  });
};

export const useJiraEpics = (maxResults?: number) => {
  return useQuery({
    queryKey: jiraKeys.epics(maxResults),
    queryFn: () => getJiraEpics(maxResults),
  });
};

export const useJiraOAuthAuthorizeURL = () => {
  return useQuery({
    queryKey: ["jira", "oauth", "authorize"],
    queryFn: getJiraOAuthAuthorizeURL,
    enabled: false, // Only fetch when explicitly requested
  });
};

export const useJiraUsers = () => {
  return useQuery({
    queryKey: jiraKeys.users(),
    queryFn: getJiraUsers,
  });
};

export const useAutoMatchJiraUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: autoMatchJiraUsers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jiraKeys.users() });
    },
  });
};

export const useUpdateUserJiraMapping = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      jiraAccountId,
    }: {
      userId: number;
      jiraAccountId: string | null;
    }) => updateUserJiraMapping(userId, jiraAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jiraKeys.users() });
    },
  });
};
