/**
 * Tests for shared/common/ImpersonationBanner.tsx
 * Banner displayed when impersonating another user
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ImpersonationBanner from "../ImpersonationBanner";

// Mock the ImpersonationProvider
const mockEndImpersonation = jest.fn();
let mockImpersonationState = {
  isImpersonating: false,
  impersonatedUser: null as null | { first_name: string; last_name: string },
  endImpersonation: mockEndImpersonation,
};

jest.mock("@/providers/ImpersonationProvider", () => ({
  useImpersonation: () => mockImpersonationState,
}));

describe("ImpersonationBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImpersonationState = {
      isImpersonating: false,
      impersonatedUser: null,
      endImpersonation: mockEndImpersonation,
    };
  });

  describe("when not impersonating", () => {
    it("returns null when isImpersonating is false", () => {
      const { container } = render(<ImpersonationBanner />);
      expect(container).toBeEmptyDOMElement();
    });

    it("returns null when impersonatedUser is null", () => {
      mockImpersonationState = {
        isImpersonating: true,
        impersonatedUser: null,
        endImpersonation: mockEndImpersonation,
      };
      const { container } = render(<ImpersonationBanner />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("when impersonating", () => {
    beforeEach(() => {
      mockImpersonationState = {
        isImpersonating: true,
        impersonatedUser: { first_name: "Jane", last_name: "Smith" },
        endImpersonation: mockEndImpersonation,
      };
    });

    it("renders banner when impersonating", () => {
      render(<ImpersonationBanner />);
      expect(screen.getByText(/impersonating/i)).toBeInTheDocument();
    });

    it("displays impersonated user name", () => {
      render(<ImpersonationBanner />);
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("renders eye icon", () => {
      const { container } = render(<ImpersonationBanner />);
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("renders end impersonation button", () => {
      render(<ImpersonationBanner />);
      expect(screen.getByRole("button", { name: /end impersonation/i })).toBeInTheDocument();
    });

    it("calls endImpersonation when button clicked", () => {
      render(<ImpersonationBanner />);
      const button = screen.getByRole("button", { name: /end impersonation/i });
      fireEvent.click(button);
      expect(mockEndImpersonation).toHaveBeenCalledTimes(1);
    });
  });

  describe("styling", () => {
    beforeEach(() => {
      mockImpersonationState = {
        isImpersonating: true,
        impersonatedUser: { first_name: "Jane", last_name: "Smith" },
        endImpersonation: mockEndImpersonation,
      };
    });

    it("has fixed positioning at top", () => {
      const { container } = render(<ImpersonationBanner />);
      const banner = container.firstChild;
      expect(banner).toHaveClass("fixed", "top-0", "left-0", "right-0");
    });

    it("has high z-index", () => {
      const { container } = render(<ImpersonationBanner />);
      const banner = container.firstChild;
      expect(banner).toHaveClass("z-[100]");
    });

    it("has amber background color", () => {
      const { container } = render(<ImpersonationBanner />);
      const banner = container.firstChild;
      expect(banner).toHaveClass("bg-amber-500");
    });

    it("has dark text color", () => {
      const { container } = render(<ImpersonationBanner />);
      const banner = container.firstChild;
      expect(banner).toHaveClass("text-amber-950");
    });

    it("content is centered", () => {
      const { container } = render(<ImpersonationBanner />);
      const content = container.querySelector(".flex.items-center.justify-center");
      expect(content).toBeInTheDocument();
    });

    it("end button has proper styling", () => {
      render(<ImpersonationBanner />);
      const button = screen.getByRole("button", { name: /end impersonation/i });
      expect(button).toHaveClass("bg-amber-950", "text-amber-100", "rounded-full");
    });

    it("end button has hover state", () => {
      render(<ImpersonationBanner />);
      const button = screen.getByRole("button", { name: /end impersonation/i });
      expect(button).toHaveClass("hover:bg-amber-900");
    });
  });

  describe("user name formatting", () => {
    it("displays full name", () => {
      mockImpersonationState = {
        isImpersonating: true,
        impersonatedUser: { first_name: "John", last_name: "Doe" },
        endImpersonation: mockEndImpersonation,
      };
      render(<ImpersonationBanner />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("user name is bold", () => {
      mockImpersonationState = {
        isImpersonating: true,
        impersonatedUser: { first_name: "Jane", last_name: "Smith" },
        endImpersonation: mockEndImpersonation,
      };
      render(<ImpersonationBanner />);
      const strong = screen.getByText("Jane Smith").closest("strong");
      expect(strong).toBeInTheDocument();
    });
  });
});
