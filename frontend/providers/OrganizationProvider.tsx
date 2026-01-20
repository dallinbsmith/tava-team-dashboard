"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import {
  useEmployeesQuery,
  useAllUsersQuery,
  useSquadsQuery,
  useDerivedDepartments,
} from "@/hooks";
import { User, Squad } from "@/shared/types/user";

interface OrganizationContextType {
  // Employees (direct reports for supervisors, all for admins)
  employees: User[];
  employeesLoading: boolean;
  refetchEmployees: () => Promise<void>;

  // All users (for dropdowns, assignments)
  allUsers: User[];
  allUsersLoading: boolean;
  refetchAllUsers: () => Promise<void>;

  // Squads
  squads: Squad[];
  squadsLoading: boolean;
  refetchSquads: () => Promise<void>;
  addSquad: (name: string) => Promise<Squad>;

  // Departments (derived from employees)
  departments: string[];

  // Combined loading state
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user: auth0User, isLoading: authLoading } = useUser();
  const isAuthenticated = !!auth0User && !authLoading;

  // Use custom hooks with centralized query keys
  const {
    employees,
    isLoading: employeesLoading,
    refetch: refetchEmployees,
  } = useEmployeesQuery({ enabled: isAuthenticated });

  const {
    allUsers,
    isLoading: allUsersLoading,
    refetch: refetchAllUsers,
  } = useAllUsersQuery({ enabled: isAuthenticated });

  const {
    squads,
    isLoading: squadsLoading,
    refetch: refetchSquads,
    addSquad,
  } = useSquadsQuery({ enabled: isAuthenticated });

  // Derive departments from users using custom hook
  const departments = useDerivedDepartments(employees, allUsers);

  const loading = authLoading || employeesLoading || allUsersLoading || squadsLoading;

  const value: OrganizationContextType = {
    employees,
    employeesLoading: authLoading || employeesLoading,
    refetchEmployees,
    allUsers,
    allUsersLoading: authLoading || allUsersLoading,
    refetchAllUsers,
    squads,
    squadsLoading: authLoading || squadsLoading,
    refetchSquads,
    addSquad,
    departments,
    loading,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

// Default context for when hook is used outside provider (e.g., during HMR)
const defaultOrganizationContext: OrganizationContextType = {
  employees: [],
  employeesLoading: true,
  refetchEmployees: async () => {},
  allUsers: [],
  allUsersLoading: true,
  refetchAllUsers: async () => {},
  squads: [],
  squadsLoading: true,
  refetchSquads: async () => {},
  addSquad: async () => ({ id: 0, name: "", members: [] }),
  departments: [],
  loading: true,
};

export function useOrganization() {
  const context = useContext(OrganizationContext);
  // Return default context during HMR or when used outside provider
  // This prevents crashes during hot reload
  if (context === undefined) {
    return defaultOrganizationContext;
  }
  return context;
}
