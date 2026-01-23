/**
 * Mock for next/navigation hooks
 * Used in Jest tests to prevent "useRouter only works in Client Components" errors
 *
 * @example
 * ```ts
 * // In your test file:
 * import { useRouter } from 'next/navigation';
 *
 * jest.mock('next/navigation');
 *
 * test('navigates on click', () => {
 *   const pushMock = jest.fn();
 *   (useRouter as jest.Mock).mockReturnValue({ push: pushMock });
 *
 *   // ... render and interact
 *   expect(pushMock).toHaveBeenCalledWith('/dashboard');
 * });
 * ```
 */

export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}));

export const usePathname = jest.fn(() => "/");

export const useSearchParams = jest.fn(() => new URLSearchParams());

export const useParams = jest.fn(() => ({}));

export const useSelectedLayoutSegment = jest.fn(() => null);

export const useSelectedLayoutSegments = jest.fn(() => []);

export const redirect = jest.fn();

export const notFound = jest.fn();

/**
 * Helper to reset all navigation mocks between tests
 */
export const resetNavigationMocks = () => {
  (useRouter as jest.Mock).mockClear();
  (usePathname as jest.Mock).mockClear();
  (useSearchParams as jest.Mock).mockClear();
  (useParams as jest.Mock).mockClear();
  (useSelectedLayoutSegment as jest.Mock).mockClear();
  (useSelectedLayoutSegments as jest.Mock).mockClear();
  (redirect as jest.Mock).mockClear();
  (notFound as jest.Mock).mockClear();
};

/**
 * Helper to set up common navigation mock values
 */
export const mockNavigation = (options: {
  pathname?: string;
  searchParams?: Record<string, string>;
  params?: Record<string, string>;
}) => {
  if (options.pathname !== undefined) {
    (usePathname as jest.Mock).mockReturnValue(options.pathname);
  }
  if (options.searchParams !== undefined) {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams(options.searchParams),
    );
  }
  if (options.params !== undefined) {
    (useParams as jest.Mock).mockReturnValue(options.params);
  }
};
