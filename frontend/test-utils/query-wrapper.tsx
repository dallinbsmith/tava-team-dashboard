/**
 * React Query Test Utilities
 * Provides QueryClient wrapper for testing hooks and components that use React Query
 */

import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Creates a new QueryClient configured for testing
 * - Disables retries (tests should fail fast)
 * - Disables garbage collection time
 * - Silences error logging in tests
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

/**
 * Wrapper component that provides a fresh QueryClient for each test
 *
 * @example
 * ```tsx
 * import { renderHook } from '@testing-library/react';
 * import { QueryWrapper } from '@/test-utils';
 *
 * test('fetches data', async () => {
 *   const { result } = renderHook(() => useMyQuery(), {
 *     wrapper: QueryWrapper,
 *   });
 *
 *   await waitFor(() => expect(result.current.isSuccess).toBe(true));
 * });
 * ```
 */
export const QueryWrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = createTestQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

/**
 * Creates a wrapper with a specific QueryClient instance
 * Useful when you need to pre-populate cache or access the client in tests
 *
 * @example
 * ```tsx
 * const queryClient = createTestQueryClient();
 *
 * // Pre-populate cache
 * queryClient.setQueryData(['users', 'current'], mockUser);
 *
 * const { result } = renderHook(() => useCurrentUserQuery(), {
 *   wrapper: createQueryWrapper(queryClient),
 * });
 * ```
 */
export const createQueryWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "QueryWrapper";
  return Wrapper;
};

/**
 * Helper to wait for queries to settle in tests
 */
export const waitForQueries = async (queryClient: QueryClient) => {
  await queryClient.cancelQueries();
  // Allow any pending state updates to flush
  await new Promise((resolve) => setTimeout(resolve, 0));
};
