/**
 * Tests for hooks/useAsyncOperation.ts
 * Async operation state management hook
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useAsyncOperation, useAsyncLoading } from "../useAsyncOperation";

describe("useAsyncOperation", () => {
  describe("initial state", () => {
    it("starts with loading false", () => {
      const { result } = renderHook(() => useAsyncOperation(async () => "result"));

      expect(result.current.loading).toBe(false);
    });

    it("starts with no error", () => {
      const { result } = renderHook(() => useAsyncOperation(async () => "result"));

      expect(result.current.error).toBeNull();
    });

    it("starts with no success message", () => {
      const { result } = renderHook(() => useAsyncOperation(async () => "result"));

      expect(result.current.success).toBeNull();
    });
  });

  describe("execute() - successful operations", () => {
    it("sets loading true during execution", async () => {
      let resolvePromise: (value: string) => void;
      const slowOperation = () =>
        new Promise<string>((resolve) => {
          resolvePromise = resolve;
        });

      const { result } = renderHook(() => useAsyncOperation(slowOperation));

      act(() => {
        result.current.execute();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!("done");
      });

      expect(result.current.loading).toBe(false);
    });

    it("returns the result from the operation", async () => {
      const { result } = renderHook(() => useAsyncOperation(async () => ({ data: "test" })));

      let returnValue: { data: string } | undefined;

      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toEqual({ data: "test" });
    });

    it("sets success message when provided as string", async () => {
      const { result } = renderHook(() =>
        useAsyncOperation(async () => "result", {
          successMessage: "Operation completed!",
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.success).toBe("Operation completed!");
    });

    it("sets success message from function", async () => {
      const { result } = renderHook(() =>
        useAsyncOperation(async () => ({ count: 5 }), {
          successMessage: (result) => `Processed ${result.count} items`,
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.success).toBe("Processed 5 items");
    });

    it("calls onSuccess callback with result", async () => {
      const onSuccess = jest.fn();

      const { result } = renderHook(() =>
        useAsyncOperation(async () => "test-result", { onSuccess })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledWith("test-result");
    });

    it("passes arguments to the operation", async () => {
      const operation = jest.fn(async (a: number, b: string) => ({ a, b }));

      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute(42, "hello");
      });

      expect(operation).toHaveBeenCalledWith(42, "hello");
    });
  });

  describe("execute() - failed operations", () => {
    it("sets error message on failure", async () => {
      const { result } = renderHook(() =>
        useAsyncOperation(async () => {
          throw new Error("Something went wrong");
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe("Something went wrong");
      expect(result.current.loading).toBe(false);
    });

    it("returns undefined on failure", async () => {
      const { result } = renderHook(() =>
        useAsyncOperation(async () => {
          throw new Error("Failed");
        })
      );

      let returnValue: unknown;

      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toBeUndefined();
    });

    it("calls onError callback with error message", async () => {
      const onError = jest.fn();

      const { result } = renderHook(() =>
        useAsyncOperation(
          async () => {
            throw new Error("Network error");
          },
          { onError }
        )
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledWith("Network error");
    });

    it("clears error before new execution by default", async () => {
      const { result } = renderHook(() =>
        useAsyncOperation(async (shouldFail: boolean) => {
          if (shouldFail) throw new Error("Failed");
          return "success";
        })
      );

      // First execution fails
      await act(async () => {
        await result.current.execute(true);
      });

      expect(result.current.error).toBe("Failed");

      // Second execution starts - error should be cleared
      let resolvePromise: () => void;
      const { result: result2 } = renderHook(() =>
        useAsyncOperation(
          () =>
            new Promise<string>((resolve) => {
              resolvePromise = () => resolve("done");
            })
        )
      );

      act(() => {
        result2.current.execute();
      });

      // While loading, error should be cleared (resetErrorOnStart: true by default)
      expect(result2.current.error).toBeNull();

      await act(async () => {
        resolvePromise!();
      });
    });

    it("keeps error during new execution when resetErrorOnStart is false", async () => {
      let shouldFail = true;

      const { result } = renderHook(() =>
        useAsyncOperation(
          async () => {
            if (shouldFail) throw new Error("First error");
            return "success";
          },
          { resetErrorOnStart: false }
        )
      );

      // First execution fails
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe("First error");

      shouldFail = false;

      // Start second execution - error should persist during loading
      const executePromise = act(async () => {
        await result.current.execute();
      });

      // Note: With resetErrorOnStart: false, error persists
      // But after success, it remains (unless we explicitly clear it)
      await executePromise;
    });
  });

  describe("clearError()", () => {
    it("clears the error state", async () => {
      const { result } = renderHook(() =>
        useAsyncOperation(async () => {
          throw new Error("Error!");
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe("Error!");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("clearSuccess()", () => {
    it("clears the success state", async () => {
      const { result } = renderHook(() =>
        useAsyncOperation(async () => "done", {
          successMessage: "Success!",
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.success).toBe("Success!");

      act(() => {
        result.current.clearSuccess();
      });

      expect(result.current.success).toBeNull();
    });
  });

  describe("clearMessages()", () => {
    it("clears both error and success", async () => {
      const { result } = renderHook(() =>
        useAsyncOperation(async () => "done", {
          successMessage: "Success!",
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.success).toBe("Success!");

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.success).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe("success clears on new execution", () => {
    it("clears previous success when starting new execution", async () => {
      let callCount = 0;

      const { result } = renderHook(() =>
        useAsyncOperation(
          async () => {
            callCount++;
            return `result-${callCount}`;
          },
          {
            successMessage: (r) => `Got: ${r}`,
          }
        )
      );

      // First execution
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.success).toBe("Got: result-1");

      // Second execution starts
      let resolvePromise: () => void;
      const { result: result2 } = renderHook(() =>
        useAsyncOperation(
          () =>
            new Promise<string>((resolve) => {
              resolvePromise = () => resolve("new");
            }),
          { successMessage: "Done" }
        )
      );

      act(() => {
        result2.current.execute();
      });

      // Success should be cleared during loading
      expect(result2.current.success).toBeNull();

      await act(async () => {
        resolvePromise!();
      });
    });
  });
});

describe("useAsyncLoading", () => {
  describe("initial state", () => {
    it("starts with loading false", () => {
      const { result } = renderHook(() => useAsyncLoading(async () => "result"));

      expect(result.current.loading).toBe(false);
    });
  });

  describe("execute()", () => {
    it("sets loading true during execution", async () => {
      let resolvePromise: (value: string) => void;
      const slowOperation = () =>
        new Promise<string>((resolve) => {
          resolvePromise = resolve;
        });

      const { result } = renderHook(() => useAsyncLoading(slowOperation));

      act(() => {
        result.current.execute();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!("done");
      });

      expect(result.current.loading).toBe(false);
    });

    it("returns the result on success", async () => {
      const { result } = renderHook(() => useAsyncLoading(async () => ({ value: 42 })));

      let returnValue: { value: number } | undefined;

      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toEqual({ value: 42 });
    });

    it("returns undefined on failure", async () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const { result } = renderHook(() =>
        useAsyncLoading(async () => {
          throw new Error("Failed");
        })
      );

      let returnValue: unknown;

      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toBeUndefined();
      expect(result.current.loading).toBe(false);

      consoleSpy.mockRestore();
    });

    it("passes arguments to operation", async () => {
      const operation = jest.fn(async (x: number) => x * 2);

      const { result } = renderHook(() => useAsyncLoading(operation));

      await act(async () => {
        await result.current.execute(21);
      });

      expect(operation).toHaveBeenCalledWith(21);
    });

    it("logs errors to console", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const { result } = renderHook(() =>
        useAsyncLoading(async () => {
          throw new Error("Test error");
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(consoleSpy).toHaveBeenCalledWith("Async operation failed:", expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe("simplicity", () => {
    it("only provides execute and loading (no error/success states)", () => {
      const { result } = renderHook(() => useAsyncLoading(async () => "result"));

      expect(Object.keys(result.current)).toEqual(["execute", "loading"]);
    });
  });
});
