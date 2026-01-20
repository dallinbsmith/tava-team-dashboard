"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User } from "@/shared/types/user";

const IMPERSONATION_STORAGE_KEY = "impersonation_user_id";

interface ImpersonationContextType {
  /** The user being impersonated (null if not impersonating) */
  impersonatedUser: User | null;
  /** Whether impersonation is currently active */
  isImpersonating: boolean;
  /** Start impersonating a user */
  startImpersonation: (user: User) => void;
  /** End the current impersonation */
  endImpersonation: () => void;
  /** The ID of the user being impersonated (persisted in sessionStorage) */
  impersonatedUserId: number | null;
  /** Set the impersonated user data (called by CurrentUserProvider) */
  setImpersonatedUser: (user: User | null) => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedUserId, setImpersonatedUserId] = useState<number | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);

  // Load impersonation state from sessionStorage on mount
  useEffect(() => {
    const storedId = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (storedId) {
      const id = parseInt(storedId, 10);
      if (!isNaN(id)) {
        setImpersonatedUserId(id);
      }
    }
  }, []);

  const startImpersonation = useCallback((user: User) => {
    setImpersonatedUserId(user.id);
    setImpersonatedUser(user);
    sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, user.id.toString());
  }, []);

  const endImpersonation = useCallback(() => {
    setImpersonatedUserId(null);
    setImpersonatedUser(null);
    sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
  }, []);

  const value: ImpersonationContextType = {
    impersonatedUser,
    isImpersonating: impersonatedUserId !== null,
    startImpersonation,
    endImpersonation,
    impersonatedUserId,
    setImpersonatedUser,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

// Default context for when hook is used outside provider (e.g., during HMR)
const defaultImpersonationContext: ImpersonationContextType = {
  impersonatedUser: null,
  isImpersonating: false,
  startImpersonation: () => {},
  endImpersonation: () => {},
  impersonatedUserId: null,
  setImpersonatedUser: () => {},
};

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  // Return default context during HMR or when used outside provider
  // This prevents crashes during hot reload
  if (context === undefined) {
    return defaultImpersonationContext;
  }
  return context;
}
