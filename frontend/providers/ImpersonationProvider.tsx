"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { User } from "@/shared/types/user";

const IMPERSONATION_STORAGE_KEY = "impersonation_user_id";

interface ImpersonationContextType {
  impersonatedUser: User | null;
  isImpersonating: boolean;
  startImpersonation: (user: User) => void;
  endImpersonation: () => void;
  impersonatedUserId: number | null;
  setImpersonatedUser: (user: User | null) => void;
}

const ImpersonationContext = createContext<
  ImpersonationContextType | undefined
>(undefined);

export const ImpersonationProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [impersonatedUserId, setImpersonatedUserId] = useState<number | null>(
    null,
  );
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);

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
};

const defaultImpersonationContext: ImpersonationContextType = {
  impersonatedUser: null,
  isImpersonating: false,
  startImpersonation: () => {},
  endImpersonation: () => {},
  impersonatedUserId: null,
  setImpersonatedUser: () => {},
};

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    return defaultImpersonationContext;
  }
  return context;
};
