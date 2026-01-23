/**
 * Tests for providers/ImpersonationProvider.tsx
 * Impersonation context provider with sessionStorage persistence
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import { ImpersonationProvider, useImpersonation } from "../ImpersonationProvider";
import { User } from "@/shared/types/user";

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
});

// Test fixtures
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 42,
  auth0_id: "auth0|123",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  role: "employee",
  title: "Software Engineer",
  department: "Engineering",
  squads: [],
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

// Test component that uses the hook
function TestConsumer({
  onRender,
}: {
  onRender?: (ctx: ReturnType<typeof useImpersonation>) => void;
}) {
  const context = useImpersonation();
  onRender?.(context);
  return (
    <div>
      <span data-testid="is-impersonating">{String(context.isImpersonating)}</span>
      <span data-testid="impersonated-user-id">{context.impersonatedUserId ?? "null"}</span>
      <span data-testid="impersonated-user-name">
        {context.impersonatedUser
          ? `${context.impersonatedUser.first_name} ${context.impersonatedUser.last_name}`
          : "null"}
      </span>
      <button onClick={() => context.startImpersonation(createMockUser())} data-testid="start-btn">
        Start
      </button>
      <button onClick={() => context.endImpersonation()} data-testid="end-btn">
        End
      </button>
      <button
        onClick={() => context.setImpersonatedUser(createMockUser({ id: 99, first_name: "Jane" }))}
        data-testid="set-user-btn"
      >
        Set User
      </button>
    </div>
  );
}

describe("ImpersonationProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
  });

  describe("rendering", () => {
    it("renders children", () => {
      render(
        <ImpersonationProvider>
          <div data-testid="child">Child content</div>
        </ImpersonationProvider>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });

  describe("initial state", () => {
    it("starts with isImpersonating false", () => {
      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      expect(screen.getByTestId("is-impersonating")).toHaveTextContent("false");
    });

    it("starts with impersonatedUserId null", () => {
      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      expect(screen.getByTestId("impersonated-user-id")).toHaveTextContent("null");
    });

    it("starts with impersonatedUser null", () => {
      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      expect(screen.getByTestId("impersonated-user-name")).toHaveTextContent("null");
    });
  });

  describe("startImpersonation", () => {
    it("sets isImpersonating to true", () => {
      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      act(() => {
        screen.getByTestId("start-btn").click();
      });

      expect(screen.getByTestId("is-impersonating")).toHaveTextContent("true");
    });

    it("sets impersonatedUserId", () => {
      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      act(() => {
        screen.getByTestId("start-btn").click();
      });

      expect(screen.getByTestId("impersonated-user-id")).toHaveTextContent("42");
    });

    it("sets impersonatedUser", () => {
      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      act(() => {
        screen.getByTestId("start-btn").click();
      });

      expect(screen.getByTestId("impersonated-user-name")).toHaveTextContent("Test User");
    });

    it("saves to sessionStorage", () => {
      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      act(() => {
        screen.getByTestId("start-btn").click();
      });

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith("impersonation_user_id", "42");
    });
  });

  describe("endImpersonation", () => {
    it("sets isImpersonating to false", () => {
      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      act(() => {
        screen.getByTestId("start-btn").click();
      });

      act(() => {
        screen.getByTestId("end-btn").click();
      });

      expect(screen.getByTestId("is-impersonating")).toHaveTextContent("false");
    });

    it("clears impersonatedUserId", () => {
      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      act(() => {
        screen.getByTestId("start-btn").click();
      });

      act(() => {
        screen.getByTestId("end-btn").click();
      });

      expect(screen.getByTestId("impersonated-user-id")).toHaveTextContent("null");
    });

    it("clears impersonatedUser", () => {
      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      act(() => {
        screen.getByTestId("start-btn").click();
      });

      act(() => {
        screen.getByTestId("end-btn").click();
      });

      expect(screen.getByTestId("impersonated-user-name")).toHaveTextContent("null");
    });

    it("removes from sessionStorage", () => {
      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      act(() => {
        screen.getByTestId("start-btn").click();
      });

      act(() => {
        screen.getByTestId("end-btn").click();
      });

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("impersonation_user_id");
    });
  });

  describe("setImpersonatedUser", () => {
    it("updates impersonatedUser directly", () => {
      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      act(() => {
        screen.getByTestId("set-user-btn").click();
      });

      expect(screen.getByTestId("impersonated-user-name")).toHaveTextContent("Jane User");
    });
  });

  describe("sessionStorage restoration", () => {
    it("restores impersonatedUserId from sessionStorage on mount", () => {
      mockSessionStorage.getItem.mockReturnValue("123");

      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("impersonation_user_id");
      expect(screen.getByTestId("impersonated-user-id")).toHaveTextContent("123");
    });

    it("sets isImpersonating true when restored from sessionStorage", () => {
      mockSessionStorage.getItem.mockReturnValue("123");

      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      expect(screen.getByTestId("is-impersonating")).toHaveTextContent("true");
    });

    it("handles invalid sessionStorage value", () => {
      mockSessionStorage.getItem.mockReturnValue("invalid");

      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      // isNaN check should prevent setting invalid value
      expect(screen.getByTestId("impersonated-user-id")).toHaveTextContent("null");
    });

    it("handles null sessionStorage value", () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      render(
        <ImpersonationProvider>
          <TestConsumer />
        </ImpersonationProvider>
      );

      expect(screen.getByTestId("impersonated-user-id")).toHaveTextContent("null");
    });
  });
});

describe("useImpersonation outside provider", () => {
  it("returns default context when used outside provider", () => {
    let capturedContext: ReturnType<typeof useImpersonation> | undefined;

    function TestComponent() {
      capturedContext = useImpersonation();
      return null;
    }

    render(<TestComponent />);

    expect(capturedContext).toBeDefined();
    expect(capturedContext?.isImpersonating).toBe(false);
    expect(capturedContext?.impersonatedUser).toBe(null);
    expect(capturedContext?.impersonatedUserId).toBe(null);
  });

  it("default startImpersonation is a no-op", () => {
    let capturedContext: ReturnType<typeof useImpersonation> | undefined;

    function TestComponent() {
      capturedContext = useImpersonation();
      return null;
    }

    render(<TestComponent />);

    // Should not throw
    expect(() => capturedContext?.startImpersonation(createMockUser())).not.toThrow();
  });

  it("default endImpersonation is a no-op", () => {
    let capturedContext: ReturnType<typeof useImpersonation> | undefined;

    function TestComponent() {
      capturedContext = useImpersonation();
      return null;
    }

    render(<TestComponent />);

    // Should not throw
    expect(() => capturedContext?.endImpersonation()).not.toThrow();
  });

  it("default setImpersonatedUser is a no-op", () => {
    let capturedContext: ReturnType<typeof useImpersonation> | undefined;

    function TestComponent() {
      capturedContext = useImpersonation();
      return null;
    }

    render(<TestComponent />);

    // Should not throw
    expect(() => capturedContext?.setImpersonatedUser(createMockUser())).not.toThrow();
  });
});
