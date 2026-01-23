/**
 * Tests for components/ui/FormField.tsx
 * FormField, InputField, TextareaField, and SelectField components
 */

import React, { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  FormField,
  InputField,
  TextareaField,
  SelectField,
} from "../FormField";

describe("FormField", () => {
  const defaultProps = {
    label: "Field Label",
    id: "test-field",
  };

  describe("rendering", () => {
    it("renders label", () => {
      render(<FormField {...defaultProps} />);
      expect(screen.getByText("Field Label")).toBeInTheDocument();
    });

    it("renders label with htmlFor attribute", () => {
      render(<FormField {...defaultProps} />);
      const label = screen.getByText("Field Label");
      expect(label).toHaveAttribute("for", "test-field");
    });

    it("renders children", () => {
      render(
        <FormField {...defaultProps}>
          <input type="text" id="test-field" />
        </FormField>,
      );
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  describe("required indicator", () => {
    it("shows asterisk when required", () => {
      render(<FormField {...defaultProps} required />);
      expect(screen.getByText(/Field Label/)).toHaveTextContent(
        "Field Label *",
      );
    });

    it("does not show asterisk when not required", () => {
      render(<FormField {...defaultProps} />);
      expect(screen.getByText("Field Label")).not.toHaveTextContent("*");
    });
  });

  describe("error message", () => {
    it("renders error message when provided", () => {
      render(<FormField {...defaultProps} error="This field is required" />);
      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    it("error message has red styling", () => {
      render(<FormField {...defaultProps} error="Error message" />);
      const error = screen.getByText("Error message");
      expect(error).toHaveClass("text-sm", "text-red-400");
    });

    it("does not render error message when not provided", () => {
      render(<FormField {...defaultProps} />);
      const error = screen.queryByText(/required/);
      expect(error).not.toBeInTheDocument();
    });
  });

  describe("helper text", () => {
    it("renders helper text when provided", () => {
      render(<FormField {...defaultProps} helperText="Enter your name" />);
      expect(screen.getByText("Enter your name")).toBeInTheDocument();
    });

    it("helper text has muted styling", () => {
      render(<FormField {...defaultProps} helperText="Helper text" />);
      const helper = screen.getByText("Helper text");
      expect(helper).toHaveClass("text-sm", "text-theme-text-muted");
    });

    it("does not render helper text when error is present", () => {
      render(<FormField {...defaultProps} error="Error" helperText="Helper" />);
      expect(screen.queryByText("Helper")).not.toBeInTheDocument();
      expect(screen.getByText("Error")).toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("applies custom className to wrapper", () => {
      const { container } = render(
        <FormField {...defaultProps} className="my-custom-class" />,
      );
      expect(container.firstChild).toHaveClass("my-custom-class");
    });
  });

  describe("label styling", () => {
    it("label has proper styling", () => {
      render(<FormField {...defaultProps} />);
      const label = screen.getByText("Field Label");
      expect(label).toHaveClass(
        "block",
        "text-sm",
        "font-medium",
        "text-theme-text",
        "mb-1",
      );
    });
  });
});

describe("InputField", () => {
  const defaultProps = {
    label: "Username",
  };

  describe("rendering", () => {
    it("renders input element", () => {
      render(<InputField {...defaultProps} />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("renders label", () => {
      render(<InputField {...defaultProps} />);
      expect(screen.getByText("Username")).toBeInTheDocument();
    });

    it("generates id from label when not provided", () => {
      render(<InputField {...defaultProps} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("id", "input-username");
    });

    it("uses provided id", () => {
      render(<InputField {...defaultProps} id="custom-id" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("id", "custom-id");
    });

    it("handles label with spaces correctly", () => {
      render(<InputField label="First Name" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("id", "input-first-name");
    });
  });

  describe("input types", () => {
    it("defaults to text type", () => {
      render(<InputField {...defaultProps} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "text");
    });

    it("renders email type", () => {
      render(<InputField {...defaultProps} type="email" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "email");
    });

    it("renders password type", () => {
      render(<InputField {...defaultProps} type="password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it("renders date type", () => {
      render(<InputField {...defaultProps} type="date" />);
      const input = document.querySelector('input[type="date"]');
      expect(input).toBeInTheDocument();
    });

    it("renders number type", () => {
      render(<InputField {...defaultProps} type="number" />);
      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("type", "number");
    });
  });

  describe("ref forwarding", () => {
    it("forwards ref to input element", () => {
      const ref = createRef<HTMLInputElement>();
      render(<InputField {...defaultProps} ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it("ref allows focusing input", () => {
      const ref = createRef<HTMLInputElement>();
      render(<InputField {...defaultProps} ref={ref} />);
      ref.current?.focus();
      expect(document.activeElement).toBe(ref.current);
    });
  });

  describe("error state", () => {
    it("shows error message", () => {
      render(<InputField {...defaultProps} error="Username is required" />);
      expect(screen.getByText("Username is required")).toBeInTheDocument();
    });

    it("adds border-red-500 class when error", () => {
      render(<InputField {...defaultProps} error="Error" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-red-500");
    });

    it("sets aria-invalid when error", () => {
      render(<InputField {...defaultProps} error="Error" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("does not have border-red-500 without error", () => {
      render(<InputField {...defaultProps} />);
      const input = screen.getByRole("textbox");
      expect(input).not.toHaveClass("border-red-500");
    });
  });

  describe("input props", () => {
    it("passes placeholder", () => {
      render(<InputField {...defaultProps} placeholder="Enter username" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("placeholder", "Enter username");
    });

    it("passes disabled", () => {
      render(<InputField {...defaultProps} disabled />);
      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });

    it("passes value and onChange", () => {
      const onChange = jest.fn();
      render(<InputField {...defaultProps} value="test" onChange={onChange} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("test");

      fireEvent.change(input, { target: { value: "new value" } });
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("styling", () => {
    it("has base input styling", () => {
      render(<InputField {...defaultProps} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass(
        "w-full",
        "px-3",
        "py-2",
        "border",
        "border-theme-border",
        "bg-theme-elevated",
        "text-theme-text",
        "rounded",
      );
    });

    it("has focus styling classes", () => {
      render(<InputField {...defaultProps} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass(
        "focus:outline-none",
        "focus:ring-2",
        "focus:ring-primary-500",
      );
    });

    it("has disabled styling classes", () => {
      render(<InputField {...defaultProps} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass(
        "disabled:opacity-50",
        "disabled:cursor-not-allowed",
      );
    });
  });
});

describe("TextareaField", () => {
  const defaultProps = {
    label: "Description",
  };

  describe("rendering", () => {
    it("renders textarea element", () => {
      render(<TextareaField {...defaultProps} />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("renders label", () => {
      render(<TextareaField {...defaultProps} />);
      expect(screen.getByText("Description")).toBeInTheDocument();
    });

    it("generates id from label when not provided", () => {
      render(<TextareaField {...defaultProps} />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("id", "textarea-description");
    });

    it("uses provided id", () => {
      render(<TextareaField {...defaultProps} id="custom-id" />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("id", "custom-id");
    });
  });

  describe("rows prop", () => {
    it("defaults to 3 rows", () => {
      render(<TextareaField {...defaultProps} />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("rows", "3");
    });

    it("uses custom rows value", () => {
      render(<TextareaField {...defaultProps} rows={5} />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("rows", "5");
    });
  });

  describe("ref forwarding", () => {
    it("forwards ref to textarea element", () => {
      const ref = createRef<HTMLTextAreaElement>();
      render(<TextareaField {...defaultProps} ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });
  });

  describe("error state", () => {
    it("shows error message", () => {
      render(
        <TextareaField {...defaultProps} error="Description is required" />,
      );
      expect(screen.getByText("Description is required")).toBeInTheDocument();
    });

    it("adds border-red-500 class when error", () => {
      render(<TextareaField {...defaultProps} error="Error" />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveClass("border-red-500");
    });

    it("sets aria-invalid when error", () => {
      render(<TextareaField {...defaultProps} error="Error" />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("textarea props", () => {
    it("passes placeholder", () => {
      render(
        <TextareaField {...defaultProps} placeholder="Enter description" />,
      );
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("placeholder", "Enter description");
    });

    it("passes disabled", () => {
      render(<TextareaField {...defaultProps} disabled />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeDisabled();
    });
  });

  describe("styling", () => {
    it("has base input styling", () => {
      render(<TextareaField {...defaultProps} />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveClass(
        "w-full",
        "px-3",
        "py-2",
        "border",
        "border-theme-border",
      );
    });
  });
});

describe("SelectField", () => {
  const defaultProps = {
    label: "Country",
    options: [
      { value: "us", label: "United States" },
      { value: "uk", label: "United Kingdom" },
      { value: "ca", label: "Canada" },
    ],
  };

  describe("rendering", () => {
    it("renders select element", () => {
      render(<SelectField {...defaultProps} />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders label", () => {
      render(<SelectField {...defaultProps} />);
      expect(screen.getByText("Country")).toBeInTheDocument();
    });

    it("generates id from label when not provided", () => {
      render(<SelectField {...defaultProps} />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("id", "select-country");
    });

    it("uses provided id", () => {
      render(<SelectField {...defaultProps} id="custom-id" />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("id", "custom-id");
    });

    it("renders all options", () => {
      render(<SelectField {...defaultProps} />);
      expect(
        screen.getByRole("option", { name: "United States" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "United Kingdom" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Canada" }),
      ).toBeInTheDocument();
    });

    it("options have correct values", () => {
      render(<SelectField {...defaultProps} />);
      expect(screen.getByRole("option", { name: "United States" })).toHaveValue(
        "us",
      );
      expect(
        screen.getByRole("option", { name: "United Kingdom" }),
      ).toHaveValue("uk");
      expect(screen.getByRole("option", { name: "Canada" })).toHaveValue("ca");
    });
  });

  describe("placeholder", () => {
    it("renders placeholder option when provided", () => {
      render(<SelectField {...defaultProps} placeholder="Select a country" />);
      expect(
        screen.getByRole("option", { name: "Select a country" }),
      ).toBeInTheDocument();
    });

    it("placeholder option has empty value", () => {
      render(<SelectField {...defaultProps} placeholder="Select a country" />);
      const placeholder = screen.getByRole("option", {
        name: "Select a country",
      });
      expect(placeholder).toHaveValue("");
    });

    it("does not render placeholder option when not provided", () => {
      render(<SelectField {...defaultProps} />);
      const options = screen.getAllByRole("option");
      expect(options.length).toBe(3);
    });
  });

  describe("ref forwarding", () => {
    it("forwards ref to select element", () => {
      const ref = createRef<HTMLSelectElement>();
      render(<SelectField {...defaultProps} ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    });
  });

  describe("error state", () => {
    it("shows error message", () => {
      render(<SelectField {...defaultProps} error="Please select a country" />);
      expect(screen.getByText("Please select a country")).toBeInTheDocument();
    });

    it("adds border-red-500 class when error", () => {
      render(<SelectField {...defaultProps} error="Error" />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveClass("border-red-500");
    });

    it("sets aria-invalid when error", () => {
      render(<SelectField {...defaultProps} error="Error" />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("select props", () => {
    it("passes disabled", () => {
      render(<SelectField {...defaultProps} disabled />);
      const select = screen.getByRole("combobox");
      expect(select).toBeDisabled();
    });

    it("passes value and onChange", () => {
      const onChange = jest.fn();
      render(<SelectField {...defaultProps} value="uk" onChange={onChange} />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("uk");

      fireEvent.change(select, { target: { value: "ca" } });
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("styling", () => {
    it("has base input styling", () => {
      render(<SelectField {...defaultProps} />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveClass(
        "w-full",
        "px-3",
        "py-2",
        "border",
        "border-theme-border",
      );
    });
  });
});
