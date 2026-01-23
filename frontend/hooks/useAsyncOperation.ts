import { useState, useCallback } from "react";
import { parseErrorMessage } from "@/lib/api-utils";

export interface UseAsyncOperationOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: string) => void;
  successMessage?: string | ((result: T) => string);
  resetErrorOnStart?: boolean;
}

export interface UseAsyncOperationReturn<T, Args extends unknown[]> {
  execute: (...args: Args) => Promise<T | undefined>;
  loading: boolean;
  error: string | null;
  success: string | null;
  clearError: () => void;
  clearSuccess: () => void;
  clearMessages: () => void;
}

/**
 * A hook that wraps async operations with loading, error, and success states.
 * Eliminates the repetitive try/catch/finally pattern across components.
 *
 * @example
 * ```tsx
 * const { execute: fetchData, loading, error } = useAsyncOperation(
 *   async () => {
 *     const data = await api.getData();
 *     setData(data);
 *     return data;
 *   },
 *   { successMessage: "Data loaded successfully" }
 * );
 *
 * // Later in your component:
 * <button onClick={() => fetchData()} disabled={loading}>
 *   {loading ? "Loading..." : "Fetch Data"}
 * </button>
 * {error && <p className="text-red-500">{error}</p>}
 * ```
 */
export const useAsyncOperation = <T, Args extends unknown[] = []>(
  operation: (...args: Args) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {},
): UseAsyncOperationReturn<T, Args> => {
  const {
    onSuccess,
    onError,
    successMessage,
    resetErrorOnStart = true,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccess(null), []);
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      setLoading(true);
      if (resetErrorOnStart) {
        setError(null);
      }
      setSuccess(null);

      try {
        const result = await operation(...args);
        if (successMessage) {
          const message =
            typeof successMessage === "function"
              ? successMessage(result)
              : successMessage;
          setSuccess(message);
        }

        onSuccess?.(result);

        return result;
      } catch (e) {
        const errorMessage = parseErrorMessage(e);
        setError(errorMessage);
        onError?.(errorMessage);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [operation, onSuccess, onError, successMessage, resetErrorOnStart],
  );

  return {
    execute,
    loading,
    error,
    success,
    clearError,
    clearSuccess,
    clearMessages,
  };
};

/**
 * A simpler version of useAsyncOperation that only tracks loading state.
 * Useful when you want to handle errors differently (e.g., in a toast).
 *
 * @example
 * ```tsx
 * const { execute: saveData, loading } = useAsyncLoading(
 *   async (data: FormData) => {
 *     await api.save(data);
 *     toast.success("Saved!");
 *   }
 * );
 * ```
 */
export const useAsyncLoading = <T, Args extends unknown[] = []>(
  operation: (...args: Args) => Promise<T>,
): {
  execute: (...args: Args) => Promise<T | undefined>;
  loading: boolean;
} => {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      setLoading(true);
      try {
        return await operation(...args);
      } catch (e) {
        console.error("Async operation failed:", e);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [operation],
  );

  return { execute, loading };
};

export default useAsyncOperation;
