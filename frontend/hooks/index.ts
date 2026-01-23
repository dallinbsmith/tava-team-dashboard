export { useModalManager } from "./useModalManager";
export type { ModalState } from "./useModalManager";

export { useEmployeeList } from "./useEmployeeList";

export { useAsyncOperation, useAsyncLoading } from "./useAsyncOperation";
export type {
  UseAsyncOperationOptions,
  UseAsyncOperationReturn,
} from "./useAsyncOperation";

// React Query hooks
export {
  useCurrentUserQuery,
  useEmployeesQuery,
  useEmployeeQuery,
  useSquadsQuery,
  useAllUsersQuery,
  useDepartmentsQuery,
} from "./queries";
export type {
  UseCurrentUserQueryOptions,
  UseCurrentUserQueryResult,
  UseEmployeesQueryOptions,
  UseEmployeesQueryResult,
  UseEmployeeQueryOptions,
  UseEmployeeQueryResult,
  UseSquadsQueryOptions,
  UseSquadsQueryResult,
  UseAllUsersQueryOptions,
  UseAllUsersQueryResult,
  UseDepartmentsQueryOptions,
  UseDepartmentsQueryResult,
} from "./queries";

// React Query mutations
export {
  useUpdateEmployee,
  useDeactivateEmployee,
  useDeleteDepartment,
  useRenameDepartment,
} from "./mutations";
export type {
  UpdateEmployeeVariables,
  UseUpdateEmployeeOptions,
  UseDeactivateEmployeeOptions,
  UseDeleteDepartmentOptions,
  UseRenameDepartmentOptions,
} from "./mutations";
