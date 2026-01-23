import { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

/**
 * Refetch multiple queries safely, preventing one failure from breaking others.
 * Uses Promise.allSettled to ensure all refetches are attempted.
 *
 * @param queryClient - The React Query client
 * @param keys - Array of query keys to refetch
 */
export const refetchQueries = async (queryClient: QueryClient, keys: QueryKey[]): Promise<void> => {
  await Promise.allSettled(keys.map((queryKey) => queryClient.refetchQueries({ queryKey })));
};

/**
 * Invalidate multiple queries safely.
 * Uses Promise.allSettled to ensure all invalidations are attempted.
 *
 * @param queryClient - The React Query client
 * @param keys - Array of query keys to invalidate
 */
export const invalidateQueries = async (queryClient: QueryClient, keys: QueryKey[]): Promise<void> => {
  await Promise.allSettled(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
};

/**
 * Common query key groups for batch operations
 */
export const queryKeyGroups = {
  /** All user-related queries */
  users: () => [queryKeys.employees.all(), queryKeys.allUsers.all(), queryKeys.supervisors.all()],

  /** All organization structure queries */
  organization: () => [
    queryKeys.employees.all(),
    queryKeys.allUsers.all(),
    queryKeys.squads.all(),
    queryKeys.departments.all(),
    queryKeys.orgChart.tree(),
  ],

  /** Queries affected by squad changes */
  squadRelated: () => [
    queryKeys.squads.all(),
    queryKeys.employees.all(),
    queryKeys.allUsers.all(),
    queryKeys.orgChart.tree(),
  ],

  /** Queries affected by department changes */
  departmentRelated: () => [
    queryKeys.departments.all(),
    queryKeys.employees.all(),
    queryKeys.allUsers.all(),
    queryKeys.orgChart.tree(),
  ],

  /** Queries affected by employee updates */
  employeeRelated: () => [
    queryKeys.employees.all(),
    queryKeys.allUsers.all(),
    queryKeys.departments.all(),
    queryKeys.squads.all(),
    queryKeys.orgChart.tree(),
  ],

  /** Queries affected by time-off changes */
  timeOffRelated: () => [
    queryKeys.timeOff.my(),
    queryKeys.timeOff.my("pending"),
    queryKeys.timeOff.my("approved"),
    queryKeys.timeOff.pending(),
    queryKeys.timeOff.team(),
    ["calendar"], // Invalidate all calendar queries
  ],

  /** Queries affected by calendar changes (tasks, meetings) */
  calendarRelated: () => [["calendar"]],

  /** Queries affected by org chart draft changes */
  orgChartDrafts: () => [["orgChart", "drafts"]],

  /** Queries affected by publishing org chart changes */
  orgChartPublish: () => [
    ["orgChart"],
    queryKeys.employees.all(),
    queryKeys.allUsers.all(),
    queryKeys.squads.all(),
    queryKeys.users.current(),
  ],

  /** Queries affected by invitation changes */
  invitations: () => [["invitations"]],
} as const;
