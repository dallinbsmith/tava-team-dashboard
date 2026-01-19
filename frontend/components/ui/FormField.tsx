"use client";

import { ReactNode, forwardRef } from "react";

const baseInputClass =
  "w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed";

export interface FormFieldProps {
  /** Field label */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Helper text below the input */
  helperText?: string;
  /** Field ID (auto-generated if not provided) */
  id?: string;
  /** Additional className for the wrapper */
  className?: string;
  /** Children (for custom inputs) */
  children?: ReactNode;
}

interface InputFieldProps
  extends FormFieldProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "className"> {
  /** Input type */
  type?: "text" | "email" | "password" | "date" | "time" | "number";
}

interface TextareaFieldProps
  extends FormFieldProps,
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className"> {
  /** Number of rows */
  rows?: number;
}

interface SelectFieldProps
  extends FormFieldProps,
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id" | "className"> {
  /** Select options */
  options: { value: string; label: string }[];
  /** Placeholder option text */
  placeholder?: string;
}

/**
 * FormField wrapper component
 * Provides consistent label, error, and helper text styling for any form input
 */
export function FormField({
  label,
  required,
  error,
  helperText,
  id,
  className = "",
  children,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-theme-text mb-1"
      >
        {label}
        {required && " *"}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-sm text-theme-text-muted">{helperText}</p>
      )}
    </div>
  );
}

/**
 * Input field component with label support
 */
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      label,
      required,
      error,
      helperText,
      id,
      className = "",
      type = "text",
      ...inputProps
    },
    ref
  ) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;

    return (
      <FormField
        label={label}
        required={required}
        error={error}
        helperText={helperText}
        id={inputId}
        className={className}
      >
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`${baseInputClass} ${error ? "border-red-500" : ""}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...inputProps}
        />
      </FormField>
    );
  }
);

InputField.displayName = "InputField";

/**
 * Textarea field component with label support
 */
export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  (
    {
      label,
      required,
      error,
      helperText,
      id,
      className = "",
      rows = 3,
      ...textareaProps
    },
    ref
  ) => {
    const inputId = id || `textarea-${label.toLowerCase().replace(/\s+/g, "-")}`;

    return (
      <FormField
        label={label}
        required={required}
        error={error}
        helperText={helperText}
        id={inputId}
        className={className}
      >
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={`${baseInputClass} ${error ? "border-red-500" : ""}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...textareaProps}
        />
      </FormField>
    );
  }
);

TextareaField.displayName = "TextareaField";

/**
 * Select field component with label support
 */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  (
    {
      label,
      required,
      error,
      helperText,
      id,
      className = "",
      options,
      placeholder,
      ...selectProps
    },
    ref
  ) => {
    const inputId = id || `select-${label.toLowerCase().replace(/\s+/g, "-")}`;

    return (
      <FormField
        label={label}
        required={required}
        error={error}
        helperText={helperText}
        id={inputId}
        className={className}
      >
        <select
          ref={ref}
          id={inputId}
          className={`${baseInputClass} ${error ? "border-red-500" : ""}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...selectProps}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>
    );
  }
);

SelectField.displayName = "SelectField";
