/**
 * Tests for components/ui/Button.tsx
 * Button and IconButton components
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Plus, ChevronRight, Settings } from "lucide-react";
import { Button, IconButton, ButtonVariant, ButtonSize } from "../Button";

describe("Button", () => {
  describe("rendering", () => {
    it("renders children text", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
    });

    it("renders as a button element", () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("applies default variant and size classes", () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole("button");

      // Default is primary variant
      expect(button).toHaveClass("bg-primary-600");
      // Default is md size
      expect(button).toHaveClass("px-4", "py-2");
    });
  });

  describe("variants", () => {
    const variants: ButtonVariant[] = ["primary", "secondary", "danger", "ghost", "success"];

    it.each(variants)("renders %s variant with correct classes", (variant) => {
      render(<Button variant={variant}>Button</Button>);
      const button = screen.getByRole("button");

      const variantClasses: Record<ButtonVariant, string[]> = {
        primary: ["bg-primary-600"],
        secondary: ["bg-theme-elevated", "border"],
        danger: ["bg-red-600"],
        ghost: ["hover:bg-theme-elevated"],
        success: ["bg-emerald-600"],
      };

      variantClasses[variant].forEach((cls) => {
        expect(button.className).toContain(cls);
      });
    });
  });

  describe("sizes", () => {
    const sizes: ButtonSize[] = ["sm", "md", "lg"];

    it.each(sizes)("renders %s size with correct padding", (size) => {
      render(<Button size={size}>Button</Button>);
      const button = screen.getByRole("button");

      const sizeClasses: Record<ButtonSize, string[]> = {
        sm: ["px-3", "py-1.5"],
        md: ["px-4", "py-2"],
        lg: ["px-6", "py-3"],
      };

      sizeClasses[size].forEach((cls) => {
        expect(button).toHaveClass(cls);
      });
    });
  });

  describe("loading state", () => {
    it("shows loading spinner when loading is true", () => {
      render(<Button loading>Submit</Button>);

      // The Loader2 icon should be present (has animate-spin class)
      const button = screen.getByRole("button");
      const spinner = button.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("disables button when loading", () => {
      render(<Button loading>Submit</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("hides regular icon when loading", () => {
      render(
        <Button loading icon={Plus}>
          Add Item
        </Button>
      );

      const button = screen.getByRole("button");
      // Should have spinner, not Plus icon
      const spinner = button.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("still shows children text when loading", () => {
      render(<Button loading>Saving...</Button>);
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("is disabled when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("applies disabled styles", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("disabled:opacity-50", "disabled:cursor-not-allowed");
    });

    it("is disabled when both disabled and loading are true", () => {
      render(
        <Button disabled loading>
          Submit
        </Button>
      );
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("icons", () => {
    it("renders icon before text", () => {
      render(<Button icon={Plus}>Add</Button>);

      const button = screen.getByRole("button");
      // Icon should be rendered (SVG element)
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders icon after text with iconAfter prop", () => {
      render(<Button iconAfter={ChevronRight}>Next</Button>);

      const button = screen.getByRole("button");
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders both icons when both props provided", () => {
      render(
        <Button icon={Plus} iconAfter={ChevronRight}>
          Action
        </Button>
      );

      const button = screen.getByRole("button");
      const svgs = button.querySelectorAll("svg");
      expect(svgs).toHaveLength(2);
    });

    it("hides iconAfter when loading", () => {
      render(
        <Button loading iconAfter={ChevronRight}>
          Loading
        </Button>
      );

      const button = screen.getByRole("button");
      // Should only have spinner icon
      const svgs = button.querySelectorAll("svg");
      expect(svgs).toHaveLength(1);
      expect(svgs[0]).toHaveClass("animate-spin");
    });

    it("applies correct icon size for each button size", () => {
      const { rerender } = render(
        <Button size="sm" icon={Plus}>
          Small
        </Button>
      );

      let svg = screen.getByRole("button").querySelector("svg");
      expect(svg).toHaveClass("w-3.5", "h-3.5");

      rerender(
        <Button size="md" icon={Plus}>
          Medium
        </Button>
      );
      svg = screen.getByRole("button").querySelector("svg");
      expect(svg).toHaveClass("w-4", "h-4");

      rerender(
        <Button size="lg" icon={Plus}>
          Large
        </Button>
      );
      svg = screen.getByRole("button").querySelector("svg");
      expect(svg).toHaveClass("w-5", "h-5");
    });
  });

  describe("fullWidth", () => {
    it("applies w-full class when fullWidth is true", () => {
      render(<Button fullWidth>Full Width</Button>);
      expect(screen.getByRole("button")).toHaveClass("w-full");
    });

    it("does not apply w-full by default", () => {
      render(<Button>Normal</Button>);
      expect(screen.getByRole("button")).not.toHaveClass("w-full");
    });
  });

  describe("event handling", () => {
    it("calls onClick when clicked", () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when disabled", () => {
      const handleClick = jest.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("does not call onClick when loading", () => {
      const handleClick = jest.fn();
      render(
        <Button loading onClick={handleClick}>
          Loading
        </Button>
      );

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("custom className", () => {
    it("merges custom className with default classes", () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("custom-class");
      // Should still have base classes
      expect(button).toHaveClass("inline-flex", "items-center");
    });
  });

  describe("HTML attributes", () => {
    it("passes through type attribute", () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
    });

    it("passes through aria attributes", () => {
      render(<Button aria-label="Close dialog">X</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Close dialog");
    });

    it("passes through data attributes", () => {
      render(<Button data-testid="my-button">Test</Button>);
      expect(screen.getByTestId("my-button")).toBeInTheDocument();
    });
  });

  describe("ref forwarding", () => {
    it("forwards ref to button element", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.tagName).toBe("BUTTON");
    });
  });
});

describe("IconButton", () => {
  describe("rendering", () => {
    it("renders with icon", () => {
      render(<IconButton icon={Settings} aria-label="Settings" />);

      const button = screen.getByRole("button", { name: "Settings" });
      expect(button).toBeInTheDocument();
      expect(button.querySelector("svg")).toBeInTheDocument();
    });

    it("requires aria-label prop", () => {
      // This test verifies the component is accessible
      render(<IconButton icon={Plus} aria-label="Add item" />);
      expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Add item");
    });
  });

  describe("variants", () => {
    it("defaults to ghost variant", () => {
      render(<IconButton icon={Settings} aria-label="Settings" />);
      const button = screen.getByRole("button");

      // Ghost variant has hover:bg-theme-elevated
      expect(button.className).toContain("hover:bg-theme-elevated");
    });

    it("supports other variants", () => {
      render(<IconButton icon={Settings} aria-label="Settings" variant="primary" />);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("bg-primary-600");
    });
  });

  describe("sizes", () => {
    it("applies correct padding for each size", () => {
      const { rerender } = render(
        <IconButton icon={Settings} aria-label="Settings" size="sm" />
      );
      expect(screen.getByRole("button")).toHaveClass("p-1");

      rerender(<IconButton icon={Settings} aria-label="Settings" size="md" />);
      expect(screen.getByRole("button")).toHaveClass("p-1.5");

      rerender(<IconButton icon={Settings} aria-label="Settings" size="lg" />);
      expect(screen.getByRole("button")).toHaveClass("p-2");
    });
  });

  describe("event handling", () => {
    it("calls onClick when clicked", () => {
      const handleClick = jest.fn();
      render(
        <IconButton icon={Settings} aria-label="Settings" onClick={handleClick} />
      );

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("ref forwarding", () => {
    it("forwards ref to button element", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<IconButton ref={ref} icon={Settings} aria-label="Settings" />);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });
});
