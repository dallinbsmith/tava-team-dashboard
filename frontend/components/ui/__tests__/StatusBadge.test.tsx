/**
 * Tests for components/ui/StatusBadge.tsx
 * StatusBadge and RoleBadge components
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  StatusBadge,
  RoleBadge,
  BadgeVariant,
  BadgeSize,
  UserRole,
} from "../StatusBadge";

describe("StatusBadge", () => {
  describe("rendering", () => {
    it("renders children text", () => {
      render(<StatusBadge>Active</StatusBadge>);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders as a span element", () => {
      render(<StatusBadge>Status</StatusBadge>);
      const badge = screen.getByText("Status");
      expect(badge.tagName).toBe("SPAN");
    });

    it("applies base classes", () => {
      render(<StatusBadge>Test</StatusBadge>);
      const badge = screen.getByText("Test");

      expect(badge).toHaveClass("inline-flex");
      expect(badge).toHaveClass("items-center");
      expect(badge).toHaveClass("font-medium");
      expect(badge).toHaveClass("rounded-full");
      expect(badge).toHaveClass("border");
    });
  });

  describe("variants", () => {
    const variants: BadgeVariant[] = [
      "default",
      "success",
      "warning",
      "error",
      "info",
      "pending",
      "approved",
      "rejected",
      "cancelled",
    ];

    it.each(variants)("renders %s variant with correct color classes", (variant) => {
      render(<StatusBadge variant={variant}>{variant}</StatusBadge>);
      const badge = screen.getByText(variant);

      // Each variant should have bg, text, and border classes
      expect(badge.className).toMatch(/bg-/);
      expect(badge.className).toMatch(/text-/);
      expect(badge.className).toMatch(/border-/);
    });

    it("defaults to 'default' variant", () => {
      render(<StatusBadge>Default</StatusBadge>);
      const badge = screen.getByText("Default");

      // Default variant uses gray colors
      expect(badge).toHaveClass("bg-gray-500/10");
      expect(badge).toHaveClass("text-gray-400");
      expect(badge).toHaveClass("border-gray-500/20");
    });

    describe("color mappings", () => {
      it("success variant uses green colors", () => {
        render(<StatusBadge variant="success">Success</StatusBadge>);
        const badge = screen.getByText("Success");

        expect(badge).toHaveClass("bg-green-500/10");
        expect(badge).toHaveClass("text-green-400");
        expect(badge).toHaveClass("border-green-500/20");
      });

      it("warning variant uses yellow colors", () => {
        render(<StatusBadge variant="warning">Warning</StatusBadge>);
        const badge = screen.getByText("Warning");

        expect(badge).toHaveClass("bg-yellow-500/10");
        expect(badge).toHaveClass("text-yellow-400");
      });

      it("error variant uses red colors", () => {
        render(<StatusBadge variant="error">Error</StatusBadge>);
        const badge = screen.getByText("Error");

        expect(badge).toHaveClass("bg-red-500/10");
        expect(badge).toHaveClass("text-red-400");
      });

      it("info variant uses blue colors", () => {
        render(<StatusBadge variant="info">Info</StatusBadge>);
        const badge = screen.getByText("Info");

        expect(badge).toHaveClass("bg-blue-500/10");
        expect(badge).toHaveClass("text-blue-400");
      });

      it("pending variant uses yellow colors (same as warning)", () => {
        render(<StatusBadge variant="pending">Pending</StatusBadge>);
        const badge = screen.getByText("Pending");

        expect(badge).toHaveClass("bg-yellow-500/10");
        expect(badge).toHaveClass("text-yellow-400");
      });

      it("approved variant uses green colors (same as success)", () => {
        render(<StatusBadge variant="approved">Approved</StatusBadge>);
        const badge = screen.getByText("Approved");

        expect(badge).toHaveClass("bg-green-500/10");
        expect(badge).toHaveClass("text-green-400");
      });

      it("rejected variant uses red colors (same as error)", () => {
        render(<StatusBadge variant="rejected">Rejected</StatusBadge>);
        const badge = screen.getByText("Rejected");

        expect(badge).toHaveClass("bg-red-500/10");
        expect(badge).toHaveClass("text-red-400");
      });

      it("cancelled variant uses gray colors (same as default)", () => {
        render(<StatusBadge variant="cancelled">Cancelled</StatusBadge>);
        const badge = screen.getByText("Cancelled");

        expect(badge).toHaveClass("bg-gray-500/10");
        expect(badge).toHaveClass("text-gray-400");
      });
    });
  });

  describe("sizes", () => {
    const sizes: BadgeSize[] = ["sm", "md"];

    it.each(sizes)("renders %s size with correct padding", (size) => {
      render(<StatusBadge size={size}>{size}</StatusBadge>);
      const badge = screen.getByText(size);

      const sizeClasses: Record<BadgeSize, string[]> = {
        sm: ["px-1.5", "py-0.5"],
        md: ["px-2", "py-0.5"],
      };

      sizeClasses[size].forEach((cls) => {
        expect(badge).toHaveClass(cls);
      });
    });

    it("defaults to 'md' size", () => {
      render(<StatusBadge>Default Size</StatusBadge>);
      const badge = screen.getByText("Default Size");

      expect(badge).toHaveClass("px-2");
    });

    it("both sizes have text-xs class", () => {
      const { rerender } = render(<StatusBadge size="sm">Small</StatusBadge>);
      expect(screen.getByText("Small")).toHaveClass("text-xs");

      rerender(<StatusBadge size="md">Medium</StatusBadge>);
      expect(screen.getByText("Medium")).toHaveClass("text-xs");
    });
  });

  describe("custom className", () => {
    it("merges custom className with default classes", () => {
      render(<StatusBadge className="custom-class">Custom</StatusBadge>);
      const badge = screen.getByText("Custom");

      expect(badge).toHaveClass("custom-class");
      // Should still have base classes
      expect(badge).toHaveClass("inline-flex");
      expect(badge).toHaveClass("rounded-full");
    });

    it("allows overriding styles via className", () => {
      render(<StatusBadge className="bg-purple-500">Override</StatusBadge>);
      const badge = screen.getByText("Override");

      // Custom class should be present
      expect(badge).toHaveClass("bg-purple-500");
    });
  });

  describe("children content", () => {
    it("renders string children", () => {
      render(<StatusBadge>Text Content</StatusBadge>);
      expect(screen.getByText("Text Content")).toBeInTheDocument();
    });

    it("renders number children", () => {
      render(<StatusBadge>{42}</StatusBadge>);
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("renders element children", () => {
      render(
        <StatusBadge>
          <span data-testid="inner">Inner Element</span>
        </StatusBadge>
      );
      expect(screen.getByTestId("inner")).toBeInTheDocument();
    });
  });
});

describe("RoleBadge", () => {
  describe("rendering", () => {
    it("renders admin role", () => {
      render(<RoleBadge role="admin" />);
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("renders supervisor role", () => {
      render(<RoleBadge role="supervisor" />);
      expect(screen.getByText("Supervisor")).toBeInTheDocument();
    });

    it("renders employee role", () => {
      render(<RoleBadge role="employee" />);
      expect(screen.getByText("Employee")).toBeInTheDocument();
    });
  });

  describe("role to variant mapping", () => {
    it("admin uses error variant (red)", () => {
      render(<RoleBadge role="admin" />);
      const badge = screen.getByText("Admin");

      expect(badge).toHaveClass("bg-red-500/10");
      expect(badge).toHaveClass("text-red-400");
    });

    it("supervisor uses info variant (blue)", () => {
      render(<RoleBadge role="supervisor" />);
      const badge = screen.getByText("Supervisor");

      expect(badge).toHaveClass("bg-blue-500/10");
      expect(badge).toHaveClass("text-blue-400");
    });

    it("employee uses default variant (gray)", () => {
      render(<RoleBadge role="employee" />);
      const badge = screen.getByText("Employee");

      expect(badge).toHaveClass("bg-gray-500/10");
      expect(badge).toHaveClass("text-gray-400");
    });
  });

  describe("sizes", () => {
    it("defaults to sm size", () => {
      render(<RoleBadge role="admin" />);
      const badge = screen.getByText("Admin");

      expect(badge).toHaveClass("px-1.5");
    });

    it("accepts custom size", () => {
      render(<RoleBadge role="admin" size="md" />);
      const badge = screen.getByText("Admin");

      expect(badge).toHaveClass("px-2");
    });
  });

  describe("custom className", () => {
    it("passes className to StatusBadge", () => {
      render(<RoleBadge role="admin" className="ml-2" />);
      const badge = screen.getByText("Admin");

      expect(badge).toHaveClass("ml-2");
    });
  });

  describe("all roles render correctly", () => {
    const roles: UserRole[] = ["admin", "supervisor", "employee"];
    const expectedLabels: Record<UserRole, string> = {
      admin: "Admin",
      supervisor: "Supervisor",
      employee: "Employee",
    };

    it.each(roles)("%s role displays correct label", (role) => {
      render(<RoleBadge role={role} />);
      expect(screen.getByText(expectedLabels[role])).toBeInTheDocument();
    });
  });
});
