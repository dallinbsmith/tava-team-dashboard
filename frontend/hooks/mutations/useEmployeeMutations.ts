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
export const useUpdateEmployee = (options: UseUpdateEmployeeOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateEmployeeVariables) => updateUser(id, data),
    onSuccess: async (updatedUser) => {
      queryClient.setQueryData(queryKeys.employees.detail(updatedUser.id), updatedUser);

      await refetchQueries(queryClient, queryKeyGroups.employeeRelated());
      options.onSuccess?.(updatedUser);
    },
    onError: (error: Error) => {
      options.onError?.(error);
    },
  });
};

export interface UseDeactivateEmployeeOptions {
  onSuccess?: () => void;
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
export const useDeactivateEmployee = (options: UseDeactivateEmployeeOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => deactivateUser(userId),
    onSuccess: async (_data, userId) => {
      queryClient.removeQueries({ queryKey: queryKeys.employees.detail(userId) });

      await refetchQueries(queryClient, [...queryKeyGroups.users(), queryKeys.orgChart.tree()]);

      options.onSuccess?.();
    },
    onError: (error: Error) => {
      options.onError?.(error);
    },
  });
};
