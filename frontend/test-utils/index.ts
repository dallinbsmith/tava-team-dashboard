/**
 * Test Utilities Index
 *
 * Import test utilities from this single entry point:
 *
 * @example
 * ```ts
 * import {
 *   render,
 *   screen,
 *   fireEvent,
 *   waitFor,
 *   QueryWrapper,
 *   createTestQueryClient,
 * } from '@/test-utils';
 * ```
 */

// Custom render and all @testing-library/react exports
export * from "./render";

// React Query test utilities
export {
  QueryWrapper,
  createQueryWrapper,
  createTestQueryClient,
  waitForQueries,
} from "./query-wrapper";

// Re-export user-event for realistic interactions
export { default as userEvent } from "@testing-library/user-event";

// Re-export renderHook for testing hooks
export { renderHook } from "@testing-library/react";
