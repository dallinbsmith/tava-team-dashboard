/**
 * Tests for shared/common/Avatar.tsx
 * Avatar component with image fallback chain
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Avatar from "../Avatar";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, onError, ...props }: {
    src: string;
    alt: string;
    onError?: () => void;
    [key: string]: unknown;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} {...props} data-testid="avatar-image" />
  ),
}));

describe("Avatar", () => {
  const defaultProps = {
    firstName: "John",
    lastName: "Doe",
  };

  describe("initials display", () => {
    it("shows initials when no avatar URLs provided", () => {
      render(<Avatar {...defaultProps} />);
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("shows uppercase initials", () => {
      render(<Avatar firstName="alice" lastName="smith" />);
      expect(screen.getByText("AS")).toBeInTheDocument();
    });

    it("shows initials in styled container", () => {
      render(<Avatar {...defaultProps} />);
      const initials = screen.getByText("JD");
      expect(initials).toHaveClass("font-bold", "text-white");
    });
  });

  describe("image display", () => {
    it("displays s3 avatar when provided", () => {
      render(<Avatar {...defaultProps} s3AvatarUrl="https://s3.example.com/avatar.jpg" />);
      const img = screen.getByTestId("avatar-image");
      expect(img).toHaveAttribute("src", "https://s3.example.com/avatar.jpg");
    });

    it("displays auth0 avatar when s3 not provided", () => {
      render(<Avatar {...defaultProps} auth0AvatarUrl="https://auth0.example.com/avatar.jpg" />);
      const img = screen.getByTestId("avatar-image");
      expect(img).toHaveAttribute("src", "https://auth0.example.com/avatar.jpg");
    });

    it("displays jira avatar when s3 and auth0 not provided", () => {
      render(<Avatar {...defaultProps} jiraAvatarUrl="https://jira.example.com/avatar.jpg" />);
      const img = screen.getByTestId("avatar-image");
      expect(img).toHaveAttribute("src", "https://jira.example.com/avatar.jpg");
    });

    it("prefers s3 over auth0 avatar", () => {
      render(
        <Avatar
          {...defaultProps}
          s3AvatarUrl="https://s3.example.com/avatar.jpg"
          auth0AvatarUrl="https://auth0.example.com/avatar.jpg"
        />
      );
      const img = screen.getByTestId("avatar-image");
      expect(img).toHaveAttribute("src", "https://s3.example.com/avatar.jpg");
    });

    it("has correct alt text", () => {
      render(<Avatar {...defaultProps} s3AvatarUrl="https://s3.example.com/avatar.jpg" />);
      const img = screen.getByTestId("avatar-image");
      expect(img).toHaveAttribute("alt", "John Doe");
    });
  });

  describe("image fallback chain", () => {
    it("falls back to auth0 when s3 fails", () => {
      render(
        <Avatar
          {...defaultProps}
          s3AvatarUrl="https://s3.example.com/avatar.jpg"
          auth0AvatarUrl="https://auth0.example.com/avatar.jpg"
        />
      );

      // Trigger error on s3 image
      const img = screen.getByTestId("avatar-image");
      fireEvent.error(img);

      // Should now show auth0 image
      expect(img).toHaveAttribute("src", "https://auth0.example.com/avatar.jpg");
    });

    it("falls back to jira when s3 and auth0 fail", () => {
      render(
        <Avatar
          {...defaultProps}
          s3AvatarUrl="https://s3.example.com/avatar.jpg"
          auth0AvatarUrl="https://auth0.example.com/avatar.jpg"
          jiraAvatarUrl="https://jira.example.com/avatar.jpg"
        />
      );

      const img = screen.getByTestId("avatar-image");

      // First error: s3 -> auth0
      fireEvent.error(img);
      expect(img).toHaveAttribute("src", "https://auth0.example.com/avatar.jpg");

      // Second error: auth0 -> jira
      fireEvent.error(img);
      expect(img).toHaveAttribute("src", "https://jira.example.com/avatar.jpg");
    });

    it("falls back to initials when all images fail", () => {
      render(
        <Avatar
          {...defaultProps}
          s3AvatarUrl="https://s3.example.com/avatar.jpg"
        />
      );

      const img = screen.getByTestId("avatar-image");
      fireEvent.error(img);

      // Should now show initials
      expect(screen.getByText("JD")).toBeInTheDocument();
    });
  });

  describe("sizes", () => {
    const sizes: Array<"xs" | "sm" | "md" | "lg" | "xl"> = ["xs", "sm", "md", "lg", "xl"];

    it.each(sizes)("renders %s size correctly", (size) => {
      const { container } = render(<Avatar {...defaultProps} size={size} />);
      const avatar = container.firstChild;

      const expectedClasses: Record<typeof size, string> = {
        xs: "w-6 h-6",
        sm: "w-8 h-8",
        md: "w-10 h-10",
        lg: "w-14 h-14",
        xl: "w-24 h-24",
      };

      expectedClasses[size].split(" ").forEach((cls) => {
        expect(avatar).toHaveClass(cls);
      });
    });

    it("defaults to md size", () => {
      const { container } = render(<Avatar {...defaultProps} />);
      const avatar = container.firstChild;
      expect(avatar).toHaveClass("w-10", "h-10");
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      const { container } = render(<Avatar {...defaultProps} className="my-custom-class" />);
      const avatar = container.firstChild;
      expect(avatar).toHaveClass("my-custom-class");
    });

    it("merges custom className with default classes", () => {
      const { container } = render(<Avatar {...defaultProps} className="my-custom-class" />);
      const avatar = container.firstChild;
      expect(avatar).toHaveClass("my-custom-class");
      expect(avatar).toHaveClass("rounded-full");
    });
  });

  describe("styling", () => {
    it("has rounded-full class", () => {
      const { container } = render(<Avatar {...defaultProps} />);
      const avatar = container.firstChild;
      expect(avatar).toHaveClass("rounded-full");
    });

    it("has flex-shrink-0 class", () => {
      const { container } = render(<Avatar {...defaultProps} />);
      const avatar = container.firstChild;
      expect(avatar).toHaveClass("flex-shrink-0");
    });

    it("has gradient background for initials", () => {
      const { container } = render(<Avatar {...defaultProps} />);
      const avatar = container.firstChild;
      expect(avatar).toHaveClass("bg-gradient-to-br");
    });
  });
});
