"use client";

import { createContext, useContext, ReactNode } from "react";
import { useCurrentUserQuery } from "@/hooks";
import { User } from "@/shared/types/user";

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
  // Use custom hook with centralized query key
  const {
    currentUser,
    isLoading,
    error,
    isAdmin,
    isSupervisor,
    refetch,
  } = useCurrentUserQuery();

  const isSupervisorOrAdmin = isAdmin || isSupervisor;

  const value: CurrentUserContextType = {
    currentUser,
    loading: isLoading,
    error,
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
