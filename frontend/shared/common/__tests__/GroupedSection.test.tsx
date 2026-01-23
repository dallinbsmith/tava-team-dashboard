/**
 * Tests for shared/common/GroupedSection.tsx
 * GroupedSection component for displaying grouped items with header
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import GroupedSection from "../GroupedSection";
import { Users, Clock } from "lucide-react";

describe("GroupedSection", () => {
  const defaultProps = {
    title: "Active Users",
    count: 5,
    children: <div data-testid="section-content">Section content</div>,
  };

  describe("rendering", () => {
    it("renders title", () => {
      render(<GroupedSection {...defaultProps} />);
      expect(screen.getByText("Active Users")).toBeInTheDocument();
    });

    it("renders title as h3 with proper styling", () => {
      render(<GroupedSection {...defaultProps} />);
      const title = screen.getByText("Active Users");
      expect(title.tagName).toBe("H3");
      expect(title).toHaveClass("font-semibold", "text-theme-text");
    });

    it("renders count", () => {
      render(<GroupedSection {...defaultProps} />);
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("count has badge styling", () => {
      render(<GroupedSection {...defaultProps} />);
      const count = screen.getByText("5");
      expect(count).toHaveClass(
        "px-2",
        "py-0.5",
        "text-xs",
        "font-medium",
        "rounded-full",
      );
    });

    it("renders children", () => {
      render(<GroupedSection {...defaultProps} />);
      expect(screen.getByTestId("section-content")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <GroupedSection {...defaultProps}>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </GroupedSection>,
      );
      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });
  });

  describe("icon", () => {
    it("does not render icon by default", () => {
      const { container } = render(<GroupedSection {...defaultProps} />);
      const header = container.querySelector(".px-6.py-3");
      const svgs = header?.querySelectorAll("svg");
      expect(svgs?.length).toBe(0);
    });

    it("renders icon when provided", () => {
      const { container } = render(
        <GroupedSection {...defaultProps} icon={Users} />,
      );
      const header = container.querySelector(".px-6.py-3");
      const svg = header?.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("icon has proper size", () => {
      const { container } = render(
        <GroupedSection {...defaultProps} icon={Users} />,
      );
      const header = container.querySelector(".px-6.py-3");
      const svg = header?.querySelector("svg");
      expect(svg).toHaveClass("w-4", "h-4");
    });

    it("uses default icon color when not specified", () => {
      const { container } = render(
        <GroupedSection {...defaultProps} icon={Users} />,
      );
      const header = container.querySelector(".px-6.py-3");
      const svg = header?.querySelector("svg");
      expect(svg).toHaveClass("text-theme-text-muted");
    });

    it("uses custom icon color when specified", () => {
      const { container } = render(
        <GroupedSection
          {...defaultProps}
          icon={Clock}
          iconColor="text-green-500"
        />,
      );
      const header = container.querySelector(".px-6.py-3");
      const svg = header?.querySelector("svg");
      expect(svg).toHaveClass("text-green-500");
    });
  });

  describe("indicator", () => {
    it("does not render indicator by default", () => {
      render(<GroupedSection {...defaultProps} />);
      expect(screen.queryByTestId("indicator")).not.toBeInTheDocument();
    });

    it("renders indicator when provided", () => {
      render(
        <GroupedSection
          {...defaultProps}
          indicator={<span data-testid="indicator">●</span>}
        />,
      );
      expect(screen.getByTestId("indicator")).toBeInTheDocument();
    });

    it("renders complex indicator element", () => {
      render(
        <GroupedSection
          {...defaultProps}
          indicator={
            <div
              data-testid="indicator"
              className="w-2 h-2 bg-green-500 rounded-full"
            />
          }
        />,
      );
      const indicator = screen.getByTestId("indicator");
      expect(indicator).toHaveClass("bg-green-500", "rounded-full");
    });
  });

  describe("structure", () => {
    it("has header with elevated background", () => {
      const { container } = render(<GroupedSection {...defaultProps} />);
      const header = container.querySelector(".bg-theme-elevated");
      expect(header).toBeInTheDocument();
    });

    it("header has flex layout with gap", () => {
      const { container } = render(<GroupedSection {...defaultProps} />);
      const header = container.querySelector(".px-6.py-3");
      expect(header).toHaveClass("flex", "items-center", "gap-2");
    });

    it("children are in divided container", () => {
      const { container } = render(<GroupedSection {...defaultProps} />);
      const childrenContainer = container.querySelector(".divide-y");
      expect(childrenContainer).toBeInTheDocument();
      expect(childrenContainer).toHaveClass("divide-theme-border/50");
    });
  });

  describe("count variations", () => {
    it("renders zero count", () => {
      render(<GroupedSection {...defaultProps} count={0} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("renders large count", () => {
      render(<GroupedSection {...defaultProps} count={999} />);
      expect(screen.getByText("999")).toBeInTheDocument();
    });
  });

  describe("title variations", () => {
    it("renders long title", () => {
      render(
        <GroupedSection
          {...defaultProps}
          title="Very Long Section Title That Might Wrap"
        />,
      );
      expect(
        screen.getByText("Very Long Section Title That Might Wrap"),
      ).toBeInTheDocument();
    });
  });
});
