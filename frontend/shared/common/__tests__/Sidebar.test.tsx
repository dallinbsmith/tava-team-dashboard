/**
 * Tests for shared/common/Sidebar.tsx
 * Sidebar navigation with role-based menu items
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "../Sidebar";

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({ href, children, onClick, className }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) {
    return (
      <a href={href} onClick={onClick} className={className}>
        {children}
      </a>
    );
  };
});

// Mock next/navigation
let mockPathname = "/";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Mock Avatar component
jest.mock("../Avatar", () => {
  return function MockAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
    return <div data-testid="avatar">{firstName} {lastName}</div>;
  };
});

describe("Sidebar", () => {
  const defaultProps = {
    user: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      s3AvatarUrl: "https://example.com/avatar.jpg",
    },
  };

  beforeEach(() => {
    mockPathname = "/";
  });

  describe("rendering", () => {
    it("renders logo link to home", () => {
      render(<Sidebar {...defaultProps} />);
      const logoLink = screen.getByRole("link", { name: /tava/i });
      expect(logoLink).toHaveAttribute("href", "/");
    });

    it("renders user avatar", () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByTestId("avatar")).toBeInTheDocument();
    });

    it("renders user name", () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const userNameElement = container.querySelector(".truncate");
      expect(userNameElement).toHaveTextContent("John Doe");
    });

    it("renders email when no name provided", () => {
      render(<Sidebar {...defaultProps} user={{ email: "john@example.com" }} />);
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("renders sign out link", () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText("Sign out")).toBeInTheDocument();
    });

    it("sign out link points to auth/logout", () => {
      render(<Sidebar {...defaultProps} />);
      const signOutLink = screen.getByText("Sign out").closest("a");
      expect(signOutLink).toHaveAttribute("href", "/auth/logout");
    });
  });

  describe("navigation items", () => {
    it("renders Dashboard/Overview link", () => {
      render(<Sidebar {...defaultProps} />);
      // Default role shows "My Profile"
      expect(screen.getByRole("link", { name: /my profile/i })).toBeInTheDocument();
    });

    it("renders Calendar link", () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByRole("link", { name: /calendar/i })).toBeInTheDocument();
    });

    it("renders Time Off link", () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByRole("link", { name: /time off/i })).toBeInTheDocument();
    });

    it("renders Org Chart link", () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByRole("link", { name: /org chart/i })).toBeInTheDocument();
    });
  });

  describe("role-based menu items", () => {
    describe("employee role", () => {
      it("shows My Profile label", () => {
        render(<Sidebar {...defaultProps} role="employee" />);
        expect(screen.getByRole("link", { name: /my profile/i })).toBeInTheDocument();
      });

      it("does not show Invitations link", () => {
        render(<Sidebar {...defaultProps} role="employee" />);
        expect(screen.queryByRole("link", { name: /invitations/i })).not.toBeInTheDocument();
      });

      it("does not show Teams link", () => {
        render(<Sidebar {...defaultProps} role="employee" />);
        expect(screen.queryByRole("link", { name: /teams/i })).not.toBeInTheDocument();
      });

      it("does not show Settings link", () => {
        render(<Sidebar {...defaultProps} role="employee" />);
        expect(screen.queryByRole("link", { name: /settings/i })).not.toBeInTheDocument();
      });
    });

    describe("supervisor role", () => {
      it("shows My Team label", () => {
        render(<Sidebar {...defaultProps} role="supervisor" />);
        expect(screen.getByRole("link", { name: /my team/i })).toBeInTheDocument();
      });

      it("does not show Invitations link", () => {
        render(<Sidebar {...defaultProps} role="supervisor" />);
        expect(screen.queryByRole("link", { name: /invitations/i })).not.toBeInTheDocument();
      });

      it("shows Teams link", () => {
        render(<Sidebar {...defaultProps} role="supervisor" />);
        expect(screen.getByRole("link", { name: /teams/i })).toBeInTheDocument();
      });

      it("shows Settings link", () => {
        render(<Sidebar {...defaultProps} role="supervisor" />);
        expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
      });
    });

    describe("admin role", () => {
      it("shows Overview label", () => {
        render(<Sidebar {...defaultProps} role="admin" />);
        expect(screen.getByRole("link", { name: /overview/i })).toBeInTheDocument();
      });

      it("shows Invitations link", () => {
        render(<Sidebar {...defaultProps} role="admin" />);
        expect(screen.getByRole("link", { name: /invitations/i })).toBeInTheDocument();
      });

      it("shows Teams link", () => {
        render(<Sidebar {...defaultProps} role="admin" />);
        expect(screen.getByRole("link", { name: /teams/i })).toBeInTheDocument();
      });

      it("shows Settings link", () => {
        render(<Sidebar {...defaultProps} role="admin" />);
        expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
      });
    });

    it("displays role in user section", () => {
      render(<Sidebar {...defaultProps} role="admin" />);
      expect(screen.getByText("admin")).toBeInTheDocument();
    });
  });

  describe("active state", () => {
    it("highlights active link for home page", () => {
      mockPathname = "/";
      render(<Sidebar {...defaultProps} />);
      const homeLink = screen.getByRole("link", { name: /my profile/i });
      expect(homeLink).toHaveClass("bg-theme-sidebar-active", "text-primary-400");
    });

    it("highlights active link for calendar page", () => {
      mockPathname = "/calendar";
      render(<Sidebar {...defaultProps} />);
      const calendarLink = screen.getByRole("link", { name: /calendar/i });
      expect(calendarLink).toHaveClass("bg-theme-sidebar-active", "text-primary-400");
    });

    it("highlights active link for time-off page", () => {
      mockPathname = "/time-off";
      render(<Sidebar {...defaultProps} />);
      const timeOffLink = screen.getByRole("link", { name: /time off/i });
      expect(timeOffLink).toHaveClass("bg-theme-sidebar-active");
    });

    it("highlights active link for orgchart page", () => {
      mockPathname = "/orgchart";
      render(<Sidebar {...defaultProps} />);
      const orgChartLink = screen.getByRole("link", { name: /org chart/i });
      expect(orgChartLink).toHaveClass("bg-theme-sidebar-active");
    });

    it("highlights active link for invitations page", () => {
      mockPathname = "/admin/invitations";
      render(<Sidebar {...defaultProps} role="admin" />);
      const invitationsLink = screen.getByRole("link", { name: /invitations/i });
      expect(invitationsLink).toHaveClass("bg-theme-sidebar-active");
    });

    it("inactive links have muted styling", () => {
      mockPathname = "/";
      render(<Sidebar {...defaultProps} />);
      const calendarLink = screen.getByRole("link", { name: /calendar/i });
      expect(calendarLink).toHaveClass("text-theme-text-muted");
    });
  });

  describe("mobile menu", () => {
    it("is hidden by default on mobile", () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const aside = container.querySelector("aside");
      expect(aside).toHaveClass("-translate-x-full");
    });

    it("is visible when isOpen is true", () => {
      const { container } = render(<Sidebar {...defaultProps} isOpen />);
      const aside = container.querySelector("aside");
      expect(aside).toHaveClass("translate-x-0");
    });

    it("shows overlay when open", () => {
      const { container } = render(<Sidebar {...defaultProps} isOpen />);
      const overlay = container.querySelector(".fixed.inset-0.bg-black\\/50");
      expect(overlay).toBeInTheDocument();
    });

    it("does not show overlay when closed", () => {
      const { container } = render(<Sidebar {...defaultProps} isOpen={false} />);
      const overlay = container.querySelector(".fixed.inset-0.bg-black\\/50");
      expect(overlay).not.toBeInTheDocument();
    });

    it("calls onToggle when overlay clicked", () => {
      const onToggle = jest.fn();
      const { container } = render(<Sidebar {...defaultProps} isOpen onToggle={onToggle} />);
      const overlay = container.querySelector(".fixed.inset-0.bg-black\\/50");
      fireEvent.click(overlay!);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("calls onToggle when close button clicked", () => {
      const onToggle = jest.fn();
      render(<Sidebar {...defaultProps} isOpen onToggle={onToggle} />);
      const closeButton = screen.getByLabelText("Close menu");
      fireEvent.click(closeButton);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("calls onToggle when navigation link clicked", () => {
      const onToggle = jest.fn();
      render(<Sidebar {...defaultProps} isOpen onToggle={onToggle} />);
      const calendarLink = screen.getByRole("link", { name: /calendar/i });
      fireEvent.click(calendarLink);
      expect(onToggle).toHaveBeenCalled();
    });

    it("calls onToggle when logo clicked", () => {
      const onToggle = jest.fn();
      render(<Sidebar {...defaultProps} isOpen onToggle={onToggle} />);
      const logoLink = screen.getByRole("link", { name: /tava/i });
      fireEvent.click(logoLink);
      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe("styling", () => {
    it("has fixed positioning", () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const aside = container.querySelector("aside");
      expect(aside).toHaveClass("fixed", "left-0", "top-0");
    });

    it("has proper width", () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const aside = container.querySelector("aside");
      expect(aside).toHaveClass("w-64");
    });

    it("has full height", () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const aside = container.querySelector("aside");
      expect(aside).toHaveClass("h-full");
    });

    it("has sidebar background", () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const aside = container.querySelector("aside");
      expect(aside).toHaveClass("bg-theme-sidebar");
    });

    it("has transition for mobile menu", () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const aside = container.querySelector("aside");
      expect(aside).toHaveClass("transition-transform", "duration-300");
    });
  });

  describe("user section", () => {
    it("user section is at bottom", () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const userSection = container.querySelector(".border-t.border-theme-border");
      expect(userSection).toBeInTheDocument();
    });

    it("displays avatar with user initials", () => {
      render(<Sidebar {...defaultProps} />);
      const avatar = screen.getByTestId("avatar");
      expect(avatar).toHaveTextContent("John Doe");
    });

    it("truncates long user names", () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const userName = container.querySelector(".truncate");
      expect(userName).toBeInTheDocument();
    });
  });
});
