/**
 * Parses error messages into user-friendly text.
 * Converts technical API/database errors into readable messages for users.
 */
export function parseErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  switch (true) {
    // Duplicate/conflict errors
    case lowerMessage.includes("duplicate key") && lowerMessage.includes("users_email_key"):
      return "An employee with this email address already exists. Please use a different email.";
    case lowerMessage.includes("duplicate key") && lowerMessage.includes("auth0_id"):
      return "This user already exists in the system.";
    case lowerMessage.includes("duplicate key") && lowerMessage.includes("squads_name"):
      return "A squad with this name already exists. Please use a different name.";
    case lowerMessage.includes("duplicate key"):
      return "This item already exists. Please use a different value.";

    // Auth0 errors
    case lowerMessage.includes("failed to create user in auth0"):
      return "Unable to create user account. The email may already be registered.";

    // Permission errors
    case lowerMessage.includes("forbidden") || lowerMessage.includes("unauthorized"):
      return "You don't have permission to perform this action.";

    // Validation errors
    case lowerMessage.includes("invalid email") || lowerMessage.includes("email format"):
      return "Please enter a valid email address.";
    case lowerMessage.includes("required"):
      return "Please fill in all required fields.";

    // Network errors
    case lowerMessage.includes("network") || lowerMessage.includes("fetch failed"):
      return "Network error. Please check your connection and try again.";
    case lowerMessage.includes("timeout"):
      return "The request timed out. Please try again.";

    // Server errors
    case lowerMessage.includes("internal system error") || lowerMessage.includes("internal server error"):
      return "An unexpected error occurred. Please try again or contact support.";

    // Default fallback
    default:
      // If the message is already user-friendly (short and no technical jargon), use it
      if (message.length < 100 && !lowerMessage.includes("sqlstate") && !lowerMessage.includes("error:")) {
        return message;
      }
      return "An error occurred. Please try again.";
  }
}

/**
 * Parses error messages for squad-related operations.
 */
export function parseSquadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  switch (true) {
    case lowerMessage.includes("duplicate key") || lowerMessage.includes("already exists"):
      return "A squad with this name already exists.";
    case lowerMessage.includes("forbidden") || lowerMessage.includes("unauthorized"):
      return "You don't have permission to create squads.";
    default:
      return "Failed to create squad. Please try again.";
  }
}
