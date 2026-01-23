import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDepartment, renameDepartment } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { refetchQueries, queryKeyGroups } from "@/lib/query-utils";

export interface UseRenameDepartmentOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for renaming a department.
 * Automatically invalidates related queries on success.
 *
 * @example
 * ```tsx
 * const { mutate: renameDept, isPending } = useRenameDepartment({
 *   onSuccess: () => console.log('Renamed'),
 *   onError: (err) => setError(err.message),
 * });
 *
 * renameDept({ oldName: 'Engineering', newName: 'Product Engineering' });
 * ```
 */
export const useRenameDepartment = (options: UseRenameDepartmentOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      renameDepartment(oldName, newName),
    onMutate: async ({ oldName, newName }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.departments.all() });
      const previousDepartments = queryClient.getQueryData<string[]>(queryKeys.departments.all());

      queryClient.setQueryData<string[]>(queryKeys.departments.all(), (old) =>
        old ? old.map((d) => (d === oldName ? newName : d)) : []
      );

      return { previousDepartments };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousDepartments) {
        queryClient.setQueryData(queryKeys.departments.all(), context.previousDepartments);
      }
      options.onError?.(error);
    },
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.departmentRelated());
      options.onSuccess?.();
    },
  });
};

export interface UseDeleteDepartmentOptions {
  onSuccess?: () => void;
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
export const useDeleteDepartment = (options: UseDeleteDepartmentOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (departmentName: string) => deleteDepartment(departmentName),
    onMutate: async (departmentName) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.departments.all() });
      const previousDepartments = queryClient.getQueryData<string[]>(queryKeys.departments.all());

      queryClient.setQueryData<string[]>(queryKeys.departments.all(), (old) =>
        old ? old.filter((d) => d !== departmentName) : []
      );

      return { previousDepartments };
    },
    onError: (error: Error, _departmentName, context) => {
      if (context?.previousDepartments) {
        queryClient.setQueryData(queryKeys.departments.all(), context.previousDepartments);
      }
      options.onError?.(error);
    },
    onSuccess: async () => {
      await refetchQueries(queryClient, queryKeyGroups.departmentRelated());
      options.onSuccess?.();
    },
  });
};
