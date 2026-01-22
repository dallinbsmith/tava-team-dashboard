/**
 * Tests for shared/common/ConfirmationModal.tsx
 * Confirmation modal with variants and accessibility
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmationModal from "../ConfirmationModal";

describe("ConfirmationModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: "Confirm Action",
    message: "Are you sure you want to proceed?",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders when isOpen is true", () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<ConfirmationModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders title", () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByText("Confirm Action")).toBeInTheDocument();
    });

    it("renders message", () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByText("Are you sure you want to proceed?")).toBeInTheDocument();
    });

    it("renders default confirm button text", () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    });

    it("renders default cancel button text", () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("renders custom confirm button text", () => {
      render(<ConfirmationModal {...defaultProps} confirmText="Delete" />);
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });

    it("renders custom cancel button text", () => {
      render(<ConfirmationModal {...defaultProps} cancelText="Go Back" />);
      expect(screen.getByRole("button", { name: "Go Back" })).toBeInTheDocument();
    });

    it("renders close button", () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByLabelText("Close dialog")).toBeInTheDocument();
    });

    it("renders alert icon by default", () => {
      const { container } = render(<ConfirmationModal {...defaultProps} />);
      const iconContainer = container.querySelector(".w-10.h-10");
      expect(iconContainer).toBeInTheDocument();
    });

    it("renders custom icon when iconUrl provided", () => {
      const { container } = render(<ConfirmationModal {...defaultProps} iconUrl="https://example.com/icon.png" />);
      const img = container.querySelector("img");
      expect(img).toHaveAttribute("src", "https://example.com/icon.png");
    });
  });

  describe("variants", () => {
    it("defaults to danger variant", () => {
      const { container } = render(<ConfirmationModal {...defaultProps} />);
      const iconContainer = container.querySelector(".bg-red-900\\/40");
      expect(iconContainer).toBeInTheDocument();
    });

    it("renders danger variant correctly", () => {
      const { container } = render(<ConfirmationModal {...defaultProps} variant="danger" />);
      const iconContainer = container.querySelector(".bg-red-900\\/40");
      expect(iconContainer).toBeInTheDocument();

      const confirmButton = screen.getByRole("button", { name: "Confirm" });
      expect(confirmButton).toHaveClass("bg-red-600");
    });

    it("renders warning variant correctly", () => {
      const { container } = render(<ConfirmationModal {...defaultProps} variant="warning" />);
      const iconContainer = container.querySelector(".bg-yellow-900\\/40");
      expect(iconContainer).toBeInTheDocument();

      const confirmButton = screen.getByRole("button", { name: "Confirm" });
      expect(confirmButton).toHaveClass("bg-yellow-600");
    });

    it("renders info variant correctly", () => {
      const { container } = render(<ConfirmationModal {...defaultProps} variant="info" />);
      const iconContainer = container.querySelector(".bg-blue-900\\/40");
      expect(iconContainer).toBeInTheDocument();

      const confirmButton = screen.getByRole("button", { name: "Confirm" });
      expect(confirmButton).toHaveClass("bg-blue-600");
    });
  });

  describe("interactions", () => {
    it("calls onClose when cancel button clicked", () => {
      const onClose = jest.fn();
      render(<ConfirmationModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onConfirm when confirm button clicked", () => {
      const onConfirm = jest.fn();
      render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when close button clicked", () => {
      const onClose = jest.fn();
      render(<ConfirmationModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByLabelText("Close dialog"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when backdrop clicked", () => {
      const onClose = jest.fn();
      const { container } = render(<ConfirmationModal {...defaultProps} onClose={onClose} />);

      const backdrop = container.querySelector(".absolute.inset-0.bg-black\\/50");
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Escape key pressed", () => {
      const onClose = jest.fn();
      render(<ConfirmationModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("loading state", () => {
    it("shows 'Processing...' when loading", () => {
      render(<ConfirmationModal {...defaultProps} loading />);
      expect(screen.getByRole("button", { name: "Processing..." })).toBeInTheDocument();
    });

    it("disables confirm button when loading", () => {
      render(<ConfirmationModal {...defaultProps} loading />);
      expect(screen.getByRole("button", { name: "Processing..." })).toBeDisabled();
    });

    it("disables cancel button when loading", () => {
      render(<ConfirmationModal {...defaultProps} loading />);
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });

    it("disables close button when loading", () => {
      render(<ConfirmationModal {...defaultProps} loading />);
      expect(screen.getByLabelText("Close dialog")).toBeDisabled();
    });

    it("does not close on Escape when loading", () => {
      const onClose = jest.fn();
      render(<ConfirmationModal {...defaultProps} loading onClose={onClose} />);

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
    });

    it("does not close on backdrop click when loading", () => {
      const onClose = jest.fn();
      const { container } = render(<ConfirmationModal {...defaultProps} loading onClose={onClose} />);

      const backdrop = container.querySelector(".absolute.inset-0.bg-black\\/50");
      fireEvent.click(backdrop!);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("has role='dialog'", () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has aria-modal='true'", () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("has aria-labelledby pointing to title", () => {
      render(<ConfirmationModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "confirmation-modal-title");
    });

    it("has aria-describedby pointing to message", () => {
      render(<ConfirmationModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-describedby", "confirmation-modal-description");
    });

    it("title has correct id", () => {
      render(<ConfirmationModal {...defaultProps} />);
      const title = screen.getByText("Confirm Action");
      expect(title).toHaveAttribute("id", "confirmation-modal-title");
    });

    it("message has correct id", () => {
      render(<ConfirmationModal {...defaultProps} />);
      const message = screen.getByText("Are you sure you want to proceed?");
      expect(message).toHaveAttribute("id", "confirmation-modal-description");
    });

    it("close button has aria-label", () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByLabelText("Close dialog")).toBeInTheDocument();
    });

    it("icon container is hidden from screen readers", () => {
      const { container } = render(<ConfirmationModal {...defaultProps} />);
      const iconContainer = container.querySelector("[aria-hidden='true']");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("focus management", () => {
    it("focuses cancel button when opened", () => {
      render(<ConfirmationModal {...defaultProps} />);
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      expect(document.activeElement).toBe(cancelButton);
    });
  });

  describe("z-index", () => {
    it("uses default z-index class", () => {
      const { container } = render(<ConfirmationModal {...defaultProps} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("z-50");
    });

    it("uses custom z-index class when provided", () => {
      const { container } = render(<ConfirmationModal {...defaultProps} zIndexClass="z-[100]" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("z-[100]");
    });
  });

  describe("styling", () => {
    it("has fixed positioning", () => {
      const { container } = render(<ConfirmationModal {...defaultProps} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("fixed", "inset-0");
    });

    it("has centered content", () => {
      const { container } = render(<ConfirmationModal {...defaultProps} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("flex", "items-center", "justify-center");
    });

    it("dialog has max width", () => {
      render(<ConfirmationModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("max-w-md");
    });

    it("dialog has surface background", () => {
      render(<ConfirmationModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("bg-theme-surface");
    });

    it("buttons section has border top", () => {
      const { container } = render(<ConfirmationModal {...defaultProps} />);
      const buttonSection = container.querySelector(".border-t.border-theme-border");
      expect(buttonSection).toBeInTheDocument();
    });

    it("confirm button has hover state", () => {
      render(<ConfirmationModal {...defaultProps} />);
      const confirmButton = screen.getByRole("button", { name: "Confirm" });
      expect(confirmButton).toHaveClass("hover:bg-red-700");
    });
  });
});
