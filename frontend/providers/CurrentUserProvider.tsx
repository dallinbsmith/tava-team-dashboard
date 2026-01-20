"use client";

import { createContext, useContext, ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCurrentUserQuery } from "@/hooks";
import { useImpersonation } from "./ImpersonationProvider";
import { getUserById } from "@/lib/api";
import { User } from "@/shared/types/user";

interface CurrentUserContextType {
  /** The effective current user (impersonated user if impersonating, otherwise real user) */
  currentUser: User | null;
  /** The actual logged-in user (always the real user, even when impersonating) */
  realUser: User | null;
  loading: boolean;
  error: string | null;
  /** Whether the real user is an admin */
  isAdmin: boolean;
  /** Whether the real user is a supervisor */
  isSupervisor: boolean;
  /** Whether the real user is a supervisor or admin */
  isSupervisorOrAdmin: boolean;
  /** Whether currently impersonating another user */
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
      // Non-admins can't impersonate - end it
      endImpersonation();
    }
  }, [realUser, isImpersonating, endImpersonation]);

  const isSupervisorOrAdmin = isAdmin || isSupervisor;

  // Determine the effective current user
  const effectiveUser = isImpersonating && impersonatedUser ? impersonatedUser : realUser;

  const value: CurrentUserContextType = {
    currentUser: effectiveUser,
    realUser,
    loading: isLoading || (isImpersonating && impersonatedUserLoading),
    error,
    isAdmin,
    isSupervisor,
    isSupervisorOrAdmin,
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
  isImpersonating: false,
  refetch: async () => {},
};

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  // Return default context during HMR or when used outside provider
  // This prevents crashes during hot reload
  if (context === undefined) {
    return defaultCurrentUserContext;
  }
  return context;
}
