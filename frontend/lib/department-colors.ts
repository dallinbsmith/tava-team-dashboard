// Department color configuration for consistent styling across the app
// Each department has a bg class for backgrounds and a text class for text/border colors

export interface DepartmentColors {
  bg: string;
  text: string;
  border: string;
}

export const DEPARTMENT_COLORS: Record<string, DepartmentColors> = {
  Engineering: {
    bg: "bg-blue-500",
    text: "text-blue-500",
    border: "border-blue-500",
  },
  Product: {
    bg: "bg-purple-500",
    text: "text-purple-500",
    border: "border-purple-500",
  },
  Design: {
    bg: "bg-pink-500",
    text: "text-pink-500",
    border: "border-pink-500",
  },
  Marketing: {
    bg: "bg-yellow-500",
    text: "text-yellow-500",
    border: "border-yellow-500",
  },
  Sales: {
    bg: "bg-green-500",
    text: "text-green-500",
    border: "border-green-500",
  },
  "Human Resources": {
    bg: "bg-orange-500",
    text: "text-orange-500",
    border: "border-orange-500",
  },
  Finance: {
    bg: "bg-teal-500",
    text: "text-teal-500",
    border: "border-teal-500",
  },
  Operations: {
    bg: "bg-indigo-500",
    text: "text-indigo-500",
    border: "border-indigo-500",
  },
  "Customer Support": {
    bg: "bg-red-500",
    text: "text-red-500",
    border: "border-red-500",
  },
  Legal: {
    bg: "bg-gray-500",
    text: "text-gray-500",
    border: "border-gray-500",
  },
  Research: {
    bg: "bg-cyan-500",
    text: "text-cyan-500",
    border: "border-cyan-500",
  },
  IT: {
    bg: "bg-violet-500",
    text: "text-violet-500",
    border: "border-violet-500",
  },
};

const DEFAULT_COLORS: DepartmentColors = {
  bg: "bg-gray-400",
  text: "text-gray-400",
  border: "border-gray-400",
};

export function getDepartmentColors(department: string): DepartmentColors {
  return DEPARTMENT_COLORS[department] || DEFAULT_COLORS;
}

export function getDepartmentBgColor(department: string): string {
  return getDepartmentColors(department).bg;
}

export function getDepartmentTextColor(department: string): string {
  return getDepartmentColors(department).text;
}

export function getDepartmentBorderColor(department: string): string {
  return getDepartmentColors(department).border;
}
