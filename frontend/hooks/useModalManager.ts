import { useState, useCallback, useMemo } from "react";

/**
 * useModalManager Hook
 *
 * A generic hook for managing modal state in React applications.
 * Supports multiple modals with optional data passing.
 *
 * @example Basic usage with modal types
 * ```tsx
 * type ModalType = "create" | "edit" | "delete" | null;
 * const modal = useModalManager<ModalType>();
 *
 * // Open a modal
 * modal.open("create");
 *
 * // Check if a specific modal is open
 * if (modal.isOpen("create")) { ... }
 *
 * // Close modal
 * modal.close();
 * ```
 *
 * @example With data passing
 * ```tsx
 * type ModalType = "edit" | "delete" | null;
 * interface ModalData {
 *   userId?: number;
 *   userName?: string;
 * }
 *
 * const modal = useModalManager<ModalType, ModalData>();
 *
 * // Open with data
 * modal.open("edit", { userId: 123, userName: "John" });
 *
 * // Access data
 * console.log(modal.data?.userId); // 123
 * ```
 */

export interface ModalState<T extends string | null, D = undefined> {
  /** Currently active modal identifier, or null if no modal is open */
  active: T;
  /** Optional data associated with the current modal */
  data: D | undefined;
  /** Opens a modal with optional data */
  open: (modal: NonNullable<T>, data?: D) => void;
  /** Closes the current modal and clears data */
  close: () => void;
  /** Checks if a specific modal is currently open */
  isOpen: (modal: NonNullable<T>) => boolean;
  /** Toggles a modal open/closed */
  toggle: (modal: NonNullable<T>, data?: D) => void;
}

/**
 * Generic modal manager hook
 *
 * @template T - Union type of modal identifiers (must include null for closed state)
 * @template D - Optional data type to pass to modals
 */
export const useModalManager = <
  T extends string | null = string | null,
  D = undefined,
>(): ModalState<T, D> => {
  const [active, setActive] = useState<T>(null as T);
  const [data, setData] = useState<D | undefined>(undefined);

  const open = useCallback((modal: NonNullable<T>, modalData?: D) => {
    setActive(modal as T);
    setData(modalData);
  }, []);

  const close = useCallback(() => {
    setActive(null as T);
    setData(undefined);
  }, []);

  const isOpen = useCallback(
    (modal: NonNullable<T>) => {
      return active === modal;
    },
    [active],
  );

  const toggle = useCallback(
    (modal: NonNullable<T>, modalData?: D) => {
      if (active === modal) {
        close();
      } else {
        open(modal, modalData);
      }
    },
    [active, close, open],
  );

  return useMemo(
    () => ({
      active,
      data,
      open,
      close,
      isOpen,
      toggle,
    }),
    [active, data, open, close, isOpen, toggle],
  );
};

export default useModalManager;
