/**
 * Tests for providers/AppProviders.tsx
 * Combined app providers wrapper
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { AppProviders } from "../AppProviders";

// Mock all the child providers
jest.mock("@auth0/nextjs-auth0", () => ({
  Auth0Provider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth0-provider">{children}</div>
  ),
}));

jest.mock("nuqs/adapters/next/app", () => ({
  NuqsAdapter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="nuqs-adapter">{children}</div>
  ),
}));

jest.mock("../QueryProvider", () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="query-provider">{children}</div>
  ),
}));

jest.mock("../ImpersonationProvider", () => ({
  ImpersonationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="impersonation-provider">{children}</div>
  ),
}));

jest.mock("../CurrentUserProvider", () => ({
  CurrentUserProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="current-user-provider">{children}</div>
  ),
}));

jest.mock("../OrganizationProvider", () => ({
  OrganizationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="organization-provider">{children}</div>
  ),
}));

describe("AppProviders", () => {
  describe("rendering", () => {
    it("renders children", () => {
      render(
        <AppProviders>
          <div data-testid="child">Child content</div>
        </AppProviders>,
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <AppProviders>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </AppProviders>,
      );

      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });
  });

  describe("provider composition", () => {
    it("renders Auth0Provider", () => {
      render(
        <AppProviders>
          <div>Content</div>
        </AppProviders>,
      );

      expect(screen.getByTestId("auth0-provider")).toBeInTheDocument();
    });

    it("renders QueryProvider", () => {
      render(
        <AppProviders>
          <div>Content</div>
        </AppProviders>,
      );

      expect(screen.getByTestId("query-provider")).toBeInTheDocument();
    });

    it("renders NuqsAdapter", () => {
      render(
        <AppProviders>
          <div>Content</div>
        </AppProviders>,
      );

      expect(screen.getByTestId("nuqs-adapter")).toBeInTheDocument();
    });

    it("renders ImpersonationProvider", () => {
      render(
        <AppProviders>
          <div>Content</div>
        </AppProviders>,
      );

      expect(screen.getByTestId("impersonation-provider")).toBeInTheDocument();
    });

    it("renders CurrentUserProvider", () => {
      render(
        <AppProviders>
          <div>Content</div>
        </AppProviders>,
      );

      expect(screen.getByTestId("current-user-provider")).toBeInTheDocument();
    });

    it("renders OrganizationProvider", () => {
      render(
        <AppProviders>
          <div>Content</div>
        </AppProviders>,
      );

      expect(screen.getByTestId("organization-provider")).toBeInTheDocument();
    });
  });

  describe("provider nesting order", () => {
    it("nests providers in correct order (Auth0 at root)", () => {
      render(
        <AppProviders>
          <div data-testid="child">Content</div>
        </AppProviders>,
      );

      // Check nesting by verifying the structure
      const auth0 = screen.getByTestId("auth0-provider");
      const query = screen.getByTestId("query-provider");
      const nuqs = screen.getByTestId("nuqs-adapter");
      const impersonation = screen.getByTestId("impersonation-provider");
      const currentUser = screen.getByTestId("current-user-provider");
      const organization = screen.getByTestId("organization-provider");
      const child = screen.getByTestId("child");

      // Verify auth0 contains query
      expect(auth0).toContainElement(query);
      // Verify query contains nuqs
      expect(query).toContainElement(nuqs);
      // Verify nuqs contains impersonation
      expect(nuqs).toContainElement(impersonation);
      // Verify impersonation contains currentUser
      expect(impersonation).toContainElement(currentUser);
      // Verify currentUser contains organization
      expect(currentUser).toContainElement(organization);
      // Verify organization contains child
      expect(organization).toContainElement(child);
    });
  });

  describe("type safety", () => {
    it("accepts ReactNode children", () => {
      // Should compile without errors - testing that AppProviders accepts various ReactNode types
      const { container } = render(
        <AppProviders>
          <span>Text</span>
          <div>Div</div>
          {null}
          {undefined}
          {"string"}
          {123}
        </AppProviders>,
      );

      expect(screen.getByText("Text")).toBeInTheDocument();
      expect(screen.getByText("Div")).toBeInTheDocument();
      // Raw strings and numbers render as text nodes - verify they're in the DOM
      expect(container.textContent).toContain("string");
      expect(container.textContent).toContain("123");
    });
  });
});
