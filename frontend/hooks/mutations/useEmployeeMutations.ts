import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser, deactivateUser } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { refetchQueries, queryKeyGroups } from "@/lib/queryUtils";
import { UpdateUserRequest, User } from "@/shared/types/user";

export interface UpdateEmployeeVariables {
  id: number;
  data: UpdateUserRequest;
}

export interface UseUpdateEmployeeOptions {
  /** Callback when mutation succeeds */
  onSuccess?: (updatedUser: User) => void;
  /** Callback when mutation fails */
  onError?: (error: Error) => void;
}

/**
 * Hook for updating an employee.
 * Automatically invalidates related queries on success.
 *
 * @example
 * ```tsx
 * const { mutate: updateEmployee, isPending } = useUpdateEmployee({
 *   onSuccess: (user) => console.log('Updated:', user),
 *   onError: (err) => setError(err.message),
 * });
 *
 * updateEmployee({ id: 123, data: { first_name: 'John' } });
 * ```
 */
export function useUpdateEmployee(options: UseUpdateEmployeeOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateEmployeeVariables) => updateUser(id, data),
    onSuccess: async (updatedUser) => {
      // Update the specific employee in cache
      queryClient.setQueryData(
        queryKeys.employees.detail(updatedUser.id),
        updatedUser
      );

      // Force refetch all related queries to ensure UI updates immediately
      await refetchQueries(queryClient, queryKeyGroups.employeeRelated());

      options.onSuccess?.(updatedUser);
    },
    onError: (error: Error) => {
      options.onError?.(error);
    },
  });
}

export interface UseDeactivateEmployeeOptions {
  /** Callback when mutation succeeds */
  onSuccess?: () => void;
  /** Callback when mutation fails */
  onError?: (error: Error) => void;
}

/**
 * Hook for deactivating an employee.
 * Automatically invalidates related queries on success.
 *
 * @example
 * ```tsx
 * const { mutate: deactivate, isPending } = useDeactivateEmployee({
 *   onSuccess: () => console.log('Deactivated'),
 * });
 *
 * deactivate(123);
 * ```
 */
export function useDeactivateEmployee(options: UseDeactivateEmployeeOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => deactivateUser(userId),
    onSuccess: async (_data, userId) => {
      // Remove from specific employee cache
      queryClient.removeQueries({ queryKey: queryKeys.employees.detail(userId) });

      // Force refetch all user lists to ensure UI updates immediately
      await refetchQueries(queryClient, [
        ...queryKeyGroups.users(),
        queryKeys.orgChart.tree(),
      ]);

      options.onSuccess?.();
    },
    onError: (error: Error) => {
      options.onError?.(error);
    },
  });
}
