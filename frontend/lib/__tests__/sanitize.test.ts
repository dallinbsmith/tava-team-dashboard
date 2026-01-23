/**
 * Tests for lib/sanitize.ts
 * Input sanitization utilities
 */

import { sanitizeName, validateName, sanitizeAndValidateName } from "../sanitize";

describe("sanitizeName", () => {
  describe("basic sanitization", () => {
    it("trims leading and trailing whitespace", () => {
      expect(sanitizeName("  Engineering  ")).toBe("Engineering");
      expect(sanitizeName("\t\nMarketing\n\t")).toBe("Marketing");
    });

    it("collapses multiple spaces to single space", () => {
      expect(sanitizeName("Product   Design")).toBe("Product Design");
      expect(sanitizeName("A    B    C")).toBe("A B C");
    });

    it("returns empty string for empty input", () => {
      expect(sanitizeName("")).toBe("");
      expect(sanitizeName("   ")).toBe("");
    });

    it("handles null-like values", () => {
      expect(sanitizeName(null as unknown as string)).toBe("");
      expect(sanitizeName(undefined as unknown as string)).toBe("");
    });
  });

  describe("HTML tag removal", () => {
    it("removes HTML tags", () => {
      expect(sanitizeName("<script>alert('xss')</script>Engineering")).toBe(
        "alert('xss')Engineering"
      );
      expect(sanitizeName("<b>Bold</b> Team")).toBe("Bold Team");
      expect(sanitizeName("<div class='test'>Content</div>")).toBe("Content");
    });

    it("removes nested HTML tags", () => {
      expect(sanitizeName("<div><span>Nested</span></div>")).toBe("Nested");
    });

    it("removes self-closing tags", () => {
      expect(sanitizeName("Before<br/>After")).toBe("BeforeAfter");
      expect(sanitizeName("Image<img src='x'/>Team")).toBe("ImageTeam");
    });
  });

  describe("script injection prevention", () => {
    it("removes javascript: protocol", () => {
      expect(sanitizeName("javascript:alert('xss')")).toBe("alert('xss')");
      expect(sanitizeName("JAVASCRIPT:alert('xss')")).toBe("alert('xss')");
    });

    it("removes event handlers", () => {
      expect(sanitizeName("onclick=alert('xss')")).toBe("alert('xss')");
      expect(sanitizeName("onmouseover=hack()")).toBe("hack()");
      expect(sanitizeName("ONERROR=bad()")).toBe("bad()");
    });
  });

  describe("control character removal", () => {
    it("removes control characters", () => {
      expect(sanitizeName("Team\x00Name")).toBe("TeamName");
      expect(sanitizeName("Null\x00Byte")).toBe("NullByte");
    });

    it("preserves normal characters", () => {
      expect(sanitizeName("Engineering & Design")).toBe("Engineering & Design");
      expect(sanitizeName("Team-Name_123")).toBe("Team-Name_123");
    });
  });

  describe("length limiting", () => {
    it("limits to default max length (100)", () => {
      const longString = "A".repeat(150);
      expect(sanitizeName(longString).length).toBe(100);
    });

    it("respects custom max length", () => {
      const input = "Engineering";
      expect(sanitizeName(input, 5)).toBe("Engin");
      expect(sanitizeName(input, 20)).toBe("Engineering");
    });

    it("does not truncate strings within limit", () => {
      expect(sanitizeName("Short", 100)).toBe("Short");
    });
  });

  describe("real-world examples", () => {
    it("sanitizes department names correctly", () => {
      expect(sanitizeName("Engineering")).toBe("Engineering");
      expect(sanitizeName("Product & Design")).toBe("Product & Design");
      expect(sanitizeName("  R&D  ")).toBe("R&D");
    });

    it("sanitizes squad names correctly", () => {
      expect(sanitizeName("Frontend Team")).toBe("Frontend Team");
      expect(sanitizeName("Backend-API")).toBe("Backend-API");
      expect(sanitizeName("DevOps_Infra")).toBe("DevOps_Infra");
    });

    it("handles international characters", () => {
      expect(sanitizeName("Équipe Française")).toBe("Équipe Française");
      expect(sanitizeName("日本語チーム")).toBe("日本語チーム");
    });
  });
});

describe("validateName", () => {
  describe("minimum length validation", () => {
    it("returns error for empty string", () => {
      expect(validateName("", "Squad name")).toBe(
        "Squad name must be at least 1 character"
      );
    });

    it("passes for valid length", () => {
      expect(validateName("A", "Squad name")).toBeNull();
      expect(validateName("Engineering", "Squad name")).toBeNull();
    });

    it("respects custom minimum length", () => {
      expect(validateName("AB", "Name", 3)).toBe(
        "Name must be at least 3 characters"
      );
      expect(validateName("ABC", "Name", 3)).toBeNull();
    });
  });

  describe("maximum length validation", () => {
    it("returns error for string exceeding max length", () => {
      const longString = "A".repeat(101);
      expect(validateName(longString, "Name")).toBe(
        "Name must be less than 100 characters"
      );
    });

    it("respects custom maximum length", () => {
      expect(validateName("ABCDEF", "Name", 1, 5)).toBe(
        "Name must be less than 5 characters"
      );
      expect(validateName("ABCDE", "Name", 1, 5)).toBeNull();
    });
  });

  describe("alphanumeric requirement", () => {
    it("returns error for only special characters", () => {
      expect(validateName("---", "Name")).toBe(
        "Name must contain at least one letter or number"
      );
      expect(validateName("!!!", "Name")).toBe(
        "Name must contain at least one letter or number"
      );
    });

    it("passes for strings with at least one alphanumeric", () => {
      expect(validateName("Team-1", "Name")).toBeNull();
      expect(validateName("A", "Name")).toBeNull();
      expect(validateName("123", "Name")).toBeNull();
    });
  });

  describe("field name customization", () => {
    it("uses custom field name in error messages", () => {
      expect(validateName("", "Department name")).toBe(
        "Department name must be at least 1 character"
      );
      expect(validateName("", "Squad")).toBe("Squad must be at least 1 character");
    });
  });
});

describe("sanitizeAndValidateName", () => {
  it("returns sanitized value and null error for valid input", () => {
    const result = sanitizeAndValidateName("  Engineering  ", "Department");
    expect(result.value).toBe("Engineering");
    expect(result.error).toBeNull();
  });

  it("returns sanitized value and error for invalid input", () => {
    const result = sanitizeAndValidateName("   ", "Department");
    expect(result.value).toBe("");
    expect(result.error).toBe("Department must be at least 1 character");
  });

  it("sanitizes before validating", () => {
    const result = sanitizeAndValidateName("<script>test</script>", "Name");
    expect(result.value).toBe("test");
    expect(result.error).toBeNull();
  });

  it("applies length limit and validates", () => {
    const longInput = "A".repeat(150);
    const result = sanitizeAndValidateName(longInput, "Name", 1, 100);
    expect(result.value.length).toBe(100);
    expect(result.error).toBeNull();
  });

  it("handles XSS attempts", () => {
    const xssAttempts = [
      "<script>alert('xss')</script>",
      "javascript:alert('xss')",
      "onclick=alert('xss')",
      "<img src=x onerror=alert('xss')>",
    ];

    xssAttempts.forEach((input) => {
      const result = sanitizeAndValidateName(input, "Name");
      expect(result.value).not.toContain("<script>");
      expect(result.value).not.toContain("javascript:");
      expect(result.value).not.toMatch(/on\w+=/i);
    });
  });
});
