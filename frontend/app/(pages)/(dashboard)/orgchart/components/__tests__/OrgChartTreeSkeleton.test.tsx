/**
 * Tests for orgchart/components/OrgChartTreeSkeleton.tsx
 * Loading skeleton components for org chart
 */

import React from "react";
import { render } from "@testing-library/react";
import { OrgChartTreeSkeleton, DraftsBannerSkeleton } from "../OrgChartTreeSkeleton";

describe("OrgChartTreeSkeleton", () => {
  describe("rendering", () => {
    it("renders the skeleton container", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("has animate-pulse class for loading animation", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      expect(container.firstChild).toHaveClass("animate-pulse");
    });

    it("has surface background and border", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      expect(container.firstChild).toHaveClass("bg-theme-surface", "border", "border-theme-border");
    });

    it("has overflow-x-auto for horizontal scrolling", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      expect(container.firstChild).toHaveClass("overflow-x-auto");
    });
  });

  describe("structure", () => {
    it("renders root node", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      // Root node has w-56 class
      const rootNode = container.querySelector(".w-56");
      expect(rootNode).toBeInTheDocument();
    });

    it("renders multiple child nodes", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      // Level 2 nodes have w-52 class
      const childNodes = container.querySelectorAll(".w-52");
      expect(childNodes.length).toBe(3);
    });

    it("renders small nodes for deeper levels", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      // Small nodes have w-44 class
      const smallNodes = container.querySelectorAll(".w-44");
      expect(smallNodes.length).toBeGreaterThan(0);
    });

    it("renders connector lines", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      // Vertical connector lines
      const verticalLines = container.querySelectorAll(".w-px");
      expect(verticalLines.length).toBeGreaterThan(0);

      // Horizontal connector lines
      const horizontalLines = container.querySelectorAll(".h-px");
      expect(horizontalLines.length).toBeGreaterThan(0);
    });
  });

  describe("node skeleton structure", () => {
    it("renders avatar placeholder in nodes", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      const avatars = container.querySelectorAll(".rounded-full");
      expect(avatars.length).toBeGreaterThan(0);
    });

    it("renders name placeholder in nodes", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      // Name placeholders have specific heights
      const namePlaceholders = container.querySelectorAll(".h-5, .h-4");
      expect(namePlaceholders.length).toBeGreaterThan(0);
    });

    it("root node has larger avatar", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      // Root avatar is 12x12 (w-12 h-12)
      const rootAvatar = container.querySelector(".w-12.h-12");
      expect(rootAvatar).toBeInTheDocument();
    });

    it("small nodes have smaller avatars", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      // Small avatars are 8x8 (w-8 h-8)
      const smallAvatars = container.querySelectorAll(".w-8.h-8");
      expect(smallAvatars.length).toBeGreaterThan(0);
    });
  });

  describe("layout", () => {
    it("has flex layout for centering", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      const flexContainer = container.querySelector(".flex.flex-col.items-center");
      expect(flexContainer).toBeInTheDocument();
    });

    it("has min-width for proper layout", () => {
      const { container } = render(<OrgChartTreeSkeleton />);
      const minWidthContainer = container.querySelector(".min-w-max");
      expect(minWidthContainer).toBeInTheDocument();
    });
  });
});

describe("DraftsBannerSkeleton", () => {
  describe("rendering", () => {
    it("renders the skeleton container", () => {
      const { container } = render(<DraftsBannerSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("has animate-pulse class for loading animation", () => {
      const { container } = render(<DraftsBannerSkeleton />);
      expect(container.firstChild).toHaveClass("animate-pulse");
    });

    it("has amber/warning background", () => {
      const { container } = render(<DraftsBannerSkeleton />);
      expect(container.firstChild).toHaveClass("bg-amber-900/20");
    });

    it("has amber border", () => {
      const { container } = render(<DraftsBannerSkeleton />);
      expect(container.firstChild).toHaveClass("border", "border-amber-500/30");
    });
  });

  describe("structure", () => {
    it("has flex layout with space-between", () => {
      const { container } = render(<DraftsBannerSkeleton />);
      const flexContainer = container.querySelector(".flex.items-center.justify-between");
      expect(flexContainer).toBeInTheDocument();
    });

    it("renders icon placeholder", () => {
      const { container } = render(<DraftsBannerSkeleton />);
      const iconPlaceholder = container.querySelector(".h-5.w-5");
      expect(iconPlaceholder).toBeInTheDocument();
    });

    it("renders text placeholder", () => {
      const { container } = render(<DraftsBannerSkeleton />);
      const textPlaceholder = container.querySelector(".h-5.w-48");
      expect(textPlaceholder).toBeInTheDocument();
    });

    it("renders button placeholders", () => {
      const { container } = render(<DraftsBannerSkeleton />);
      const buttonPlaceholders = container.querySelectorAll(".h-8");
      expect(buttonPlaceholders.length).toBe(2);
    });
  });

  describe("styling", () => {
    it("has padding", () => {
      const { container } = render(<DraftsBannerSkeleton />);
      expect(container.firstChild).toHaveClass("p-4");
    });

    it("placeholder elements have amber background", () => {
      const { container } = render(<DraftsBannerSkeleton />);
      const amberPlaceholders = container.querySelectorAll(".bg-amber-500\\/30");
      expect(amberPlaceholders.length).toBeGreaterThan(0);
    });
  });
});
