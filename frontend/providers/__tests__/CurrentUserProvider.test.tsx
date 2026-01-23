/**
 * Tests for providers/CurrentUserProvider.tsx
 * Current user context and impersonation integration
 */

import React from "react";
import { render, screen, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { CurrentUserProvider, useCurrentUser } from "../CurrentUserProvider";
import {
  ImpersonationProvider,
  useImpersonation,
} from "../ImpersonationProvider";
import { useCurrentUserQuery } from "@/hooks";
import { User } from "@/shared/types/user";

// Mock Auth0
jest.mock("@auth0/nextjs-auth0/client");
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

// Mock useCurrentUserQuery hook
jest.mock("@/hooks", () => ({
  useCurrentUserQuery: jest.fn(),
}));
const mockUseCurrentUserQuery = useCurrentUserQuery as jest.MockedFunction<
  typeof useCurrentUserQuery
>;

// Mock API
jest.mock("@/lib/api", () => ({
  getUserById: jest.fn(),
}));

// Test fixtures
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 1,
  auth0_id: "auth0|123",
  email: "admin@example.com",
  first_name: "Admin",
  last_name: "User",
  role: "admin",
  title: "Administrator",
  department: "Engineering",
  squads: [],
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const adminUser = createMockUser({ role: "admin" });
const supervisorUser = createMockUser({
  id: 2,
  role: "supervisor",
  first_name: "Supervisor",
});
const employeeUser = createMockUser({
  id: 3,
  role: "employee",
  first_name: "Employee",
});

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

// Test component that consumes the context
function TestConsumer() {
  const {
    currentUser,
    realUser,
    loading,
    error,
    isAdmin,
    isSupervisor,
    isSupervisorOrAdmin,
    effectiveIsSupervisorOrAdmin,
    isImpersonating,
  } = useCurrentUser();

  return (
    <div>
      <div data-testid="current-user">{currentUser?.first_name || "null"}</div>
      <div data-testid="real-user">{realUser?.first_name || "null"}</div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="error">{error || "null"}</div>
      <div data-testid="is-admin">{String(isAdmin)}</div>
      <div data-testid="is-supervisor">{String(isSupervisor)}</div>
      <div data-testid="is-supervisor-or-admin">
        {String(isSupervisorOrAdmin)}
      </div>
      <div data-testid="effective-is-supervisor-or-admin">
        {String(effectiveIsSupervisorOrAdmin)}
      </div>
      <div data-testid="is-impersonating">{String(isImpersonating)}</div>
    </div>
  );
}

// Wrapper with all providers
function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ImpersonationProvider>
          <CurrentUserProvider>{children}</CurrentUserProvider>
        </ImpersonationProvider>
      </QueryClientProvider>
    );
  };
}

describe("CurrentUserProvider", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    sessionStorage.clear();

    // Default: authenticated user
    mockUseUser.mockReturnValue({
      user: { sub: "auth0|123", email: "admin@example.com" },
      isLoading: false,
      error: undefined,
      checkSession: jest.fn(),
    });

    // Default: return admin user from hook
    mockUseCurrentUserQuery.mockReturnValue({
      currentUser: adminUser,
      isLoading: false,
      isAuthLoading: false,
      error: null,
      isAdmin: true,
      isSupervisor: false,
      isSupervisorOrAdmin: true,
      refetch: jest.fn(),
      invalidate: jest.fn(),
    });
  });

  afterEach(() => {
    queryClient.clear();
    sessionStorage.clear();
  });

  describe("basic rendering", () => {
    it("provides current user data", () => {
      render(<TestConsumer />, { wrapper: createWrapper(queryClient) });

      expect(screen.getByTestId("current-user")).toHaveTextContent("Admin");
      expect(screen.getByTestId("real-user")).toHaveTextContent("Admin");
    });

    it("provides loading state", () => {
      mockUseCurrentUserQuery.mockReturnValue({
        currentUser: null,
        isLoading: true,
        isAuthLoading: true,
        error: null,
        isAdmin: false,
        isSupervisor: false,
        isSupervisorOrAdmin: false,
        refetch: jest.fn(),
        invalidate: jest.fn(),
      });

      render(<TestConsumer />, { wrapper: createWrapper(queryClient) });

      expect(screen.getByTestId("loading")).toHaveTextContent("true");
    });

    it("provides error state", () => {
      mockUseCurrentUserQuery.mockReturnValue({
        currentUser: null,
        isLoading: false,
        isAuthLoading: false,
        error: "Failed to load user",
        isAdmin: false,
        isSupervisor: false,
        isSupervisorOrAdmin: false,
        refetch: jest.fn(),
        invalidate: jest.fn(),
      });

      render(<TestConsumer />, { wrapper: createWrapper(queryClient) });

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Failed to load user",
      );
    });
  });

  describe("role detection", () => {
    it("correctly identifies admin user", () => {
      mockUseCurrentUserQuery.mockReturnValue({
        currentUser: adminUser,
        isLoading: false,
        isAuthLoading: false,
        error: null,
        isAdmin: true,
        isSupervisor: false,
        isSupervisorOrAdmin: true,
        refetch: jest.fn(),
        invalidate: jest.fn(),
      });

      render(<TestConsumer />, { wrapper: createWrapper(queryClient) });

      expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
      expect(screen.getByTestId("is-supervisor")).toHaveTextContent("false");
      expect(screen.getByTestId("is-supervisor-or-admin")).toHaveTextContent(
        "true",
      );
    });

    it("correctly identifies supervisor user", () => {
      mockUseCurrentUserQuery.mockReturnValue({
        currentUser: supervisorUser,
        isLoading: false,
        isAuthLoading: false,
        error: null,
        isAdmin: false,
        isSupervisor: true,
        isSupervisorOrAdmin: true,
        refetch: jest.fn(),
        invalidate: jest.fn(),
      });

      render(<TestConsumer />, { wrapper: createWrapper(queryClient) });

      expect(screen.getByTestId("is-admin")).toHaveTextContent("false");
      expect(screen.getByTestId("is-supervisor")).toHaveTextContent("true");
      expect(screen.getByTestId("is-supervisor-or-admin")).toHaveTextContent(
        "true",
      );
    });

    it("correctly identifies employee user", () => {
      mockUseCurrentUserQuery.mockReturnValue({
        currentUser: employeeUser,
        isLoading: false,
        isAuthLoading: false,
        error: null,
        isAdmin: false,
        isSupervisor: false,
        isSupervisorOrAdmin: false,
        refetch: jest.fn(),
        invalidate: jest.fn(),
      });

      render(<TestConsumer />, { wrapper: createWrapper(queryClient) });

      expect(screen.getByTestId("is-admin")).toHaveTextContent("false");
      expect(screen.getByTestId("is-supervisor")).toHaveTextContent("false");
      expect(screen.getByTestId("is-supervisor-or-admin")).toHaveTextContent(
        "false",
      );
    });
  });

  describe("unauthenticated state", () => {
    it("returns null user when not authenticated", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });

      mockUseCurrentUserQuery.mockReturnValue({
        currentUser: null,
        isLoading: false,
        isAuthLoading: false,
        error: null,
        isAdmin: false,
        isSupervisor: false,
        isSupervisorOrAdmin: false,
        refetch: jest.fn(),
        invalidate: jest.fn(),
      });

      render(<TestConsumer />, { wrapper: createWrapper(queryClient) });

      expect(screen.getByTestId("current-user")).toHaveTextContent("null");
      expect(screen.getByTestId("real-user")).toHaveTextContent("null");
    });
  });

  describe("impersonation", () => {
    it("shows not impersonating by default", () => {
      render(<TestConsumer />, { wrapper: createWrapper(queryClient) });

      expect(screen.getByTestId("is-impersonating")).toHaveTextContent("false");
    });
  });

  describe("effective permissions", () => {
    it("effectiveIsSupervisorOrAdmin reflects actual user when not impersonating", () => {
      mockUseCurrentUserQuery.mockReturnValue({
        currentUser: adminUser,
        isLoading: false,
        isAuthLoading: false,
        error: null,
        isAdmin: true,
        isSupervisor: false,
        isSupervisorOrAdmin: true,
        refetch: jest.fn(),
        invalidate: jest.fn(),
      });

      render(<TestConsumer />, { wrapper: createWrapper(queryClient) });

      expect(
        screen.getByTestId("effective-is-supervisor-or-admin"),
      ).toHaveTextContent("true");
    });

    it("effectiveIsSupervisorOrAdmin is false for employee", () => {
      mockUseCurrentUserQuery.mockReturnValue({
        currentUser: employeeUser,
        isLoading: false,
        isAuthLoading: false,
        error: null,
        isAdmin: false,
        isSupervisor: false,
        isSupervisorOrAdmin: false,
        refetch: jest.fn(),
        invalidate: jest.fn(),
      });

      render(<TestConsumer />, { wrapper: createWrapper(queryClient) });

      expect(
        screen.getByTestId("effective-is-supervisor-or-admin"),
      ).toHaveTextContent("false");
    });
  });
});

describe("useCurrentUser hook", () => {
  it("returns default values when used outside provider", () => {
    // No wrapper means no provider
    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.currentUser).toBeNull();
    expect(result.current.realUser).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSupervisor).toBe(false);
    expect(result.current.isSupervisorOrAdmin).toBe(false);
    expect(result.current.effectiveIsSupervisorOrAdmin).toBe(false);
    expect(result.current.isImpersonating).toBe(false);
  });

  it("refetch function is callable when outside provider", async () => {
    const { result } = renderHook(() => useCurrentUser());

    // Should not throw
    await expect(result.current.refetch()).resolves.toBeUndefined();
  });
});

describe("ImpersonationProvider", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("provides default non-impersonating state", () => {
    const { result } = renderHook(() => useImpersonation(), {
      wrapper: ({ children }) => (
        <ImpersonationProvider>{children}</ImpersonationProvider>
      ),
    });

    expect(result.current.isImpersonating).toBe(false);
    expect(result.current.impersonatedUser).toBeNull();
    expect(result.current.impersonatedUserId).toBeNull();
  });

  it("returns default values when used outside provider", () => {
    const { result } = renderHook(() => useImpersonation());

    expect(result.current.isImpersonating).toBe(false);
    expect(result.current.impersonatedUser).toBeNull();
    expect(result.current.impersonatedUserId).toBeNull();
  });
});
