import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDepartment } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { refetchQueries, queryKeyGroups } from "@/lib/queryUtils";

export interface UseDeleteDepartmentOptions {
  /** Callback when mutation succeeds */
  onSuccess?: () => void;
  /** Callback when mutation fails */
  onError?: (error: Error) => void;
}

/**
 * Hook for deleting a department.
 * Automatically invalidates related queries on success.
 *
 * Deleting a department clears the department field for all employees
 * in that department, so we invalidate employee queries as well.
 *
 * @example
 * ```tsx
 * const { mutate: deleteDept, isPending } = useDeleteDepartment({
 *   onSuccess: () => console.log('Deleted'),
 *   onError: (err) => setError(err.message),
 * });
 *
 * deleteDept('Engineering');
 * ```
 */
export function useDeleteDepartment(options: UseDeleteDepartmentOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (departmentName: string) => deleteDepartment(departmentName),
    onMutate: async (departmentName) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.departments.all() });

      // Snapshot current state
      const previousDepartments = queryClient.getQueryData<string[]>(
        queryKeys.departments.all()
      );

      // Optimistic update - remove the department from the list
      queryClient.setQueryData<string[]>(queryKeys.departments.all(), (old) =>
        old ? old.filter((d) => d !== departmentName) : []
      );

      return { previousDepartments };
    },
    onError: (error: Error, _departmentName, context) => {
      // Rollback on error
      if (context?.previousDepartments) {
        queryClient.setQueryData(
          queryKeys.departments.all(),
          context.previousDepartments
        );
      }
      options.onError?.(error);
    },
    onSuccess: async () => {
      // Force refetch all related queries to ensure UI updates immediately
      await refetchQueries(queryClient, queryKeyGroups.departmentRelated());

      options.onSuccess?.();
    },
  });
}
