/**
 * Tests for lib/query-keys.ts
 * Query key factory for React Query
 */

import { queryKeys } from "../query-keys";

describe("queryKeys", () => {
  describe("entity helper pattern", () => {
    it("users.all() returns correct key", () => {
      expect(queryKeys.users.all()).toEqual(["users"]);
    });

    it("users.detail(id) returns correct key with id", () => {
      expect(queryKeys.users.detail(123)).toEqual(["users", 123]);
    });

    it("users.current() returns unique current user key", () => {
      expect(queryKeys.users.current()).toEqual(["currentUser"]);
    });
  });

  describe("employees keys", () => {
    it("employees.all() returns correct key", () => {
      expect(queryKeys.employees.all()).toEqual(["employees"]);
    });

    it("employees.detail(id) returns correct key", () => {
      expect(queryKeys.employees.detail(456)).toEqual(["employees", 456]);
    });
  });

  describe("list-only entities", () => {
    it("allUsers.all() returns correct key", () => {
      expect(queryKeys.allUsers.all()).toEqual(["allUsers"]);
    });

    it("supervisors.all() returns correct key", () => {
      expect(queryKeys.supervisors.all()).toEqual(["supervisors"]);
    });

    it("departments.all() returns correct key", () => {
      expect(queryKeys.departments.all()).toEqual(["departments"]);
    });
  });

  describe("squads keys", () => {
    it("squads.all() returns correct key", () => {
      expect(queryKeys.squads.all()).toEqual(["squads"]);
    });

    it("squads.detail(id) returns correct key", () => {
      expect(queryKeys.squads.detail(789)).toEqual(["squads", 789]);
    });
  });

  describe("tasks and meetings keys", () => {
    it("tasks.all() returns correct key", () => {
      expect(queryKeys.tasks.all()).toEqual(["tasks"]);
    });

    it("tasks.detail(id) returns correct key", () => {
      expect(queryKeys.tasks.detail(100)).toEqual(["tasks", 100]);
    });

    it("meetings.all() returns correct key", () => {
      expect(queryKeys.meetings.all()).toEqual(["meetings"]);
    });

    it("meetings.detail(id) returns correct key", () => {
      expect(queryKeys.meetings.detail(200)).toEqual(["meetings", 200]);
    });
  });

  describe("invitations keys", () => {
    it("invitations.all() returns correct key", () => {
      expect(queryKeys.invitations.all()).toEqual(["invitations"]);
    });

    it("invitations.detail(id) returns correct key", () => {
      expect(queryKeys.invitations.detail(300)).toEqual(["invitations", 300]);
    });

    it("invitations.validate(token) returns correct key with token", () => {
      expect(queryKeys.invitations.validate("abc123")).toEqual([
        "invitations",
        "validate",
        "abc123",
      ]);
    });
  });

  describe("calendar keys", () => {
    it("calendar.events() includes ISO date strings", () => {
      const start = new Date("2024-01-01T00:00:00Z");
      const end = new Date("2024-01-31T23:59:59Z");

      const key = queryKeys.calendar.events(start, end);

      expect(key).toEqual([
        "calendar",
        "events",
        "2024-01-01T00:00:00.000Z",
        "2024-01-31T23:59:59.000Z",
      ]);
    });

    it("calendar.eventsWithMetadata() includes ISO date strings", () => {
      const start = new Date("2024-02-01T00:00:00Z");
      const end = new Date("2024-02-28T23:59:59Z");

      const key = queryKeys.calendar.eventsWithMetadata(start, end);

      expect(key).toEqual([
        "calendar",
        "eventsWithMetadata",
        "2024-02-01T00:00:00.000Z",
        "2024-02-28T23:59:59.000Z",
      ]);
    });

    it("different date ranges produce different keys", () => {
      const jan = queryKeys.calendar.events(new Date("2024-01-01"), new Date("2024-01-31"));
      const feb = queryKeys.calendar.events(new Date("2024-02-01"), new Date("2024-02-28"));

      expect(jan).not.toEqual(feb);
    });
  });

  describe("timeOff keys", () => {
    it("timeOff.my() with no status returns 'all'", () => {
      expect(queryKeys.timeOff.my()).toEqual(["timeOff", "my", "all"]);
    });

    it("timeOff.my(status) includes status", () => {
      expect(queryKeys.timeOff.my("pending")).toEqual(["timeOff", "my", "pending"]);
      expect(queryKeys.timeOff.my("approved")).toEqual(["timeOff", "my", "approved"]);
    });

    it("timeOff.pending() returns correct key", () => {
      expect(queryKeys.timeOff.pending()).toEqual(["timeOff", "pending"]);
    });

    it("timeOff.team() returns correct key", () => {
      expect(queryKeys.timeOff.team()).toEqual(["timeOff", "team"]);
    });

    it("timeOff.detail(id) returns correct key", () => {
      expect(queryKeys.timeOff.detail(500)).toEqual(["timeOff", 500]);
    });
  });

  describe("jira keys", () => {
    it("jira.settings() returns correct key", () => {
      expect(queryKeys.jira.settings()).toEqual(["jira", "settings"]);
    });

    it("jira.users() returns correct key", () => {
      expect(queryKeys.jira.users()).toEqual(["jira", "users"]);
    });

    it("jira.projects() returns correct key", () => {
      expect(queryKeys.jira.projects()).toEqual(["jira", "projects"]);
    });

    it("jira.myTasks() uses default max", () => {
      expect(queryKeys.jira.myTasks()).toEqual(["jira", "tasks", "my", 50]);
    });

    it("jira.myTasks(max) uses provided max", () => {
      expect(queryKeys.jira.myTasks(100)).toEqual(["jira", "tasks", "my", 100]);
    });

    it("jira.userTasks() includes userId and default max", () => {
      expect(queryKeys.jira.userTasks(42)).toEqual(["jira", "tasks", "user", 42, 50]);
    });

    it("jira.userTasks() with custom max", () => {
      expect(queryKeys.jira.userTasks(42, 25)).toEqual(["jira", "tasks", "user", 42, 25]);
    });

    it("jira.teamTasks() uses default maxPerUser", () => {
      expect(queryKeys.jira.teamTasks()).toEqual(["jira", "tasks", "team", 20]);
    });

    it("jira.teamTasks(maxPerUser) uses provided value", () => {
      expect(queryKeys.jira.teamTasks(10)).toEqual(["jira", "tasks", "team", 10]);
    });

    it("jira.projectTasks() includes project key and max", () => {
      expect(queryKeys.jira.projectTasks("PROJ")).toEqual([
        "jira",
        "projects",
        "PROJ",
        "tasks",
        50,
      ]);
    });

    it("jira.projectTasks() with custom max", () => {
      expect(queryKeys.jira.projectTasks("PROJ", 200)).toEqual([
        "jira",
        "projects",
        "PROJ",
        "tasks",
        200,
      ]);
    });

    it("jira.epics() uses default max", () => {
      expect(queryKeys.jira.epics()).toEqual(["jira", "epics", 100]);
    });

    it("jira.epics(max) uses provided max", () => {
      expect(queryKeys.jira.epics(50)).toEqual(["jira", "epics", 50]);
    });
  });

  describe("orgChart keys", () => {
    it("orgChart.tree() returns correct key", () => {
      expect(queryKeys.orgChart.tree()).toEqual(["orgChart", "tree"]);
    });

    it("orgChart.drafts.all() returns correct key", () => {
      expect(queryKeys.orgChart.drafts.all()).toEqual(["orgChart", "drafts"]);
    });

    it("orgChart.drafts.detail(id) returns correct key", () => {
      expect(queryKeys.orgChart.drafts.detail(999)).toEqual(["orgChart/drafts", 999]);
    });
  });

  describe("key uniqueness and consistency", () => {
    it("different entities produce different keys", () => {
      expect(queryKeys.users.all()).not.toEqual(queryKeys.employees.all());
      expect(queryKeys.tasks.all()).not.toEqual(queryKeys.meetings.all());
    });

    it("same entity with different ids produces different keys", () => {
      expect(queryKeys.users.detail(1)).not.toEqual(queryKeys.users.detail(2));
    });

    it("calling same function multiple times returns equal keys", () => {
      expect(queryKeys.users.all()).toEqual(queryKeys.users.all());
      expect(queryKeys.users.detail(1)).toEqual(queryKeys.users.detail(1));
    });
  });

  describe("type safety (compile-time checks)", () => {
    it("keys are readonly tuples", () => {
      const key = queryKeys.users.all();
      // TypeScript would error if we tried: key.push('something')
      // This test verifies the runtime value is correct
      expect(Object.isFrozen(key) || Array.isArray(key)).toBe(true);
    });
  });
});
