"use client";

import { createContext, useContext, ReactNode } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api";
import { User } from "@/shared/types";

interface CurrentUserContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  isSupervisor: boolean;
  isSupervisorOrAdmin: boolean;
  refetch: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { user: auth0User, isLoading: authLoading } = useUser();
  const queryClient = useQueryClient();

  const {
    data: currentUser,
    isLoading: queryLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
    enabled: !!auth0User && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isAdmin = currentUser?.role === "admin";
  const isSupervisor = currentUser?.role === "supervisor";
  const isSupervisorOrAdmin = isAdmin || isSupervisor;

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
  };

  const value: CurrentUserContextType = {
    currentUser: currentUser ?? null,
    loading: authLoading || queryLoading,
    error: queryError ? (queryError instanceof Error ? queryError.message : "Failed to fetch user") : null,
    isAdmin,
    isSupervisor,
    isSupervisorOrAdmin,
    refetch,
  };

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (context === undefined) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return context;
}
