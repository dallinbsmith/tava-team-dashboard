"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { TOKEN } from "@/lib/constants";

interface TokenState {
  accessToken: string | null;
  expiresAt: number | null;
}

interface TokenContextType {
  getAccessToken: () => Promise<string | null>;
  clearTokens: () => void;
  isAuthenticated: boolean;
}

const TokenContext = createContext<TokenContextType | null>(null);

// Token is stored in memory only - not in localStorage or sessionStorage
// This protects against XSS attacks since JavaScript from malicious scripts
// cannot access the token from storage
let inMemoryToken: TokenState = {
  accessToken: null,
  expiresAt: null,
};

export const TokenProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);
  const csrfTokenRef = useRef<string | null>(null);
  const csrfFetchPromiseRef = useRef<Promise<string | null> | null>(null);

  // Fetch CSRF token - ensures only one fetch happens at a time
  const fetchCsrfToken = useCallback(async (): Promise<string | null> => {
    // If already fetching, wait for that result
    if (csrfFetchPromiseRef.current) {
      return csrfFetchPromiseRef.current;
    }

    csrfFetchPromiseRef.current = (async () => {
      try {
        const response = await fetch("/api/auth/csrf", {
          credentials: "same-origin",
        });
        if (response.ok) {
          const data = await response.json();
          csrfTokenRef.current = data.csrfToken;
          return data.csrfToken;
        }
        return null;
      } catch {
        return null;
      } finally {
        csrfFetchPromiseRef.current = null;
      }
    })();

    return csrfFetchPromiseRef.current;
  }, []);

  // Fetch CSRF token on mount
  useEffect(() => {
    fetchCsrfToken();
  }, [fetchCsrfToken]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      // Ensure we have a CSRF token before making the request
      if (!csrfTokenRef.current) {
        await fetchCsrfToken();
      }

      // Include CSRF token in the request header
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (csrfTokenRef.current) {
        headers["X-CSRF-Token"] = csrfTokenRef.current;
      }

      const response = await fetch("/api/auth/token", {
        method: "GET",
        credentials: "same-origin", // Include HTTP-only cookies
        headers,
      });

      // If CSRF validation failed, refresh CSRF token and retry once
      if (response.status === 403) {
        await fetchCsrfToken();
        const retryHeaders: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (csrfTokenRef.current) {
          retryHeaders["X-CSRF-Token"] = csrfTokenRef.current;
        }
        const retryResponse = await fetch("/api/auth/token", {
          method: "GET",
          credentials: "same-origin",
          headers: retryHeaders,
        });
        if (!retryResponse.ok) {
          inMemoryToken = { accessToken: null, expiresAt: null };
          setIsAuthenticated(false);
          return null;
        }
        const retryData = await retryResponse.json();
        if (retryData.accessToken) {
          const expiresIn = retryData.expiresIn || 3600;
          inMemoryToken = {
            accessToken: retryData.accessToken,
            expiresAt: Date.now() + expiresIn * 1000,
          };
          setIsAuthenticated(true);
          return retryData.accessToken;
        }
        return null;
      }

      if (!response.ok) {
        inMemoryToken = { accessToken: null, expiresAt: null };
        setIsAuthenticated(false);
        return null;
      }

      const data = await response.json();

      if (data.accessToken) {
        // Store token in memory with expiration
        // Auth0 access tokens typically expire in 24 hours, but we'll use
        // the provided expiry or default to 1 hour for security
        const expiresIn = data.expiresIn || 3600; // Default 1 hour
        inMemoryToken = {
          accessToken: data.accessToken,
          expiresAt: Date.now() + expiresIn * 1000,
        };
        setIsAuthenticated(true);
        return data.accessToken;
      }

      setIsAuthenticated(false);
      return null;
    } catch {
      inMemoryToken = { accessToken: null, expiresAt: null };
      setIsAuthenticated(false);
      return null;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, [fetchCsrfToken]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // Check if we have a valid token in memory
    if (
      inMemoryToken.accessToken &&
      inMemoryToken.expiresAt &&
      Date.now() < inMemoryToken.expiresAt - TOKEN.EXPIRY_BUFFER_MS
    ) {
      return inMemoryToken.accessToken;
    }

    // If a refresh is already in progress, wait for it
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    // Start a new refresh
    refreshPromiseRef.current = refreshAccessToken();
    return refreshPromiseRef.current;
  }, [refreshAccessToken]);

  const clearTokens = useCallback(() => {
    inMemoryToken = { accessToken: null, expiresAt: null };
    setIsAuthenticated(false);
  }, []);

  return (
    <TokenContext.Provider
      value={{
        getAccessToken,
        clearTokens,
        isAuthenticated,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};

export const useTokenManager = (): TokenContextType => {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error("useTokenManager must be used within a TokenProvider");
  }
  return context;
};

// Hook for making authenticated API calls
export const useAuthenticatedFetch = () => {
  const { getAccessToken } = useTokenManager();

  return useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const token = await getAccessToken();

      if (!token) {
        throw new Error("Not authenticated");
      }

      const headers = new Headers(options.headers);
      headers.set("Authorization", `Bearer ${token}`);

      return fetch(url, {
        ...options,
        headers,
        credentials: "same-origin",
      });
    },
    [getAccessToken],
  );
};
