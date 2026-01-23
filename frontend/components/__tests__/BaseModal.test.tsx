/**
 * Tests for components/BaseModal.tsx
 * BaseModal and ConfirmModal components
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BaseModal, ConfirmModal } from "../BaseModal";

describe("BaseModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: "Test Modal",
    children: <div data-testid="modal-content">Modal Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset body overflow style
    document.body.style.overflow = "";
  });

  describe("rendering", () => {
    it("renders nothing when isOpen is false", () => {
      render(<BaseModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders modal when isOpen is true", () => {
      render(<BaseModal {...defaultProps} isOpen={true} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("renders title", () => {
      render(<BaseModal {...defaultProps} title="My Modal Title" />);
      expect(screen.getByText("My Modal Title")).toBeInTheDocument();
    });

    it("renders subtitle when provided", () => {
      render(<BaseModal {...defaultProps} subtitle="Modal Subtitle" />);
      expect(screen.getByText("Modal Subtitle")).toBeInTheDocument();
    });

    it("does not render subtitle when not provided", () => {
      render(<BaseModal {...defaultProps} />);
      expect(screen.queryByText("Modal Subtitle")).not.toBeInTheDocument();
    });

    it("renders children content", () => {
      render(<BaseModal {...defaultProps} />);
      expect(screen.getByTestId("modal-content")).toBeInTheDocument();
      expect(screen.getByText("Modal Content")).toBeInTheDocument();
    });

    it("renders footer when provided", () => {
      render(
        <BaseModal {...defaultProps} footer={<button data-testid="footer-button">Save</button>} />
      );
      expect(screen.getByTestId("footer-button")).toBeInTheDocument();
    });

    it("does not render footer section when not provided", () => {
      const { container } = render(<BaseModal {...defaultProps} />);
      // The footer div with border-t should not exist
      const footerSection = container.querySelector(".border-t.border-theme-border.px-6");
      expect(footerSection).not.toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("renders close button with aria-label", () => {
      render(<BaseModal {...defaultProps} />);
      const closeButton = screen.getByLabelText("Close modal");
      expect(closeButton).toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", () => {
      const onClose = jest.fn();
      render(<BaseModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByLabelText("Close modal"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("escape key handling", () => {
    it("calls onClose when Escape key is pressed (default behavior)", () => {
      const onClose = jest.fn();
      render(<BaseModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when closeOnEscape is true", () => {
      const onClose = jest.fn();
      render(<BaseModal {...defaultProps} onClose={onClose} closeOnEscape={true} />);

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose when closeOnEscape is false", () => {
      const onClose = jest.fn();
      render(<BaseModal {...defaultProps} onClose={onClose} closeOnEscape={false} />);

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
    });

    it("ignores other key presses", () => {
      const onClose = jest.fn();
      render(<BaseModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: "Enter" });
      fireEvent.keyDown(document, { key: "Tab" });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("backdrop click handling", () => {
    it("calls onClose when backdrop is clicked (default behavior)", () => {
      const onClose = jest.fn();
      const { container } = render(<BaseModal {...defaultProps} onClose={onClose} />);

      // Find backdrop (the fixed overlay)
      const backdrop = container.querySelector(".fixed.inset-0");
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when closeOnBackdropClick is true", () => {
      const onClose = jest.fn();
      const { container } = render(
        <BaseModal {...defaultProps} onClose={onClose} closeOnBackdropClick={true} />
      );

      const backdrop = container.querySelector(".fixed.inset-0");
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose when closeOnBackdropClick is false", () => {
      const onClose = jest.fn();
      const { container } = render(
        <BaseModal {...defaultProps} onClose={onClose} closeOnBackdropClick={false} />
      );

      const backdrop = container.querySelector(".fixed.inset-0");
      fireEvent.click(backdrop!);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("does not call onClose when modal content is clicked", () => {
      const onClose = jest.fn();
      render(<BaseModal {...defaultProps} onClose={onClose} />);

      // Click on the modal dialog itself
      const dialog = screen.getByRole("dialog");
      fireEvent.click(dialog);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("does not call onClose when children are clicked", () => {
      const onClose = jest.fn();
      render(<BaseModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByTestId("modal-content"));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("body scroll lock", () => {
    it("sets body overflow to hidden when modal opens", () => {
      render(<BaseModal {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("restores body overflow when modal closes", () => {
      const { rerender } = render(<BaseModal {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe("hidden");

      rerender(<BaseModal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe("");
    });

    it("restores body overflow on unmount", () => {
      const { unmount } = render(<BaseModal {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe("hidden");

      unmount();
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("maxWidth options", () => {
    const maxWidthOptions: Array<"max-w-sm" | "max-w-md" | "max-w-lg" | "max-w-xl" | "max-w-2xl"> =
      ["max-w-sm", "max-w-md", "max-w-lg", "max-w-xl", "max-w-2xl"];

    it.each(maxWidthOptions)("applies %s class when specified", (maxWidth) => {
      render(<BaseModal {...defaultProps} maxWidth={maxWidth} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass(maxWidth);
    });

    it("defaults to max-w-md", () => {
      render(<BaseModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("max-w-md");
    });
  });

  describe("custom className", () => {
    it("applies custom className to dialog", () => {
      render(<BaseModal {...defaultProps} className="custom-modal-class" />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("custom-modal-class");
    });

    it("merges custom className with default classes", () => {
      render(<BaseModal {...defaultProps} className="my-custom-class" />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("my-custom-class");
      expect(dialog).toHaveClass("bg-theme-surface");
    });
  });

  describe("accessibility", () => {
    it("has role=dialog", () => {
      render(<BaseModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has aria-modal=true", () => {
      render(<BaseModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("has aria-labelledby pointing to title", () => {
      render(<BaseModal {...defaultProps} title="Accessible Title" />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");

      // Verify title has the matching id
      const title = screen.getByText("Accessible Title");
      expect(title).toHaveAttribute("id", "modal-title");
    });

    it("close button has accessible name", () => {
      render(<BaseModal {...defaultProps} />);
      expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
    });
  });

  describe("event listener cleanup", () => {
    it("removes keydown listener when modal closes", () => {
      const onClose = jest.fn();
      const { rerender } = render(<BaseModal {...defaultProps} isOpen={true} onClose={onClose} />);

      // Close the modal
      rerender(<BaseModal {...defaultProps} isOpen={false} onClose={onClose} />);

      // Escape should no longer trigger onClose
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

describe("ConfirmModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: "Confirm Action",
    message: "Are you sure you want to proceed?",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = "";
  });

  describe("rendering", () => {
    it("renders using BaseModal", () => {
      render(<ConfirmModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("renders title", () => {
      render(<ConfirmModal {...defaultProps} title="Delete Item" />);
      expect(screen.getByText("Delete Item")).toBeInTheDocument();
    });

    it("renders string message", () => {
      render(<ConfirmModal {...defaultProps} message="This is a message" />);
      expect(screen.getByText("This is a message")).toBeInTheDocument();
    });

    it("renders ReactNode message", () => {
      render(
        <ConfirmModal
          {...defaultProps}
          message={
            <div data-testid="custom-message">
              <strong>Custom</strong> message
            </div>
          }
        />
      );
      expect(screen.getByTestId("custom-message")).toBeInTheDocument();
    });

    it("renders confirm and cancel buttons", () => {
      render(<ConfirmModal {...defaultProps} />);
      expect(screen.getByText("Confirm")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  describe("custom button text", () => {
    it("uses custom confirmText", () => {
      render(<ConfirmModal {...defaultProps} confirmText="Delete" />);
      expect(screen.getByText("Delete")).toBeInTheDocument();
      expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    });

    it("uses custom cancelText", () => {
      render(<ConfirmModal {...defaultProps} cancelText="Go Back" />);
      expect(screen.getByText("Go Back")).toBeInTheDocument();
      expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    });
  });

  describe("callbacks", () => {
    it("calls onClose when cancel button is clicked", () => {
      const onClose = jest.fn();
      render(<ConfirmModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText("Cancel"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onConfirm when confirm button is clicked", async () => {
      const onConfirm = jest.fn();
      render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText("Confirm"));
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it("handles async onConfirm", async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText("Confirm"));
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("loading state", () => {
    it("shows 'Processing...' text when isLoading is true", () => {
      render(<ConfirmModal {...defaultProps} isLoading={true} />);
      expect(screen.getByText("Processing...")).toBeInTheDocument();
      expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    });

    it("disables confirm button when isLoading is true", () => {
      render(<ConfirmModal {...defaultProps} isLoading={true} />);
      expect(screen.getByText("Processing...")).toBeDisabled();
    });

    it("disables cancel button when isLoading is true", () => {
      render(<ConfirmModal {...defaultProps} isLoading={true} />);
      expect(screen.getByText("Cancel")).toBeDisabled();
    });

    it("shows confirmText when isLoading is false", () => {
      render(<ConfirmModal {...defaultProps} isLoading={false} confirmText="Delete" />);
      expect(screen.getByText("Delete")).toBeInTheDocument();
      expect(screen.queryByText("Processing...")).not.toBeInTheDocument();
    });
  });

  describe("confirm variant styling", () => {
    it("uses primary styling by default", () => {
      render(<ConfirmModal {...defaultProps} />);
      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toHaveClass("bg-primary-600");
      expect(confirmButton).toHaveClass("hover:bg-primary-700");
    });

    it("uses primary styling when variant is primary", () => {
      render(<ConfirmModal {...defaultProps} variant="primary" />);
      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toHaveClass("bg-primary-600");
    });

    it("uses danger styling when variant is danger", () => {
      render(<ConfirmModal {...defaultProps} variant="danger" />);
      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toHaveClass("bg-red-600");
      expect(confirmButton).toHaveClass("hover:bg-red-700");
    });
  });

  describe("modal configuration", () => {
    it("uses max-w-sm for width", () => {
      render(<ConfirmModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("max-w-sm");
    });
  });

  describe("integration with BaseModal", () => {
    it("closes on Escape key", () => {
      const onClose = jest.fn();
      render(<ConfirmModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalled();
    });

    it("renders nothing when isOpen is false", () => {
      render(<ConfirmModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
