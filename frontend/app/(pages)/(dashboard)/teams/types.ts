import { User, Squad } from "@/shared/types/user";
import { TimeOffRequest } from "@/app/(pages)/(dashboard)/time-off/types";
import { TeamTask } from "@/app/(pages)/jira/types";

export type SelectionType = "squad" | "department";

export interface TeamSelection {
  type: SelectionType;
  id: string | null;
}

export type TaskCategory = "upcoming" | "completed" | "overdue" | "approaching";

export interface CategorizedTasks {
  upcoming: TeamTask[];
  completed: TeamTask[];
  overdue: TeamTask[];
  approaching: TeamTask[];
}

export interface TeamMember extends User {
  isOnLeave?: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  type: SelectionType;
}

export interface GroupedSelectOptions {
  squads: SelectOption[];
  departments: SelectOption[];
}

export function getGroupedOptions(squads: Squad[], departments: string[]): GroupedSelectOptions {
  return {
    squads: squads.map((squad) => ({
      value: squad.id.toString(),
      label: squad.name,
      type: "squad" as SelectionType,
    })),
    departments: departments.map((dept) => ({
      value: dept,
      label: dept,
      type: "department" as SelectionType,
    })),
  };
}

export function categorizeTask(task: TeamTask): TaskCategory {
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const statusLower = task.status.toLowerCase();
  if (statusLower.includes("done") || statusLower.includes("complete")) {
    return "completed";
  }

  if (!dueDate) {
    return "upcoming";
  }

  const dueDateNormalized = new Date(dueDate);
  dueDateNormalized.setHours(0, 0, 0, 0);
  const diffTime = dueDateNormalized.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "overdue";
  }
  if (diffDays <= 7) {
    return "approaching";
  }
  return "upcoming";
}

export function categorizeTasks(tasks: TeamTask[]): CategorizedTasks {
  const result: CategorizedTasks = {
    upcoming: [],
    completed: [],
    overdue: [],
    approaching: [],
  };

  tasks.forEach((task) => {
    const category = categorizeTask(task);
    result[category].push(task);
  });

  return result;
}

export function filterTimeOffByTeam(
  timeOffRequests: TimeOffRequest[] | null | undefined,
  allUsers: User[],
  type: SelectionType,
  id: string | null
): TimeOffRequest[] {
  if (!id || !timeOffRequests) return [];

  const memberIds = new Set<number>();

  if (type === "squad") {
    const squadId = parseInt(id, 10);
    allUsers.forEach((user) => {
      if (user.squads?.some((squad) => squad.id === squadId)) {
        memberIds.add(user.id);
      }
    });
  } else {
    allUsers.forEach((user) => {
      if (user.department === id) {
        memberIds.add(user.id);
      }
    });
  }

  return timeOffRequests.filter((request) => memberIds.has(request.user_id));
}

export function filterTasksByTeam(
  tasks: TeamTask[] | null | undefined,
  allUsers: User[],
  type: SelectionType,
  id: string | null
): TeamTask[] {
  if (!id || !tasks) return [];

  const memberIds = new Set<number>();

  if (type === "squad") {
    const squadId = parseInt(id, 10);
    allUsers.forEach((user) => {
      if (user.squads?.some((squad) => squad.id === squadId)) {
        memberIds.add(user.id);
      }
    });
  } else {
    allUsers.forEach((user) => {
      if (user.department === id) {
        memberIds.add(user.id);
      }
    });
  }

  return tasks.filter((task) => task.employee && memberIds.has(task.employee.id));
}

export function filterMembersByTeam(
  allUsers: User[],
  type: SelectionType,
  id: string | null
): User[] {
  if (!id) return [];

  if (type === "squad") {
    const squadId = parseInt(id, 10);
    return allUsers.filter((user) =>
      user.squads?.some((squad) => squad.id === squadId)
    );
  } else {
    return allUsers.filter((user) => user.department === id);
  }
}
