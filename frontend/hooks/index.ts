export { useModalManager, useBooleanModal } from "./useModalManager";
export type { ModalState, BooleanModalState } from "./useModalManager";

export { useEmployeeList } from "./useEmployeeList";

// React Query hooks
export {
  useCurrentUserQuery,
  useEmployeesQuery,
  useEmployeeQuery,
  useSquadsQuery,
  useAllUsersQuery,
  useDepartmentsQuery,
  useDerivedDepartments,
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
