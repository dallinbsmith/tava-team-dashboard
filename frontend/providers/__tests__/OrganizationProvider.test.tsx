/**
 * Tests for providers/OrganizationProvider.tsx
 * Organization data provider with employees, squads, departments
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUser } from "@auth0/nextjs-auth0/client";
import { OrganizationProvider, useOrganization } from "../OrganizationProvider";
import * as hooks from "@/hooks";
import * as queryUtils from "@/lib/query-utils";

// Mock Auth0
jest.mock("@auth0/nextjs-auth0/client");
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

// Mock hooks
jest.mock("@/hooks", () => ({
  useEmployeesQuery: jest.fn(),
  useAllUsersQuery: jest.fn(),
  useSquadsQuery: jest.fn(),
  useDepartmentsQuery: jest.fn(),
}));

// Mock queryUtils
jest.mock("@/lib/query-utils", () => ({
  refetchQueries: jest.fn().mockResolvedValue(undefined),
  queryKeyGroups: {
    organization: jest
      .fn()
      .mockReturnValue([["employees"], ["allUsers"], ["squads"], ["departments"]]),
  },
}));

const mockUseEmployeesQuery = hooks.useEmployeesQuery as jest.MockedFunction<
  typeof hooks.useEmployeesQuery
>;
const mockUseAllUsersQuery = hooks.useAllUsersQuery as jest.MockedFunction<
  typeof hooks.useAllUsersQuery
>;
const mockUseSquadsQuery = hooks.useSquadsQuery as jest.MockedFunction<typeof hooks.useSquadsQuery>;
const mockUseDepartmentsQuery = hooks.useDepartmentsQuery as jest.MockedFunction<
  typeof hooks.useDepartmentsQuery
>;
const mockRefetchQueries = queryUtils.refetchQueries as jest.MockedFunction<
  typeof queryUtils.refetchQueries
>;

// Test fixtures
const mockEmployees = [
  { id: 1, first_name: "John", last_name: "Doe", email: "john@example.com", role: "employee" },
  { id: 2, first_name: "Jane", last_name: "Smith", email: "jane@example.com", role: "supervisor" },
];

const mockAllUsers = [
  ...mockEmployees,
  { id: 3, first_name: "Admin", last_name: "User", email: "admin@example.com", role: "admin" },
];

const mockSquads = [
  { id: 1, name: "Frontend" },
  { id: 2, name: "Backend" },
];

const mockDepartments = ["Engineering", "Design"];

// Create test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

// Test consumer component
function TestConsumer({
  onRender,
}: {
  onRender?: (ctx: ReturnType<typeof useOrganization>) => void;
}) {
  const context = useOrganization();
  onRender?.(context);
  return (
    <div>
      <span data-testid="employees-count">{context.employees.length}</span>
      <span data-testid="employees-loading">{String(context.employeesLoading)}</span>
      <span data-testid="all-users-count">{context.allUsers.length}</span>
      <span data-testid="all-users-loading">{String(context.allUsersLoading)}</span>
      <span data-testid="squads-count">{context.squads.length}</span>
      <span data-testid="squads-loading">{String(context.squadsLoading)}</span>
      <span data-testid="departments-count">{context.departments.length}</span>
      <span data-testid="loading">{String(context.loading)}</span>
    </div>
  );
}

describe("OrganizationProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseUser.mockReturnValue({
      user: { sub: "auth0|123", email: "test@example.com" },
      isLoading: false,
      error: undefined,
      checkSession: jest.fn(),
    });

    mockUseEmployeesQuery.mockReturnValue({
      employees: mockEmployees,
      isLoading: false,
      error: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof hooks.useEmployeesQuery>);

    mockUseAllUsersQuery.mockReturnValue({
      allUsers: mockAllUsers,
      isLoading: false,
      error: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof hooks.useAllUsersQuery>);

    mockUseSquadsQuery.mockReturnValue({
      squads: mockSquads,
      isLoading: false,
      error: null,
      refetch: jest.fn().mockResolvedValue(undefined),
      addSquad: jest.fn().mockResolvedValue({ id: 3, name: "New Squad" }),
      removeSquad: jest.fn().mockResolvedValue(undefined),
      isMutating: false,
    } as ReturnType<typeof hooks.useSquadsQuery>);

    mockUseDepartmentsQuery.mockReturnValue({
      departments: mockDepartments,
      isLoading: false,
      error: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof hooks.useDepartmentsQuery>);
  });

  describe("rendering", () => {
    it("renders children", () => {
      render(
        <OrganizationProvider>
          <div data-testid="child">Child content</div>
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });

  describe("employees data", () => {
    it("provides employees from hook", () => {
      render(
        <OrganizationProvider>
          <TestConsumer />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId("employees-count")).toHaveTextContent("2");
    });

    it("provides employeesLoading state", () => {
      mockUseEmployeesQuery.mockReturnValue({
        employees: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as ReturnType<typeof hooks.useEmployeesQuery>);

      render(
        <OrganizationProvider>
          <TestConsumer />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId("employees-loading")).toHaveTextContent("true");
    });

    it("provides refetchEmployees function", () => {
      let capturedContext: ReturnType<typeof useOrganization> | undefined;

      render(
        <OrganizationProvider>
          <TestConsumer
            onRender={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(capturedContext?.refetchEmployees).toBeDefined();
      expect(typeof capturedContext?.refetchEmployees).toBe("function");
    });
  });

  describe("allUsers data", () => {
    it("provides allUsers from hook", () => {
      render(
        <OrganizationProvider>
          <TestConsumer />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId("all-users-count")).toHaveTextContent("3");
    });

    it("provides allUsersLoading state", () => {
      mockUseAllUsersQuery.mockReturnValue({
        allUsers: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as ReturnType<typeof hooks.useAllUsersQuery>);

      render(
        <OrganizationProvider>
          <TestConsumer />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId("all-users-loading")).toHaveTextContent("true");
    });
  });

  describe("squads data", () => {
    it("provides squads from hook", () => {
      render(
        <OrganizationProvider>
          <TestConsumer />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId("squads-count")).toHaveTextContent("2");
    });

    it("provides squadsLoading state", () => {
      mockUseSquadsQuery.mockReturnValue({
        squads: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        addSquad: jest.fn(),
        removeSquad: jest.fn(),
        isMutating: false,
      } as ReturnType<typeof hooks.useSquadsQuery>);

      render(
        <OrganizationProvider>
          <TestConsumer />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId("squads-loading")).toHaveTextContent("true");
    });

    it("provides addSquad function", async () => {
      let capturedContext: ReturnType<typeof useOrganization> | undefined;

      render(
        <OrganizationProvider>
          <TestConsumer
            onRender={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(capturedContext?.addSquad).toBeDefined();
    });

    it("provides removeSquad function", () => {
      let capturedContext: ReturnType<typeof useOrganization> | undefined;

      render(
        <OrganizationProvider>
          <TestConsumer
            onRender={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(capturedContext?.removeSquad).toBeDefined();
    });
  });

  describe("departments data", () => {
    it("provides departments from hook", () => {
      render(
        <OrganizationProvider>
          <TestConsumer />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId("departments-count")).toHaveTextContent("2");
    });
  });

  describe("combined loading state", () => {
    it("loading is true when auth is loading", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: true,
        error: undefined,
        checkSession: jest.fn(),
      });

      render(
        <OrganizationProvider>
          <TestConsumer />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId("loading")).toHaveTextContent("true");
    });

    it("loading is true when employees are loading", () => {
      mockUseEmployeesQuery.mockReturnValue({
        employees: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as ReturnType<typeof hooks.useEmployeesQuery>);

      render(
        <OrganizationProvider>
          <TestConsumer />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId("loading")).toHaveTextContent("true");
    });

    it("loading is false when all data is loaded", () => {
      render(
        <OrganizationProvider>
          <TestConsumer />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  describe("authentication check", () => {
    it("passes enabled: true to hooks when authenticated", () => {
      mockUseUser.mockReturnValue({
        user: { sub: "auth0|123" },
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });

      render(
        <OrganizationProvider>
          <TestConsumer />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(mockUseEmployeesQuery).toHaveBeenCalledWith({ enabled: true });
      expect(mockUseAllUsersQuery).toHaveBeenCalledWith({ enabled: true });
      expect(mockUseSquadsQuery).toHaveBeenCalledWith({ enabled: true });
      expect(mockUseDepartmentsQuery).toHaveBeenCalledWith({ enabled: true });
    });

    it("passes enabled: false to hooks when not authenticated", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: false,
        error: undefined,
        checkSession: jest.fn(),
      });

      render(
        <OrganizationProvider>
          <TestConsumer />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(mockUseEmployeesQuery).toHaveBeenCalledWith({ enabled: false });
    });

    it("passes enabled: false when auth is still loading", () => {
      mockUseUser.mockReturnValue({
        user: undefined,
        isLoading: true,
        error: undefined,
        checkSession: jest.fn(),
      });

      render(
        <OrganizationProvider>
          <TestConsumer />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(mockUseEmployeesQuery).toHaveBeenCalledWith({ enabled: false });
    });
  });

  describe("refetchAll", () => {
    it("provides refetchAll function", () => {
      let capturedContext: ReturnType<typeof useOrganization> | undefined;

      render(
        <OrganizationProvider>
          <TestConsumer
            onRender={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      expect(capturedContext?.refetchAll).toBeDefined();
      expect(typeof capturedContext?.refetchAll).toBe("function");
    });

    it("refetchAll calls refetchQueries with organization keys", async () => {
      let capturedContext: ReturnType<typeof useOrganization> | undefined;

      render(
        <OrganizationProvider>
          <TestConsumer
            onRender={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </OrganizationProvider>,
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await capturedContext?.refetchAll();
      });

      expect(mockRefetchQueries).toHaveBeenCalled();
    });
  });
});

describe("useOrganization outside provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns default context when used outside provider", () => {
    let capturedContext: ReturnType<typeof useOrganization> | undefined;

    function TestComponent() {
      capturedContext = useOrganization();
      return null;
    }

    render(<TestComponent />);

    expect(capturedContext).toBeDefined();
    expect(capturedContext?.employees).toEqual([]);
    expect(capturedContext?.allUsers).toEqual([]);
    expect(capturedContext?.squads).toEqual([]);
    expect(capturedContext?.departments).toEqual([]);
    expect(capturedContext?.loading).toBe(true);
  });

  it("default employeesLoading is true", () => {
    let capturedContext: ReturnType<typeof useOrganization> | undefined;

    function TestComponent() {
      capturedContext = useOrganization();
      return null;
    }

    render(<TestComponent />);

    expect(capturedContext?.employeesLoading).toBe(true);
  });

  it("default refetch functions are no-ops", async () => {
    let capturedContext: ReturnType<typeof useOrganization> | undefined;

    function TestComponent() {
      capturedContext = useOrganization();
      return null;
    }

    render(<TestComponent />);

    // Should not throw
    await expect(capturedContext?.refetchEmployees()).resolves.toBeUndefined();
    await expect(capturedContext?.refetchAllUsers()).resolves.toBeUndefined();
    await expect(capturedContext?.refetchSquads()).resolves.toBeUndefined();
    await expect(capturedContext?.refetchAll()).resolves.toBeUndefined();
  });

  it("default addSquad returns placeholder squad", async () => {
    let capturedContext: ReturnType<typeof useOrganization> | undefined;

    function TestComponent() {
      capturedContext = useOrganization();
      return null;
    }

    render(<TestComponent />);

    const result = await capturedContext?.addSquad("Test");
    expect(result).toEqual({ id: 0, name: "", members: [] });
  });

  it("default removeSquad is a no-op", async () => {
    let capturedContext: ReturnType<typeof useOrganization> | undefined;

    function TestComponent() {
      capturedContext = useOrganization();
      return null;
    }

    render(<TestComponent />);

    await expect(capturedContext?.removeSquad(1)).resolves.toBeUndefined();
  });
});
