/**
 * Input sanitization utilities for user-provided text fields.
 * Prevents XSS, injection attacks, and ensures data quality.
 */

const MAX_NAME_LENGTH = 100;

/**
 * Sanitizes a name field (department, squad, etc.)
 * - Trims leading/trailing whitespace
 * - Collapses multiple spaces into one
 * - Removes HTML tags and script content
 * - Removes control characters
 * - Limits length
 */
export const sanitizeName = (
  input: string,
  maxLength: number = MAX_NAME_LENGTH,
): string => {
  if (!input) return "";

  return (
    input
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove script-like patterns
      .replace(/javascript:/gi, "")
      .replace(/on\w+=/gi, "")
      // Remove control characters (except newlines and tabs which get collapsed)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Collapse multiple whitespace to single space
      .replace(/\s+/g, " ")
      // Trim whitespace
      .trim()
      // Limit length
      .slice(0, maxLength)
  );
};

/**
 * Validates that a sanitized name is acceptable
 * Returns an error message if invalid, or null if valid
 */
export const validateName = (
  name: string,
  fieldName: string = "Name",
  minLength: number = 1,
  maxLength: number = MAX_NAME_LENGTH,
): string | null => {
  if (!name || name.length < minLength) {
    return `${fieldName} must be at least ${minLength} character${minLength > 1 ? "s" : ""}`;
  }

  if (name.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters`;
  }

  // Check for only whitespace/special chars
  if (!/[a-zA-Z0-9]/.test(name)) {
    return `${fieldName} must contain at least one letter or number`;
  }

  return null;
};

/**
 * Combined sanitize and validate - returns { value, error }
 */
export const sanitizeAndValidateName = (
  input: string,
  fieldName: string = "Name",
  minLength: number = 1,
  maxLength: number = MAX_NAME_LENGTH,
): { value: string; error: string | null } => {
  const value = sanitizeName(input, maxLength);
  const error = validateName(value, fieldName, minLength, maxLength);
  return { value, error };
};
