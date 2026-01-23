/**
 * Tests for orgchart/OrgChartPageClient.tsx
 * Main org chart page client component with responsive layout and sidebar toggle
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OrgChartPageClient } from "../OrgChartPageClient";
import { OrgTreeNode } from "../types";
import { User, Squad } from "@/shared/types/user";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock OrganizationProvider
jest.mock("@/providers/OrganizationProvider", () => ({
  useOrganization: () => ({
    refetchSquads: jest.fn(),
  }),
}));

// Mock server actions
jest.mock("../actions", () => ({
  createDraftAction: jest.fn().mockResolvedValue({ success: true, data: { id: 1, name: "Test Draft", changes: [] } }),
  deleteDraftAction: jest.fn().mockResolvedValue({ success: true }),
  publishDraftAction: jest.fn().mockResolvedValue({ success: true }),
  addDraftChangeAction: jest.fn().mockResolvedValue({ success: true }),
  removeDraftChangeAction: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock API functions
jest.mock("@/lib/api", () => ({
  getOrgTree: jest.fn().mockResolvedValue([]),
  getOrgChartDrafts: jest.fn().mockResolvedValue([]),
  getOrgChartDraft: jest.fn().mockResolvedValue({ id: 1, name: "Test Draft", changes: [] }),
  getDepartments: jest.fn().mockResolvedValue(["Engineering", "Product"]),
}));

// Mock Avatar component
jest.mock("@/shared/common/Avatar", () => {
  return function MockAvatar({
    firstName,
    lastName,
  }: {
    firstName: string;
    lastName: string;
    s3AvatarUrl?: string;
    size?: string;
    className?: string;
  }) {
    return (
      <div data-testid="avatar" data-firstname={firstName} data-lastname={lastName}>
        Avatar
      </div>
    );
  };
});

// Mock modals
jest.mock("../components/ManageSquadsModal", () => {
  return function MockManageSquadsModal({ isOpen }: { isOpen: boolean }) {
    return isOpen ? <div data-testid="manage-squads-modal">Manage Squads Modal</div> : null;
  };
});

jest.mock("../components/ManageDepartmentsModal", () => {
  return function MockManageDepartmentsModal({ isOpen }: { isOpen: boolean }) {
    return isOpen ? <div data-testid="manage-departments-modal">Manage Departments Modal</div> : null;
  };
});

jest.mock("../components/DraftEditModal", () => {
  return function MockDraftEditModal({ isOpen }: { isOpen: boolean }) {
    return isOpen ? <div data-testid="draft-edit-modal">Draft Edit Modal</div> : null;
  };
});

jest.mock("../components/ConfirmationModal", () => {
  return function MockConfirmationModal({ isOpen }: { isOpen: boolean }) {
    return isOpen ? <div data-testid="confirmation-modal">Confirmation Modal</div> : null;
  };
});

describe("OrgChartPageClient", () => {
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 1,
    auth0_id: "auth0|123",
    email: "admin@example.com",
    first_name: "Admin",
    last_name: "User",
    role: "admin",
    title: "Administrator",
    department: "Management",
    squads: [],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  const createMockOrgTree = (): OrgTreeNode[] => {
    const admin = createMockUser({ id: 1, role: "admin", first_name: "Admin", last_name: "Boss" });
    const employee = createMockUser({ id: 2, role: "employee", first_name: "John", last_name: "Doe" });
    return [
      {
        user: admin,
        children: [{ user: employee, children: [] }],
      },
    ];
  };

  const defaultProps = {
    initialOrgTrees: createMockOrgTree(),
    initialDrafts: [],
    initialSquads: [] as Squad[],
    initialDepartments: ["Engineering", "Product"],
    canEdit: true,
  };

  describe("rendering", () => {
    it("renders page title", () => {
      render(<OrgChartPageClient {...defaultProps} />);

      expect(screen.getByText("Organization Chart")).toBeInTheDocument();
    });

    it("renders org tree nodes", () => {
      render(<OrgChartPageClient {...defaultProps} />);

      expect(screen.getByText("Admin Boss")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("renders management buttons when canEdit is true", () => {
      render(<OrgChartPageClient {...defaultProps} />);

      expect(screen.getByText(/Departments/)).toBeInTheDocument();
      expect(screen.getByText(/Squads/)).toBeInTheDocument();
    });

    it("does not render management buttons when canEdit is false", () => {
      render(<OrgChartPageClient {...defaultProps} canEdit={false} />);

      expect(screen.queryByText(/Manage Departments/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Manage Squads/)).not.toBeInTheDocument();
    });
  });

  describe("responsive layout", () => {
    it("has responsive flex layout classes on main container", () => {
      const { container } = render(<OrgChartPageClient {...defaultProps} />);

      // Find the main grid/flex container
      const flexContainer = container.querySelector(".flex.flex-col.lg\\:flex-row");
      expect(flexContainer).toBeInTheDocument();
    });

    it("has responsive gap classes", () => {
      const { container } = render(<OrgChartPageClient {...defaultProps} />);

      const flexContainer = container.querySelector(".gap-4.lg\\:gap-6");
      expect(flexContainer).toBeInTheDocument();
    });

    it("has responsive header layout", () => {
      const { container } = render(<OrgChartPageClient {...defaultProps} />);

      // Header should have responsive flex direction
      const headerFlex = container.querySelector(".flex.flex-col.sm\\:flex-row");
      expect(headerFlex).toBeInTheDocument();
    });
  });

  describe("sidebar toggle", () => {
    it("renders sidebar toggle button on mobile", () => {
      render(<OrgChartPageClient {...defaultProps} />);

      // The toggle button has lg:hidden class but is still in the DOM
      const toggleButton = screen.getByRole("button", { name: /Hide Draft Panel/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("sidebar toggle button has lg:hidden class", () => {
      render(<OrgChartPageClient {...defaultProps} />);

      const toggleButton = screen.getByRole("button", { name: /Hide Draft Panel/i });
      expect(toggleButton).toHaveClass("lg:hidden");
    });

    it("toggles sidebar visibility when button is clicked", async () => {
      render(<OrgChartPageClient {...defaultProps} />);

      // Initially shows "Hide Draft Panel"
      const hideButton = screen.getByRole("button", { name: /Hide Draft Panel/i });
      expect(hideButton).toBeInTheDocument();

      // Click to hide
      fireEvent.click(hideButton);

      // Should now show "Show Draft Panel"
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Show Draft Panel/i })).toBeInTheDocument();
      });

      // Click to show again
      fireEvent.click(screen.getByRole("button", { name: /Show Draft Panel/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Hide Draft Panel/i })).toBeInTheDocument();
      });
    });

    it("sidebar has transition classes for smooth animation", () => {
      const { container } = render(<OrgChartPageClient {...defaultProps} />);

      const sidebar = container.querySelector(".transition-all.duration-300");
      expect(sidebar).toBeInTheDocument();
    });
  });

  describe("management buttons", () => {
    it("has responsive button layout", () => {
      const { container } = render(<OrgChartPageClient {...defaultProps} />);

      // Buttons container should have responsive flex direction
      const buttonContainer = container.querySelector(".flex.flex-col.sm\\:flex-row.items-stretch.sm\\:items-center");
      expect(buttonContainer).toBeInTheDocument();
    });

    it("has responsive button padding", () => {
      render(<OrgChartPageClient {...defaultProps} />);

      const departmentsButton = screen.getByRole("button", { name: /Departments/ });
      expect(departmentsButton).toHaveClass("px-3", "sm:px-4");
    });

    it("opens manage departments modal", async () => {
      render(<OrgChartPageClient {...defaultProps} />);

      const button = screen.getByRole("button", { name: /Departments/ });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId("manage-departments-modal")).toBeInTheDocument();
      });
    });

    it("opens manage squads modal", async () => {
      render(<OrgChartPageClient {...defaultProps} />);

      const button = screen.getByRole("button", { name: /Squads/ });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId("manage-squads-modal")).toBeInTheDocument();
      });
    });
  });

  describe("view only mode", () => {
    it("shows view only message when not in draft mode", () => {
      render(<OrgChartPageClient {...defaultProps} />);

      expect(screen.getByText(/View Only Mode/)).toBeInTheDocument();
    });

    it("shows different message for non-editors", () => {
      render(<OrgChartPageClient {...defaultProps} canEdit={false} />);

      expect(screen.getByText(/View Only:/)).toBeInTheDocument();
      expect(screen.getByText(/cannot make changes/)).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state when no org trees", () => {
      render(<OrgChartPageClient {...defaultProps} initialOrgTrees={[]} />);

      expect(screen.getByText("No organization data available")).toBeInTheDocument();
    });
  });

  describe("main content area", () => {
    it("has responsive padding classes", () => {
      const { container } = render(<OrgChartPageClient {...defaultProps} />);

      // Main content area should have responsive padding
      const mainContent = container.querySelector(".p-3.sm\\:p-4");
      expect(mainContent).toBeInTheDocument();
    });

    it("has min-height on mobile for usability", () => {
      const { container } = render(<OrgChartPageClient {...defaultProps} />);

      const mainContent = container.querySelector(".min-h-\\[400px\\]");
      expect(mainContent).toBeInTheDocument();
    });
  });

  describe("draft manager sidebar", () => {
    it("renders draft manager for editors", () => {
      render(<OrgChartPageClient {...defaultProps} />);

      // Draft manager should be present - look for the sidebar toggle which indicates sidebar is rendered
      expect(screen.getByRole("button", { name: /Draft Panel/i })).toBeInTheDocument();
    });

    it("sidebar has responsive width classes", () => {
      const { container } = render(<OrgChartPageClient {...defaultProps} />);

      // Look for the sidebar with responsive width
      const sidebar = container.querySelector(".w-full.lg\\:w-96");
      expect(sidebar).toBeInTheDocument();
    });

    it("does not render sidebar for non-editors", () => {
      const { container } = render(<OrgChartPageClient {...defaultProps} canEdit={false} />);

      // Sidebar should not be present
      const sidebar = container.querySelector(".lg\\:w-96");
      expect(sidebar).not.toBeInTheDocument();
    });
  });
});
