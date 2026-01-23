/**
 * Tests for providers/QueryProvider.tsx
 * QueryClient provider with custom configuration
 */

import React from "react";
import { render, screen, renderHook } from "@testing-library/react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { QueryProvider } from "../QueryProvider";

describe("QueryProvider", () => {
  describe("rendering", () => {
    it("renders children", () => {
      render(
        <QueryProvider>
          <div data-testid="child">Child content</div>
        </QueryProvider>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <QueryProvider>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </QueryProvider>
      );

      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });
  });

  describe("QueryClient availability", () => {
    it("provides QueryClient to children", () => {
      const TestComponent = () => {
        const queryClient = useQueryClient();
        return <div data-testid="has-client">{queryClient ? "yes" : "no"}</div>;
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      expect(screen.getByTestId("has-client")).toHaveTextContent("yes");
    });

    it("allows queries to be executed", async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: "test" });

      const TestComponent = () => {
        const { data, isSuccess } = useQuery({
          queryKey: ["test-query"],
          queryFn: mockFn,
        });

        if (isSuccess) {
          return <div data-testid="data">{JSON.stringify(data)}</div>;
        }
        return <div data-testid="loading">Loading</div>;
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      // Initially shows loading
      expect(screen.getByTestId("loading")).toBeInTheDocument();
    });
  });

  describe("QueryClient configuration", () => {
    it("creates a new QueryClient on mount", () => {
      const clients: unknown[] = [];

      const TestComponent = () => {
        const queryClient = useQueryClient();
        clients.push(queryClient);
        return null;
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      expect(clients.length).toBe(1);
      expect(clients[0]).toBeDefined();
    });

    it("maintains same QueryClient across re-renders", () => {
      const clients: unknown[] = [];

      const TestComponent = () => {
        const queryClient = useQueryClient();
        clients.push(queryClient);
        return <div>Test</div>;
      };

      const { rerender } = render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      rerender(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      // Should be the same instance
      expect(clients[0]).toBe(clients[1]);
    });
  });

  describe("default options", () => {
    it("applies custom staleTime configuration", () => {
      const TestComponent = () => {
        const queryClient = useQueryClient();
        const defaultOptions = queryClient.getDefaultOptions();
        return <div data-testid="stale-time">{defaultOptions.queries?.staleTime}</div>;
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      // 5 minutes = 5 * 60 * 1000 = 300000
      expect(screen.getByTestId("stale-time")).toHaveTextContent("300000");
    });

    it("applies custom gcTime configuration", () => {
      const TestComponent = () => {
        const queryClient = useQueryClient();
        const defaultOptions = queryClient.getDefaultOptions();
        return <div data-testid="gc-time">{defaultOptions.queries?.gcTime}</div>;
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      // 30 minutes = 30 * 60 * 1000 = 1800000
      expect(screen.getByTestId("gc-time")).toHaveTextContent("1800000");
    });

    it("applies retry configuration", () => {
      const TestComponent = () => {
        const queryClient = useQueryClient();
        const defaultOptions = queryClient.getDefaultOptions();
        return <div data-testid="retry">{defaultOptions.queries?.retry}</div>;
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      expect(screen.getByTestId("retry")).toHaveTextContent("1");
    });

    it("disables refetchOnWindowFocus", () => {
      const TestComponent = () => {
        const queryClient = useQueryClient();
        const defaultOptions = queryClient.getDefaultOptions();
        return (
          <div data-testid="refetch-on-focus">
            {String(defaultOptions.queries?.refetchOnWindowFocus)}
          </div>
        );
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      expect(screen.getByTestId("refetch-on-focus")).toHaveTextContent("false");
    });
  });
});
