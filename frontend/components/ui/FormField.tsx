"use client";

import { ReactNode, forwardRef } from "react";

const baseInputClass =
  "w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed";

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  id?: string;
  className?: string;
  children?: ReactNode;
}

interface InputFieldProps
  extends
    FormFieldProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "className"> {
  /** Input type */
  type?: "text" | "email" | "password" | "date" | "time" | "number";
}

interface TextareaFieldProps
  extends
    FormFieldProps,
    Omit<
      React.TextareaHTMLAttributes<HTMLTextAreaElement>,
      "id" | "className"
    > {
  rows?: number;
}

interface SelectFieldProps
  extends
    FormFieldProps,
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id" | "className"> {
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const FormField = ({
  label,
  required,
  error,
  helperText,
  id,
  className = "",
  children,
}: FormFieldProps) => {
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
};

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
    ref,
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
  },
);

InputField.displayName = "InputField";

export const TextareaField = forwardRef<
  HTMLTextAreaElement,
  TextareaFieldProps
>(
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
    ref,
  ) => {
    const inputId =
      id || `textarea-${label.toLowerCase().replace(/\s+/g, "-")}`;

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
  },
);

TextareaField.displayName = "TextareaField";

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
    ref,
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
  },
);

SelectField.displayName = "SelectField";
