"use client";

import { createContext, useContext, ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCurrentUserQuery } from "@/hooks";
import { useImpersonation } from "./ImpersonationProvider";
import { getUserById } from "@/lib/api";
import { User } from "@/shared/types/user";

interface CurrentUserContextType {
  currentUser: User | null;
  realUser: User | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  isSupervisor: boolean;
  isSupervisorOrAdmin: boolean;
  effectiveIsSupervisorOrAdmin: boolean;
  isImpersonating: boolean;
  refetch: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { user: auth0User, isLoading: authLoading } = useUser();
  const isAuthenticated = !!auth0User && !authLoading;

  // Get impersonation state
  const { impersonatedUserId, impersonatedUser, setImpersonatedUser, isImpersonating, endImpersonation } = useImpersonation();

  // Use custom hook with centralized query key for the real user
  const {
    currentUser: realUser,
    isLoading,
    error,
    isAdmin,
    isSupervisor,
    refetch,
  } = useCurrentUserQuery();

  // Fetch impersonated user data if needed
  const {
    data: fetchedImpersonatedUser,
    isLoading: impersonatedUserLoading,
  } = useQuery({
    queryKey: ["impersonatedUser", impersonatedUserId],
    queryFn: () => getUserById(impersonatedUserId!),
    enabled: isAuthenticated && impersonatedUserId !== null && !impersonatedUser,
    staleTime: 5 * 60 * 1000,
  });

  // Update impersonated user in context when fetched
  useEffect(() => {
    if (fetchedImpersonatedUser && impersonatedUserId !== null) {
      setImpersonatedUser(fetchedImpersonatedUser);
    }
  }, [fetchedImpersonatedUser, impersonatedUserId, setImpersonatedUser]);

  // If not admin, don't allow impersonation
  useEffect(() => {
    if (realUser && realUser.role !== "admin" && isImpersonating) {
      endImpersonation();
    }
  }, [realUser, isImpersonating, endImpersonation]);

  const isSupervisorOrAdmin = isAdmin || isSupervisor;

  // Determine the effective current user
  const effectiveUser = isImpersonating && impersonatedUser ? impersonatedUser : realUser;

  // Compute effective user's supervisor/admin status (respects impersonation)
  const effectiveIsSupervisorOrAdmin = effectiveUser?.role === "admin" || effectiveUser?.role === "supervisor";

  const value: CurrentUserContextType = {
    currentUser: effectiveUser,
    realUser,
    loading: isLoading || (isImpersonating && impersonatedUserLoading),
    error,
    isAdmin,
    isSupervisor,
    isSupervisorOrAdmin,
    effectiveIsSupervisorOrAdmin,
    isImpersonating,
    refetch,
  };

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

// Default context for when hook is used outside provider (e.g., during HMR)
const defaultCurrentUserContext: CurrentUserContextType = {
  currentUser: null,
  realUser: null,
  loading: true,
  error: null,
  isAdmin: false,
  isSupervisor: false,
  isSupervisorOrAdmin: false,
  effectiveIsSupervisorOrAdmin: false,
  isImpersonating: false,
  refetch: async () => { },
};

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (context === undefined) {
    return defaultCurrentUserContext;
  }
  return context;
}
