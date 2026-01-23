/**
 * Tests for components/ui/LoadingSpinner.tsx
 * LoadingSpinner, CenteredSpinner, FullPageSpinner, Skeleton, SkeletonCard
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  LoadingSpinner,
  CenteredSpinner,
  FullPageSpinner,
  Skeleton,
  SkeletonCard,
} from "../LoadingSpinner";

describe("LoadingSpinner", () => {
  describe("rendering", () => {
    it("renders spinner element", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector("svg");
      expect(spinner).toBeInTheDocument();
    });

    it("has animate-spin class", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector("svg");
      expect(spinner).toHaveClass("animate-spin");
    });

    it("has primary color", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector("svg");
      expect(spinner).toHaveClass("text-primary-600");
    });
  });

  describe("sizes", () => {
    it("defaults to md size", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector("svg");
      expect(spinner).toHaveClass("w-6", "h-6");
    });

    it("renders sm size", () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      const spinner = container.querySelector("svg");
      expect(spinner).toHaveClass("w-4", "h-4");
    });

    it("renders md size", () => {
      const { container } = render(<LoadingSpinner size="md" />);
      const spinner = container.querySelector("svg");
      expect(spinner).toHaveClass("w-6", "h-6");
    });

    it("renders lg size", () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      const spinner = container.querySelector("svg");
      expect(spinner).toHaveClass("w-8", "h-8");
    });

    it("renders xl size", () => {
      const { container } = render(<LoadingSpinner size="xl" />);
      const spinner = container.querySelector("svg");
      expect(spinner).toHaveClass("w-12", "h-12");
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      const { container } = render(
        <LoadingSpinner className="my-custom-class" />,
      );
      const spinner = container.querySelector("svg");
      expect(spinner).toHaveClass("my-custom-class");
    });

    it("merges custom className with default classes", () => {
      const { container } = render(
        <LoadingSpinner className="my-custom-class" />,
      );
      const spinner = container.querySelector("svg");
      expect(spinner).toHaveClass(
        "animate-spin",
        "text-primary-600",
        "my-custom-class",
      );
    });
  });
});

describe("CenteredSpinner", () => {
  describe("rendering", () => {
    it("renders spinner", () => {
      const { container } = render(<CenteredSpinner />);
      const spinner = container.querySelector("svg");
      expect(spinner).toBeInTheDocument();
    });

    it("renders centered container", () => {
      const { container } = render(<CenteredSpinner />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass(
        "flex",
        "flex-col",
        "items-center",
        "justify-center",
      );
    });

    it("has vertical padding", () => {
      const { container } = render(<CenteredSpinner />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("py-12");
    });
  });

  describe("size", () => {
    it("defaults to lg size", () => {
      const { container } = render(<CenteredSpinner />);
      const spinner = container.querySelector("svg");
      expect(spinner).toHaveClass("w-8", "h-8");
    });

    it("accepts custom size", () => {
      const { container } = render(<CenteredSpinner size="sm" />);
      const spinner = container.querySelector("svg");
      expect(spinner).toHaveClass("w-4", "h-4");
    });
  });

  describe("text", () => {
    it("renders text when provided", () => {
      render(<CenteredSpinner text="Loading..." />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("text has proper styling", () => {
      render(<CenteredSpinner text="Loading..." />);
      const text = screen.getByText("Loading...");
      expect(text).toHaveClass("mt-3", "text-sm", "text-theme-text-muted");
    });

    it("does not render text when not provided", () => {
      const { container } = render(<CenteredSpinner />);
      const text = container.querySelector("p");
      expect(text).not.toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("applies custom className to wrapper", () => {
      const { container } = render(
        <CenteredSpinner className="my-custom-class" />,
      );
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("my-custom-class");
    });
  });
});

describe("FullPageSpinner", () => {
  describe("rendering", () => {
    it("renders spinner", () => {
      const { container } = render(<FullPageSpinner />);
      const spinner = container.querySelector("svg");
      expect(spinner).toBeInTheDocument();
    });

    it("has full page layout", () => {
      const { container } = render(<FullPageSpinner />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass(
        "min-h-screen",
        "flex",
        "flex-col",
        "items-center",
        "justify-center",
      );
    });
  });

  describe("size", () => {
    it("defaults to xl size", () => {
      const { container } = render(<FullPageSpinner />);
      const spinner = container.querySelector("svg");
      expect(spinner).toHaveClass("w-12", "h-12");
    });

    it("accepts custom size", () => {
      const { container } = render(<FullPageSpinner size="md" />);
      const spinner = container.querySelector("svg");
      expect(spinner).toHaveClass("w-6", "h-6");
    });
  });

  describe("text", () => {
    it("renders text when provided", () => {
      render(<FullPageSpinner text="Loading application..." />);
      expect(screen.getByText("Loading application...")).toBeInTheDocument();
    });

    it("text has proper styling", () => {
      render(<FullPageSpinner text="Loading..." />);
      const text = screen.getByText("Loading...");
      expect(text).toHaveClass("mt-4", "text-theme-text-muted");
    });

    it("does not render text when not provided", () => {
      const { container } = render(<FullPageSpinner />);
      const text = container.querySelector("p");
      expect(text).not.toBeInTheDocument();
    });
  });
});

describe("Skeleton", () => {
  describe("rendering", () => {
    it("renders skeleton element", () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("has animate-pulse class", () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toHaveClass("animate-pulse");
    });

    it("has background color", () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toHaveClass("bg-theme-border");
    });
  });

  describe("dimensions", () => {
    it("defaults to full width", () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toHaveClass("w-full");
    });

    it("defaults to h-4 height", () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toHaveClass("h-4");
    });

    it("accepts custom width", () => {
      const { container } = render(<Skeleton width="w-1/2" />);
      expect(container.firstChild).toHaveClass("w-1/2");
    });

    it("accepts custom height", () => {
      const { container } = render(<Skeleton height="h-8" />);
      expect(container.firstChild).toHaveClass("h-8");
    });
  });

  describe("shape", () => {
    it("defaults to rounded corners", () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toHaveClass("rounded");
      expect(container.firstChild).not.toHaveClass("rounded-full");
    });

    it("renders circle when circle prop is true", () => {
      const { container } = render(<Skeleton circle />);
      expect(container.firstChild).toHaveClass("rounded-full");
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      const { container } = render(<Skeleton className="my-custom-class" />);
      expect(container.firstChild).toHaveClass("my-custom-class");
    });

    it("merges custom className with default classes", () => {
      const { container } = render(<Skeleton className="my-custom-class" />);
      expect(container.firstChild).toHaveClass(
        "animate-pulse",
        "bg-theme-border",
        "my-custom-class",
      );
    });
  });
});

describe("SkeletonCard", () => {
  describe("rendering", () => {
    it("renders skeleton card", () => {
      const { container } = render(<SkeletonCard />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("has card styling", () => {
      const { container } = render(<SkeletonCard />);
      expect(container.firstChild).toHaveClass(
        "bg-theme-surface",
        "border",
        "border-theme-border",
        "p-4",
        "rounded-lg",
      );
    });

    it("renders avatar skeleton", () => {
      const { container } = render(<SkeletonCard />);
      const circles = container.querySelectorAll(".rounded-full");
      expect(circles.length).toBeGreaterThan(0);
    });

    it("renders multiple skeleton lines", () => {
      const { container } = render(<SkeletonCard />);
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(2);
    });
  });

  describe("structure", () => {
    it("has header with avatar and text", () => {
      const { container } = render(<SkeletonCard />);
      const header = container.querySelector(".flex.items-start.gap-3");
      expect(header).toBeInTheDocument();
    });

    it("has content section with lines", () => {
      const { container } = render(<SkeletonCard />);
      const content = container.querySelector(".mt-4.space-y-2");
      expect(content).toBeInTheDocument();
    });

    it("avatar skeleton is circle shaped", () => {
      const { container } = render(<SkeletonCard />);
      const avatar = container.querySelector(".rounded-full.w-10.h-10");
      expect(avatar).toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      const { container } = render(
        <SkeletonCard className="my-custom-class" />,
      );
      expect(container.firstChild).toHaveClass("my-custom-class");
    });

    it("merges custom className with default classes", () => {
      const { container } = render(
        <SkeletonCard className="my-custom-class" />,
      );
      expect(container.firstChild).toHaveClass(
        "bg-theme-surface",
        "my-custom-class",
      );
    });
  });
});
