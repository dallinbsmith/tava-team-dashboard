/**
 * Tests for lib/errors.ts
 * Error parsing and pattern matching utilities
 */

import { parseErrorMessage, parseSquadErrorMessage, parseInvitationErrorMessage } from "../errors";

describe("parseErrorMessage", () => {
  describe("duplicate key errors", () => {
    it("returns user-friendly message for email duplicate", () => {
      const error = new Error("duplicate key value violates unique constraint users_email_key");
      expect(parseErrorMessage(error)).toBe("An employee with this email address already exists.");
    });

    it("returns user-friendly message for auth0_id duplicate", () => {
      const error = new Error("duplicate key constraint auth0_id violated");
      expect(parseErrorMessage(error)).toBe("This user already exists in the system.");
    });

    it("returns user-friendly message for squad name duplicate", () => {
      const error = new Error("duplicate key value violates unique constraint squads_name");
      expect(parseErrorMessage(error)).toBe("A squad with this name already exists.");
    });

    it("returns generic duplicate message for other duplicates", () => {
      const error = new Error("duplicate key value violates unique constraint some_other_key");
      expect(parseErrorMessage(error)).toBe("This item already exists.");
    });
  });

  describe("Auth0 errors", () => {
    it("handles failed to create user in auth0", () => {
      const error = new Error("failed to create user in auth0: email already exists");
      expect(parseErrorMessage(error)).toBe(
        "Unable to create user account. The email may already be registered."
      );
    });
  });

  describe("permission errors", () => {
    it("handles forbidden error", () => {
      const error = new Error("Forbidden: you cannot access this resource");
      expect(parseErrorMessage(error)).toBe("You don't have permission to perform this action.");
    });

    it("handles unauthorized error", () => {
      const error = new Error("Unauthorized access");
      expect(parseErrorMessage(error)).toBe("You don't have permission to perform this action.");
    });
  });

  describe("validation errors", () => {
    it("handles invalid email", () => {
      const error = new Error("invalid email format provided");
      expect(parseErrorMessage(error)).toBe("Please enter a valid email address.");
    });

    it("handles email format error", () => {
      const error = new Error("email format is incorrect");
      expect(parseErrorMessage(error)).toBe("Please enter a valid email address.");
    });

    it("handles required field error", () => {
      const error = new Error("field name is required");
      expect(parseErrorMessage(error)).toBe("Please fill in all required fields.");
    });
  });

  describe("network errors", () => {
    it("handles network error", () => {
      const error = new Error("network error occurred");
      expect(parseErrorMessage(error)).toBe(
        "Network error. Please check your connection and try again."
      );
    });

    it("handles fetch failed", () => {
      const error = new Error("fetch failed: could not connect");
      expect(parseErrorMessage(error)).toBe(
        "Network error. Please check your connection and try again."
      );
    });

    it("handles timeout error", () => {
      const error = new Error("request timeout after 30s");
      expect(parseErrorMessage(error)).toBe("The request timed out. Please try again.");
    });
  });

  describe("server errors", () => {
    it("handles internal system error", () => {
      const error = new Error("internal system error occurred");
      expect(parseErrorMessage(error)).toBe(
        "An unexpected error occurred. Please try again or contact support."
      );
    });

    it("handles internal server error", () => {
      const error = new Error("500 Internal Server Error");
      expect(parseErrorMessage(error)).toBe(
        "An unexpected error occurred. Please try again or contact support."
      );
    });
  });

  describe("fallback behavior", () => {
    it("returns fallback for unknown errors", () => {
      const error = new Error("something completely unexpected happened");
      expect(parseErrorMessage(error)).toBe("An error occurred. Please try again.");
    });

    it("handles string errors", () => {
      expect(parseErrorMessage("duplicate key users_email_key")).toBe(
        "An employee with this email address already exists."
      );
    });

    it("handles unknown error types", () => {
      expect(parseErrorMessage({ foo: "bar" })).toBe("An error occurred. Please try again.");
    });

    it("handles null/undefined", () => {
      expect(parseErrorMessage(null)).toBe("An error occurred. Please try again.");
      expect(parseErrorMessage(undefined)).toBe("An error occurred. Please try again.");
    });
  });

  describe("case insensitivity", () => {
    it("matches patterns case-insensitively", () => {
      expect(parseErrorMessage(new Error("FORBIDDEN"))).toBe(
        "You don't have permission to perform this action."
      );
      expect(parseErrorMessage(new Error("DUPLICATE KEY users_email_key"))).toBe(
        "An employee with this email address already exists."
      );
    });
  });
});

describe("parseSquadErrorMessage", () => {
  it("handles duplicate squad name via duplicate key", () => {
    const error = new Error("duplicate key value violates constraint");
    expect(parseSquadErrorMessage(error)).toBe("A squad with this name already exists.");
  });

  it("handles already exists error", () => {
    const error = new Error("squad already exists in database");
    expect(parseSquadErrorMessage(error)).toBe("A squad with this name already exists.");
  });

  it("handles forbidden error", () => {
    const error = new Error("Forbidden: admin only");
    expect(parseSquadErrorMessage(error)).toBe("You don't have permission to create squads.");
  });

  it("handles unauthorized error", () => {
    const error = new Error("Unauthorized");
    expect(parseSquadErrorMessage(error)).toBe("You don't have permission to create squads.");
  });

  it("returns fallback for unknown squad errors", () => {
    const error = new Error("random error");
    expect(parseSquadErrorMessage(error)).toBe("Failed to create squad. Please try again.");
  });
});

describe("parseInvitationErrorMessage", () => {
  describe("duplicate invitation errors", () => {
    it("handles pending invitation already exists", () => {
      const error = new Error("pending invitation already exists for this email");
      expect(parseInvitationErrorMessage(error)).toBe(
        "An invitation has already been sent to this email address."
      );
    });

    it("handles invitation already exists", () => {
      const error = new Error("invitation already exists");
      expect(parseInvitationErrorMessage(error)).toBe(
        "An invitation has already been sent to this email address."
      );
    });

    it("handles duplicate key invitations_email", () => {
      const error = new Error("duplicate key value violates unique constraint invitations_email");
      expect(parseInvitationErrorMessage(error)).toBe(
        "An invitation has already been sent to this email address."
      );
    });
  });

  describe("user already exists errors", () => {
    it("handles user already exists", () => {
      const error = new Error("user with this email already exists");
      expect(parseInvitationErrorMessage(error)).toBe(
        "A user with this email address already exists in the system."
      );
    });

    it("handles duplicate key users_email", () => {
      const error = new Error("duplicate key users_email constraint");
      expect(parseInvitationErrorMessage(error)).toBe(
        "A user with this email address already exists in the system."
      );
    });

    it("handles email already registered", () => {
      const error = new Error("email is already registered");
      expect(parseInvitationErrorMessage(error)).toBe(
        "This email is already registered in the system."
      );
    });
  });

  describe("validation errors", () => {
    it("handles invalid email", () => {
      const error = new Error("invalid email address");
      expect(parseInvitationErrorMessage(error)).toBe("Please enter a valid email address.");
    });

    it("handles email invalid format", () => {
      const error = new Error("email is invalid");
      expect(parseInvitationErrorMessage(error)).toBe("Please enter a valid email address.");
    });

    it("handles email required", () => {
      const error = new Error("email is required");
      expect(parseInvitationErrorMessage(error)).toBe("Email address is required.");
    });

    it("handles role required", () => {
      const error = new Error("role is required");
      expect(parseInvitationErrorMessage(error)).toBe("Please select a role for the invitation.");
    });

    it("handles role invalid", () => {
      const error = new Error("role is invalid");
      expect(parseInvitationErrorMessage(error)).toBe(
        "Please select a valid role (supervisor or admin)."
      );
    });
  });

  describe("permission errors", () => {
    it("handles forbidden", () => {
      const error = new Error("Forbidden");
      expect(parseInvitationErrorMessage(error)).toBe(
        "You don't have permission to send invitations."
      );
    });

    it("handles unauthorized", () => {
      const error = new Error("Unauthorized");
      expect(parseInvitationErrorMessage(error)).toBe(
        "You don't have permission to send invitations."
      );
    });
  });

  describe("invitation status errors", () => {
    it("handles expired invitation", () => {
      const error = new Error("invitation has expired");
      expect(parseInvitationErrorMessage(error)).toBe("This invitation has expired.");
    });

    it("handles revoked invitation", () => {
      const error = new Error("invitation was revoked");
      expect(parseInvitationErrorMessage(error)).toBe("This invitation has been revoked.");
    });
  });

  describe("fallback behavior", () => {
    it("returns fallback for unknown invitation errors", () => {
      const error = new Error("something went wrong");
      expect(parseInvitationErrorMessage(error)).toBe(
        "Failed to send invitation. Please try again."
      );
    });
  });
});
