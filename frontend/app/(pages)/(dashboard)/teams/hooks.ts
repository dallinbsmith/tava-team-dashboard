"use client";

import { useQuery } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCallback, useMemo } from "react";
import { User } from "@/shared/types/user";
import { TimeOffRequest } from "@/app/(pages)/(dashboard)/time-off/types";
import { TeamTask } from "@/app/(pages)/jira/types";
import { getTeamTimeOff } from "@/app/(pages)/(dashboard)/time-off/actions";
import { getTeamJiraTasks } from "@/app/(pages)/jira/actions";
import {
  SelectionType,
  filterTimeOffByTeam,
  filterTasksByTeam,
  filterMembersByTeam,
  categorizeTasks,
  CategorizedTasks,
} from "./types";
import { STALE_TIMES, JIRA_LIMITS } from "@/lib/constants";

// Query key factory for teams
export const teamQueryKeys = {
  all: ["teams"] as const,
  timeOff: () => [...teamQueryKeys.all, "time-off"] as const,
  tasks: () => [...teamQueryKeys.all, "tasks"] as const,
};

interface UseTeamTimeOffOptions {
  type: SelectionType;
  id: string | null;
  allUsers: User[];
  enabled?: boolean;
}

interface UseTeamTimeOffResult {
  timeOff: TimeOffRequest[];
  currentlyOnLeave: TimeOffRequest[];
  upcoming: TimeOffRequest[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTeamTimeOff = ({
  type,
  id,
  allUsers,
  enabled = true,
}: UseTeamTimeOffOptions): UseTeamTimeOffResult => {
  const { user: auth0User, isLoading: authLoading } = useUser();

  const isAuthenticated = !!auth0User && !authLoading;

  const {
    data: allTimeOff = [],
    isLoading: queryLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: teamQueryKeys.timeOff(),
    queryFn: getTeamTimeOff,
    enabled: enabled && isAuthenticated && !!id,
    staleTime: STALE_TIMES.STANDARD,
  });

  // Filter time-off by team
  const filteredTimeOff = useMemo(() => {
    if (!id) return [];
    return filterTimeOffByTeam(allTimeOff, allUsers, type, id);
  }, [allTimeOff, allUsers, type, id]);

  // Separate into currently on leave and upcoming
  const { currentlyOnLeave, upcoming } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const onLeave: TimeOffRequest[] = [];
    const upcomingList: TimeOffRequest[] = [];

    filteredTimeOff
      .filter((req) => req.status === "approved")
      .forEach((req) => {
        const startDate = new Date(req.start_date);
        const endDate = new Date(req.end_date);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        if (startDate <= now && now <= endDate) {
          onLeave.push(req);
        } else if (startDate > now) {
          upcomingList.push(req);
        }
      });

    // Sort upcoming by start date
    upcomingList.sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    return { currentlyOnLeave: onLeave, upcoming: upcomingList };
  }, [filteredTimeOff]);

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  return {
    timeOff: filteredTimeOff,
    currentlyOnLeave,
    upcoming,
    isLoading: authLoading || queryLoading,
    error: queryError
      ? queryError instanceof Error
        ? queryError.message
        : "Failed to fetch time-off data"
      : null,
    refetch,
  };
};

interface UseTeamTasksOptions {
  type: SelectionType;
  id: string | null;
  allUsers: User[];
  enabled?: boolean;
}

interface UseTeamTasksResult {
  tasks: TeamTask[];
  categorized: CategorizedTasks;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTeamTasks = ({
  type,
  id,
  allUsers,
  enabled = true,
}: UseTeamTasksOptions): UseTeamTasksResult => {
  const { user: auth0User, isLoading: authLoading } = useUser();

  const isAuthenticated = !!auth0User && !authLoading;

  const {
    data: allTasks = [],
    isLoading: queryLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: teamQueryKeys.tasks(),
    queryFn: () => getTeamJiraTasks(JIRA_LIMITS.TASKS_DEFAULT),
    enabled: enabled && isAuthenticated && !!id,
    staleTime: STALE_TIMES.STANDARD,
  });

  // Filter tasks by team
  const filteredTasks = useMemo(() => {
    if (!id) return [];
    return filterTasksByTeam(allTasks, allUsers, type, id);
  }, [allTasks, allUsers, type, id]);

  // Categorize tasks
  const categorized = useMemo(() => categorizeTasks(filteredTasks), [filteredTasks]);

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  return {
    tasks: filteredTasks,
    categorized,
    isLoading: authLoading || queryLoading,
    error: queryError
      ? queryError instanceof Error
        ? queryError.message
        : "Failed to fetch tasks"
      : null,
    refetch,
  };
};

interface UseTeamMembersOptions {
  type: SelectionType;
  id: string | null;
  allUsers: User[];
}

interface UseTeamMembersResult {
  members: User[];
  count: number;
}

export const useTeamMembers = ({
  type,
  id,
  allUsers,
}: UseTeamMembersOptions): UseTeamMembersResult => {
  const members = useMemo(() => filterMembersByTeam(allUsers, type, id), [allUsers, type, id]);

  return {
    members,
    count: members.length,
  };
};
