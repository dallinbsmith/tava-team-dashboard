/**
 * Custom render function for testing React components
 * Wraps components with all necessary providers (QueryClient, Auth, etc.)
 */

import React, { ReactElement, ReactNode } from "react";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "./query-wrapper";

/**
 * Options for the custom render function
 */
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  /** Pre-configured QueryClient instance */
  queryClient?: QueryClient;
  /** Initial route path for navigation mocks */
  initialPath?: string;
  /** Whether to wrap with QueryClientProvider (default: true) */
  withQueryClient?: boolean;
}

/**
 * Extended render result with additional utilities
 */
interface CustomRenderResult extends RenderResult {
  queryClient: QueryClient;
}

/**
 * Creates an all-in-one provider wrapper for tests
 */
const createAllProviders = (options: { queryClient: QueryClient; withQueryClient: boolean }) => {
  const { queryClient, withQueryClient } = options;

  const AllProviders = ({ children }: { children: ReactNode }) => {
    if (withQueryClient) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }
    return <>{children}</>;
  };

  AllProviders.displayName = "TestProviders";
  return AllProviders;
};

/**
 * Custom render function that wraps components with test providers
 *
 * @example Basic usage
 * ```tsx
 * import { customRender, screen } from '@/test-utils';
 *
 * test('renders component', () => {
 *   customRender(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 *
 * @example With pre-populated query cache
 * ```tsx
 * import { customRender, createTestQueryClient } from '@/test-utils';
 *
 * test('renders with cached data', () => {
 *   const queryClient = createTestQueryClient();
 *   queryClient.setQueryData(['users', 'current'], mockUser);
 *
 *   customRender(<MyComponent />, { queryClient });
 * });
 * ```
 *
 * @example Without QueryClient (for simple components)
 * ```tsx
 * customRender(<Button>Click me</Button>, { withQueryClient: false });
 * ```
 */
export const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
): CustomRenderResult => {
  const {
    queryClient = createTestQueryClient(),
    withQueryClient = true,
    ...renderOptions
  } = options;

  const Wrapper = createAllProviders({ queryClient, withQueryClient });

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...result,
    queryClient,
  };
};

/**
 * Re-export everything from @testing-library/react
 * so tests can import from a single location
 */
export * from "@testing-library/react";

// Override the default render with our custom one
export { customRender as render };
