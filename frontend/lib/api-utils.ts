/**
 * Centralized API utilities for consistent error handling across the application.
 * These utilities ensure errors are properly logged and meaningful messages are returned.
 */

/**
 * Extracts error message from a Response object.
 * Attempts to read the response body as text, with proper error handling.
 *
 * @param response - The fetch Response object
 * @param fallbackMessage - Message to use if error extraction fails
 * @returns The error message from the response or the fallback
 */
export const extractErrorMessage = async (
  response: Response,
  fallbackMessage: string
): Promise<string> => {
  try {
    const text = await response.text();
    // Try to parse as JSON to get a structured error message
    try {
      const json = JSON.parse(text);
      // Handle common API error response formats
      if (json.error) return json.error;
      if (json.message) return json.message;
      if (json.detail) return json.detail;
    } catch {
      // Not JSON, use the text directly if it's not empty
    }
    return text || fallbackMessage;
  } catch (error) {
    // Log the extraction failure for debugging
    console.error("Failed to extract error message from response:", error);
    return fallbackMessage;
  }
};

/**
 * Parses an unknown error value into a user-friendly error message.
 * Useful for catch blocks where the error type is unknown.
 *
 * @param error - The caught error (unknown type)
 * @param context - Optional context string describing the operation
 * @returns A user-friendly error message
 */
export const parseErrorMessage = (error: unknown, context?: string): string => {
  const prefix = context ? `${context}: ` : "";

  if (error instanceof Error) {
    return prefix + error.message;
  }

  if (typeof error === "string") {
    return prefix + error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return prefix + String((error as { message: unknown }).message);
  }

  return prefix + "An unexpected error occurred";
};
