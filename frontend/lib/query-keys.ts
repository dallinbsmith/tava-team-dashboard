/**
 * Query Key Factory for React Query
 * Pattern: queryKeys.users.all() -> ['users'], queryKeys.users.detail(1) -> ['users', 1]
 */

// Helpers to reduce boilerplate
const entity = <T extends string>(name: T) => ({
  all: () => [name] as const,
  detail: (id: number) => [name, id] as const,
});

const listOnly = <T extends string>(name: T) => ({
  all: () => [name] as const,
});

export const queryKeys = {
  users: { ...entity("users"), current: () => ["currentUser"] as const },
  employees: entity("employees"),
  allUsers: listOnly("allUsers"),
  supervisors: listOnly("supervisors"),
  squads: entity("squads"),
  departments: listOnly("departments"),
  tasks: entity("tasks"),
  meetings: entity("meetings"),

  invitations: {
    ...entity("invitations"),
    validate: (token: string) => ["invitations", "validate", token] as const,
  },

  calendar: {
    events: (start: Date, end: Date) =>
      ["calendar", "events", start.toISOString(), end.toISOString()] as const,
    eventsWithMetadata: (start: Date, end: Date) =>
      ["calendar", "eventsWithMetadata", start.toISOString(), end.toISOString()] as const,
  },

  timeOff: {
    my: (status?: string) => ["timeOff", "my", status ?? "all"] as const,
    pending: () => ["timeOff", "pending"] as const,
    team: () => ["timeOff", "team"] as const,
    detail: (id: number) => ["timeOff", id] as const,
  },

  jira: {
    settings: () => ["jira", "settings"] as const,
    users: () => ["jira", "users"] as const,
    projects: () => ["jira", "projects"] as const,
    myTasks: (max = 50) => ["jira", "tasks", "my", max] as const,
    userTasks: (userId: number, max = 50) => ["jira", "tasks", "user", userId, max] as const,
    teamTasks: (maxPerUser = 20) => ["jira", "tasks", "team", maxPerUser] as const,
    projectTasks: (projectKey: string, max = 50) =>
      ["jira", "projects", projectKey, "tasks", max] as const,
    epics: (max = 100) => ["jira", "epics", max] as const,
  },

  orgChart: {
    tree: () => ["orgChart", "tree"] as const,
    drafts: { ...entity("orgChart/drafts"), all: () => ["orgChart", "drafts"] as const },
  },
} as const;

export type QueryKeys = typeof queryKeys;
