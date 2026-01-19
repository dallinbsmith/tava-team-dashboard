"use client";

import { createContext, useContext, ReactNode, useMemo, useCallback } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getEmployees, getAllUsers, getSquads, createSquad } from "@/lib/api";
import { User, Squad } from "@/shared/types";

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
  const queryClient = useQueryClient();
  const isAuthenticated = !!auth0User && !authLoading;

  // Employees query
  const {
    data: employees = [],
    isLoading: employeesLoading,
  } = useQuery({
    queryKey: ["employees"],
    queryFn: () => getEmployees(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // All users query
  const {
    data: allUsers = [],
    isLoading: allUsersLoading,
  } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => getAllUsers(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // Squads query
  const {
    data: squads = [],
    isLoading: squadsLoading,
  } = useQuery({
    queryKey: ["squads"],
    queryFn: () => getSquads(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // Add squad mutation
  const addSquadMutation = useMutation({
    mutationFn: (name: string) => createSquad(name),
    onSuccess: (newSquad) => {
      // Optimistically update the cache
      queryClient.setQueryData<Squad[]>(["squads"], (old) =>
        old ? [...old, newSquad] : [newSquad]
      );
    },
  });

  const addSquad = useCallback(async (name: string): Promise<Squad> => {
    return addSquadMutation.mutateAsync(name);
  }, [addSquadMutation]);

  const refetchEmployees = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["employees"] });
  }, [queryClient]);

  const refetchAllUsers = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["allUsers"] });
  }, [queryClient]);

  const refetchSquads = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["squads"] });
  }, [queryClient]);

  // Derive departments from users
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    [...employees, ...allUsers].forEach(user => {
      if (user.department) {
        deptSet.add(user.department);
      }
    });
    return Array.from(deptSet).sort();
  }, [employees, allUsers]);

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

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
