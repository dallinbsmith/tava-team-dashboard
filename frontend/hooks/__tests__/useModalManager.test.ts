/**
 * Tests for hooks/useModalManager.ts
 * Modal state management hook
 */

import { renderHook, act } from "@testing-library/react";
import { useModalManager } from "../useModalManager";

describe("useModalManager", () => {
  describe("initial state", () => {
    it("starts with no active modal", () => {
      const { result } = renderHook(() => useModalManager());

      expect(result.current.active).toBeNull();
    });

    it("starts with undefined data", () => {
      const { result } = renderHook(() => useModalManager());

      expect(result.current.data).toBeUndefined();
    });

    it("isOpen returns false for any modal initially", () => {
      const { result } = renderHook(() => useModalManager<"create" | "edit" | null>());

      expect(result.current.isOpen("create")).toBe(false);
      expect(result.current.isOpen("edit")).toBe(false);
    });
  });

  describe("open()", () => {
    it("sets the active modal", () => {
      const { result } = renderHook(() => useModalManager<"create" | "edit" | null>());

      act(() => {
        result.current.open("create");
      });

      expect(result.current.active).toBe("create");
    });

    it("sets modal data when provided", () => {
      const { result } = renderHook(() => useModalManager<"edit" | null, { id: number }>());

      act(() => {
        result.current.open("edit", { id: 123 });
      });

      expect(result.current.active).toBe("edit");
      expect(result.current.data).toEqual({ id: 123 });
    });

    it("opens without data when not provided", () => {
      const { result } = renderHook(() => useModalManager<"create" | null, { name: string }>());

      act(() => {
        result.current.open("create");
      });

      expect(result.current.active).toBe("create");
      expect(result.current.data).toBeUndefined();
    });

    it("replaces previous modal when opening a new one", () => {
      const { result } = renderHook(() => useModalManager<"create" | "edit" | null>());

      act(() => {
        result.current.open("create");
      });

      act(() => {
        result.current.open("edit");
      });

      expect(result.current.active).toBe("edit");
      expect(result.current.isOpen("create")).toBe(false);
      expect(result.current.isOpen("edit")).toBe(true);
    });

    it("replaces previous data when opening with new data", () => {
      const { result } = renderHook(() => useModalManager<"edit" | null, { id: number }>());

      act(() => {
        result.current.open("edit", { id: 1 });
      });

      act(() => {
        result.current.open("edit", { id: 2 });
      });

      expect(result.current.data).toEqual({ id: 2 });
    });
  });

  describe("close()", () => {
    it("sets active to null", () => {
      const { result } = renderHook(() => useModalManager<"create" | null>());

      act(() => {
        result.current.open("create");
      });

      act(() => {
        result.current.close();
      });

      expect(result.current.active).toBeNull();
    });

    it("clears data", () => {
      const { result } = renderHook(() => useModalManager<"edit" | null, { id: number }>());

      act(() => {
        result.current.open("edit", { id: 123 });
      });

      act(() => {
        result.current.close();
      });

      expect(result.current.data).toBeUndefined();
    });

    it("is safe to call when no modal is open", () => {
      const { result } = renderHook(() => useModalManager());

      expect(() => {
        act(() => {
          result.current.close();
        });
      }).not.toThrow();

      expect(result.current.active).toBeNull();
    });
  });

  describe("isOpen()", () => {
    it("returns true for the open modal", () => {
      const { result } = renderHook(() => useModalManager<"create" | "edit" | "delete" | null>());

      act(() => {
        result.current.open("edit");
      });

      expect(result.current.isOpen("edit")).toBe(true);
    });

    it("returns false for other modals", () => {
      const { result } = renderHook(() => useModalManager<"create" | "edit" | "delete" | null>());

      act(() => {
        result.current.open("edit");
      });

      expect(result.current.isOpen("create")).toBe(false);
      expect(result.current.isOpen("delete")).toBe(false);
    });

    it("returns false after closing", () => {
      const { result } = renderHook(() => useModalManager<"create" | null>());

      act(() => {
        result.current.open("create");
      });

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen("create")).toBe(false);
    });
  });

  describe("toggle()", () => {
    it("opens a closed modal", () => {
      const { result } = renderHook(() => useModalManager<"settings" | null>());

      act(() => {
        result.current.toggle("settings");
      });

      expect(result.current.active).toBe("settings");
      expect(result.current.isOpen("settings")).toBe(true);
    });

    it("closes an open modal", () => {
      const { result } = renderHook(() => useModalManager<"settings" | null>());

      act(() => {
        result.current.open("settings");
      });

      act(() => {
        result.current.toggle("settings");
      });

      expect(result.current.active).toBeNull();
      expect(result.current.isOpen("settings")).toBe(false);
    });

    it("opens with data when toggling open", () => {
      const { result } = renderHook(() => useModalManager<"edit" | null, { userId: number }>());

      act(() => {
        result.current.toggle("edit", { userId: 42 });
      });

      expect(result.current.active).toBe("edit");
      expect(result.current.data).toEqual({ userId: 42 });
    });

    it("clears data when toggling closed", () => {
      const { result } = renderHook(() => useModalManager<"edit" | null, { userId: number }>());

      act(() => {
        result.current.open("edit", { userId: 42 });
      });

      act(() => {
        result.current.toggle("edit");
      });

      expect(result.current.data).toBeUndefined();
    });

    it("switches from one modal to another", () => {
      const { result } = renderHook(() => useModalManager<"create" | "edit" | null>());

      act(() => {
        result.current.open("create");
      });

      // Toggle a different modal should open it (not toggle the current one)
      act(() => {
        result.current.toggle("edit");
      });

      expect(result.current.active).toBe("edit");
      expect(result.current.isOpen("create")).toBe(false);
      expect(result.current.isOpen("edit")).toBe(true);
    });
  });

  describe("memoization", () => {
    it("returns stable function references", () => {
      const { result, rerender } = renderHook(() => useModalManager());

      const firstOpen = result.current.open;
      const firstClose = result.current.close;
      const firstToggle = result.current.toggle;

      rerender();

      expect(result.current.open).toBe(firstOpen);
      expect(result.current.close).toBe(firstClose);
      // toggle depends on active state, so it may change
    });

    it("isOpen reference changes when active changes", () => {
      const { result } = renderHook(() => useModalManager<"test" | null>());

      const firstIsOpen = result.current.isOpen;

      act(() => {
        result.current.open("test");
      });

      // isOpen depends on active, so it should have a new reference
      expect(result.current.isOpen).not.toBe(firstIsOpen);
    });
  });

  describe("type safety", () => {
    it("works with string literal union types", () => {
      type ModalType = "create" | "edit" | "delete" | "view" | null;

      const { result } = renderHook(() => useModalManager<ModalType>());

      act(() => {
        result.current.open("create");
      });

      expect(result.current.active).toBe("create");
    });

    it("works with complex data types", () => {
      interface ModalData {
        user: { id: number; name: string };
        action: "approve" | "reject";
      }

      const { result } = renderHook(() => useModalManager<"confirm" | null, ModalData>());

      const testData: ModalData = {
        user: { id: 1, name: "John" },
        action: "approve",
      };

      act(() => {
        result.current.open("confirm", testData);
      });

      expect(result.current.data).toEqual(testData);
      expect(result.current.data?.user.name).toBe("John");
      expect(result.current.data?.action).toBe("approve");
    });
  });
});
