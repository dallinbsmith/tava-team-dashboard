/**
 * Tests for lib/api-utils.ts
 * API error extraction and parsing utilities
 */

import { extractErrorMessage, parseErrorMessage } from "../api-utils";

/**
 * Helper to create a mock Response object
 * (Response is not available in jsdom by default)
 */
function createMockResponse(
  body: string,
  options: { status?: number } = {},
): Response {
  return {
    ok: (options.status || 200) >= 200 && (options.status || 200) < 300,
    status: options.status || 200,
    text: jest.fn().mockResolvedValue(body),
    json: jest.fn().mockImplementation(() => JSON.parse(body)),
    headers: new Headers(),
  } as unknown as Response;
}

describe("extractErrorMessage", () => {
  const fallbackMessage = "Something went wrong";

  describe("JSON response handling", () => {
    it("extracts error field from JSON response", async () => {
      const response = createMockResponse(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
        },
      );

      const message = await extractErrorMessage(response, fallbackMessage);
      expect(message).toBe("User not found");
    });

    it("extracts message field from JSON response", async () => {
      const response = createMockResponse(
        JSON.stringify({ message: "Invalid credentials" }),
        {
          status: 401,
        },
      );

      const message = await extractErrorMessage(response, fallbackMessage);
      expect(message).toBe("Invalid credentials");
    });

    it("extracts detail field from JSON response", async () => {
      const response = createMockResponse(
        JSON.stringify({ detail: "Rate limit exceeded" }),
        {
          status: 429,
        },
      );

      const message = await extractErrorMessage(response, fallbackMessage);
      expect(message).toBe("Rate limit exceeded");
    });

    it("prioritizes error over message over detail", async () => {
      const response = createMockResponse(
        JSON.stringify({
          error: "Primary error",
          message: "Secondary message",
          detail: "Tertiary detail",
        }),
        { status: 400 },
      );

      const message = await extractErrorMessage(response, fallbackMessage);
      expect(message).toBe("Primary error");
    });
  });

  describe("plain text response handling", () => {
    it("returns plain text body when not JSON", async () => {
      const response = createMockResponse("Server is under maintenance", {
        status: 503,
      });

      const message = await extractErrorMessage(response, fallbackMessage);
      expect(message).toBe("Server is under maintenance");
    });

    it("returns fallback for empty response body", async () => {
      const response = createMockResponse("", { status: 500 });

      const message = await extractErrorMessage(response, fallbackMessage);
      expect(message).toBe(fallbackMessage);
    });
  });

  describe("error handling", () => {
    it("returns fallback when response.text() fails", async () => {
      const response = {
        text: jest.fn().mockRejectedValue(new Error("Stream already read")),
      } as unknown as Response;

      const message = await extractErrorMessage(response, fallbackMessage);
      expect(message).toBe(fallbackMessage);
    });

    it("handles JSON with no recognized error fields", async () => {
      const response = createMockResponse(
        JSON.stringify({ status: "error", code: 500 }),
        {
          status: 500,
        },
      );

      const message = await extractErrorMessage(response, fallbackMessage);
      // Falls through to return the raw text since no error/message/detail
      expect(message).toBe('{"status":"error","code":500}');
    });
  });
});

describe("parseErrorMessage", () => {
  describe("Error object handling", () => {
    it("extracts message from Error object", () => {
      const error = new Error("Something failed");
      expect(parseErrorMessage(error)).toBe("Something failed");
    });

    it("extracts message with context prefix", () => {
      const error = new Error("Connection refused");
      expect(parseErrorMessage(error, "Database")).toBe(
        "Database: Connection refused",
      );
    });
  });

  describe("string handling", () => {
    it("returns string directly", () => {
      expect(parseErrorMessage("Simple error")).toBe("Simple error");
    });

    it("returns string with context prefix", () => {
      expect(parseErrorMessage("Not authorized", "API")).toBe(
        "API: Not authorized",
      );
    });
  });

  describe("object with message property", () => {
    it("extracts message from object", () => {
      const error = { message: "Validation failed", code: 400 };
      expect(parseErrorMessage(error)).toBe("Validation failed");
    });

    it("converts non-string message to string", () => {
      const error = { message: 12345 };
      expect(parseErrorMessage(error)).toBe("12345");
    });

    it("handles object with message and context", () => {
      const error = { message: "Record not found" };
      expect(parseErrorMessage(error, "User lookup")).toBe(
        "User lookup: Record not found",
      );
    });
  });

  describe("fallback for unknown types", () => {
    it("returns fallback for null", () => {
      expect(parseErrorMessage(null)).toBe("An unexpected error occurred");
    });

    it("returns fallback for undefined", () => {
      expect(parseErrorMessage(undefined)).toBe("An unexpected error occurred");
    });

    it("returns fallback for number", () => {
      expect(parseErrorMessage(404)).toBe("An unexpected error occurred");
    });

    it("returns fallback for object without message", () => {
      expect(parseErrorMessage({ code: 500 })).toBe(
        "An unexpected error occurred",
      );
    });

    it("returns fallback for empty object", () => {
      expect(parseErrorMessage({})).toBe("An unexpected error occurred");
    });

    it("includes context in fallback", () => {
      expect(parseErrorMessage(null, "Save operation")).toBe(
        "Save operation: An unexpected error occurred",
      );
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(parseErrorMessage("")).toBe("");
    });

    it("handles Error with empty message", () => {
      const error = new Error("");
      expect(parseErrorMessage(error)).toBe("");
    });

    it("handles array (no message property)", () => {
      expect(parseErrorMessage(["error1", "error2"])).toBe(
        "An unexpected error occurred",
      );
    });

    it("handles boolean", () => {
      expect(parseErrorMessage(false)).toBe("An unexpected error occurred");
    });
  });
});
