/**
 * Query Key Factory
 *
 * Centralized query key management for React Query.
 * This prevents key mismatches and makes cache invalidation predictable.
 *
 * Pattern: Each entity has a base key and can have nested keys for specific queries.
 * Example: queryKeys.users.all() -> ['users']
 *          queryKeys.users.detail(1) -> ['users', 1]
 */

export const queryKeys = {
  // User/Employee queries
  users: {
    all: () => ["users"] as const,
    detail: (id: number) => ["users", id] as const,
    current: () => ["currentUser"] as const,
  },

  employees: {
    all: () => ["employees"] as const,
    detail: (id: number) => ["employees", id] as const,
  },

  allUsers: {
    all: () => ["allUsers"] as const,
  },

  supervisors: {
    all: () => ["supervisors"] as const,
  },

  // Organization
  squads: {
    all: () => ["squads"] as const,
    detail: (id: number) => ["squads", id] as const,
  },

  departments: {
    all: () => ["departments"] as const,
  },

  // Invitations
  invitations: {
    all: () => ["invitations"] as const,
    detail: (id: number) => ["invitations", id] as const,
    validate: (token: string) => ["invitations", "validate", token] as const,
  },

  // Calendar
  calendar: {
    events: (start: Date, end: Date) =>
      ["calendar", "events", start.toISOString(), end.toISOString()] as const,
    eventsWithMetadata: (start: Date, end: Date) =>
      ["calendar", "eventsWithMetadata", start.toISOString(), end.toISOString()] as const,
  },

  tasks: {
    all: () => ["tasks"] as const,
    detail: (id: number) => ["tasks", id] as const,
  },

  meetings: {
    all: () => ["meetings"] as const,
    detail: (id: number) => ["meetings", id] as const,
  },

  // Time Off
  timeOff: {
    my: (status?: string) => ["timeOff", "my", status ?? "all"] as const,
    pending: () => ["timeOff", "pending"] as const,
    team: () => ["timeOff", "team"] as const,
    detail: (id: number) => ["timeOff", id] as const,
  },

  // Jira
  jira: {
    settings: () => ["jira", "settings"] as const,
    myTasks: (maxResults?: number) => ["jira", "tasks", "my", maxResults ?? 50] as const,
    userTasks: (userId: number, maxResults?: number) =>
      ["jira", "tasks", "user", userId, maxResults ?? 50] as const,
    teamTasks: (maxPerUser?: number) =>
      ["jira", "tasks", "team", maxPerUser ?? 20] as const,
    projects: () => ["jira", "projects"] as const,
    projectTasks: (projectKey: string, maxResults?: number) =>
      ["jira", "projects", projectKey, "tasks", maxResults ?? 50] as const,
    epics: (maxResults?: number) => ["jira", "epics", maxResults ?? 100] as const,
    users: () => ["jira", "users"] as const,
  },

  // Org Chart
  orgChart: {
    tree: () => ["orgChart", "tree"] as const,
    drafts: {
      all: () => ["orgChart", "drafts"] as const,
      detail: (id: number) => ["orgChart", "drafts", id] as const,
    },
  },
} as const;

// Type helper for extracting query key types
export type QueryKeys = typeof queryKeys;
