"use client";

import { createContext, useContext, ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCurrentUserQuery } from "@/hooks";
import { useImpersonation } from "./ImpersonationProvider";
import { getUserById } from "@/lib/api";
import { User } from "@/shared/types/user";
import { STALE_TIMES, asyncNoop } from "@/lib/constants";

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

export const CurrentUserProvider = ({ children }: { children: ReactNode }) => {
  const { user: auth0User, isLoading: authLoading } = useUser();
  const isAuthenticated = !!auth0User && !authLoading;

  const {
    impersonatedUserId,
    impersonatedUser,
    setImpersonatedUser,
    isImpersonating,
    endImpersonation,
  } = useImpersonation();

  const {
    currentUser: realUser,
    isLoading,
    error,
    isAdmin,
    isSupervisor,
    refetch,
  } = useCurrentUserQuery();

  const { data: fetchedImpersonatedUser, isLoading: impersonatedUserLoading } = useQuery({
    queryKey: ["impersonatedUser", impersonatedUserId],
    queryFn: () => getUserById(impersonatedUserId!),
    enabled: isAuthenticated && impersonatedUserId !== null && !impersonatedUser,
    staleTime: STALE_TIMES.STANDARD,
  });

  useEffect(() => {
    if (fetchedImpersonatedUser && impersonatedUserId !== null) {
      setImpersonatedUser(fetchedImpersonatedUser);
    }
  }, [fetchedImpersonatedUser, impersonatedUserId, setImpersonatedUser]);

  useEffect(() => {
    if (realUser && realUser.role !== "admin" && isImpersonating) {
      endImpersonation();
    }
  }, [realUser, isImpersonating, endImpersonation]);

  const isSupervisorOrAdmin = isAdmin || isSupervisor;
  const effectiveUser = isImpersonating && impersonatedUser ? impersonatedUser : realUser;
  const effectiveIsSupervisorOrAdmin =
    effectiveUser?.role === "admin" || effectiveUser?.role === "supervisor";

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

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
};

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
  refetch: asyncNoop,
};

export const useCurrentUser = () => {
  const context = useContext(CurrentUserContext);
  if (context === undefined) {
    return defaultCurrentUserContext;
  }
  return context;
};
