import { GraphQLClient, gql } from "graphql-request";
import { User } from "@/shared/types/user";

// GraphQL uses the server-side proxy which handles token management
// This keeps access tokens secure and never exposes them to client JavaScript
// graphql-request requires an absolute URL, so we construct it from window.location.origin
function getGraphQLProxyURL(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/graphql`;
  }
  // Fallback for server-side rendering (though this should primarily be used client-side)
  return "http://localhost:3000/api/graphql";
}

/**
 * Creates a GraphQL client that uses the server-side proxy.
 * The proxy automatically adds the Auth0 access token from the session.
 */
export function createProxyGraphQLClient() {
  return new GraphQLClient(getGraphQLProxyURL(), {
    credentials: "same-origin", // Include cookies for session
  });
}

// =============================================================================
// GraphQL Fragments - DRY reusable field definitions
// =============================================================================

/**
 * Core employee fields used across all queries/mutations.
 * This is the single source of truth for employee field selection.
 */
export const EMPLOYEE_CORE_FIELDS = gql`
  fragment EmployeeCoreFields on Employee {
    id
    auth0_id
    email
    first_name
    last_name
    role
    title
    department
    squads {
      id
      name
    }
    avatar_url
    supervisor_id
    date_started
    created_at
    updated_at
  }
`;

/**
 * Basic supervisor/user reference fields for nested objects.
 */
export const SUPERVISOR_REF_FIELDS = gql`
  fragment SupervisorRefFields on Employee {
    id
    first_name
    last_name
    email
  }
`;

/**
 * Direct report fields for supervisor views.
 */
export const DIRECT_REPORT_FIELDS = gql`
  fragment DirectReportFields on Employee {
    id
    first_name
    last_name
    email
    role
    title
  }
`;

// =============================================================================
// GraphQL Queries
// =============================================================================

export const GET_EMPLOYEES = gql`
  ${EMPLOYEE_CORE_FIELDS}
  ${SUPERVISOR_REF_FIELDS}
  query GetEmployees {
    employees {
      ...EmployeeCoreFields
      supervisor {
        ...SupervisorRefFields
      }
    }
  }
`;

export const GET_EMPLOYEE = gql`
  ${EMPLOYEE_CORE_FIELDS}
  ${SUPERVISOR_REF_FIELDS}
  ${DIRECT_REPORT_FIELDS}
  query GetEmployee($id: ID!) {
    employee(id: $id) {
      ...EmployeeCoreFields
      supervisor {
        ...SupervisorRefFields
      }
      direct_reports {
        ...DirectReportFields
      }
    }
  }
`;

export const GET_ME = gql`
  ${EMPLOYEE_CORE_FIELDS}
  query GetMe {
    me {
      ...EmployeeCoreFields
    }
  }
`;

// =============================================================================
// GraphQL Mutations
// =============================================================================

export const CREATE_EMPLOYEE = gql`
  ${EMPLOYEE_CORE_FIELDS}
  mutation CreateEmployee($input: CreateEmployeeInput!) {
    createEmployee(input: $input) {
      ...EmployeeCoreFields
    }
  }
`;

export const UPDATE_EMPLOYEE = gql`
  ${EMPLOYEE_CORE_FIELDS}
  mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) {
    updateEmployee(id: $id, input: $input) {
      ...EmployeeCoreFields
    }
  }
`;

export const DELETE_EMPLOYEE = gql`
  mutation DeleteEmployee($id: ID!) {
    deleteEmployee(id: $id)
  }
`;

// Response types for GraphQL
interface GraphQLSquad {
  id: string;
  name: string;
}

interface GraphQLEmployee {
  id: string;
  auth0_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "supervisor" | "employee";
  title: string;
  department: string;
  squads: GraphQLSquad[];
  avatar_url: string | null;
  supervisor_id: string | null;
  date_started: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  supervisor?: GraphQLEmployee | null;
  direct_reports?: GraphQLEmployee[] | null;
}

// Convert GraphQL employee to User type
function toUser(employee: GraphQLEmployee): User {
  return {
    id: parseInt(employee.id, 10),
    auth0_id: employee.auth0_id,
    email: employee.email,
    first_name: employee.first_name,
    last_name: employee.last_name,
    role: employee.role,
    title: employee.title,
    department: employee.department,
    squads: (employee.squads || []).map(s => ({
      id: parseInt(s.id, 10),
      name: s.name,
    })),
    avatar_url: employee.avatar_url || undefined,
    supervisor_id: employee.supervisor_id
      ? parseInt(employee.supervisor_id, 10)
      : undefined,
    date_started: employee.date_started || undefined,
    is_active: employee.is_active ?? true, // Default to true for GraphQL (queries filter active users)
    created_at: employee.created_at,
    updated_at: employee.updated_at,
  };
}

// API functions using GraphQL
// The proxy handles token management server-side.

export async function getEmployeesGraphQL(): Promise<User[]> {
  const client = createProxyGraphQLClient();
  const data = await client.request<{ employees: GraphQLEmployee[] }>(
    GET_EMPLOYEES
  );
  return data.employees.map(toUser);
}

export async function getEmployeeGraphQL(id: number): Promise<User> {
  const client = createProxyGraphQLClient();
  const data = await client.request<{ employee: GraphQLEmployee }>(
    GET_EMPLOYEE,
    { id: id.toString() }
  );
  return toUser(data.employee);
}

export async function getCurrentUserGraphQL(): Promise<User> {
  const client = createProxyGraphQLClient();
  const data = await client.request<{ me: GraphQLEmployee }>(GET_ME);
  return toUser(data.me);
}

export interface CreateEmployeeInput {
  email: string;
  first_name: string;
  last_name: string;
  role: "supervisor" | "employee";
  department: string;
  avatar_url?: string;
  supervisor_id?: string;
  squad_ids?: number[];
  date_started?: string;
}

export async function createEmployeeGraphQL(
  input: CreateEmployeeInput
): Promise<User> {
  const client = createProxyGraphQLClient();

  // Clean up input - remove empty strings, keep only truthy optional values
  // Convert date_started to RFC3339 format for GraphQL Time scalar
  const dateStartedRFC3339 = input.date_started?.trim()
    ? `${input.date_started.trim()}T00:00:00Z`
    : undefined;

  const cleanedInput = {
    email: input.email,
    first_name: input.first_name,
    last_name: input.last_name,
    role: input.role,
    ...(input.department?.trim() && { department: input.department.trim() }),
    ...(dateStartedRFC3339 && { date_started: dateStartedRFC3339 }),
    ...(input.avatar_url?.trim() && { avatar_url: input.avatar_url.trim() }),
    ...(input.supervisor_id?.trim() && { supervisor_id: input.supervisor_id.trim() }),
    ...(input.squad_ids?.length && { squad_ids: input.squad_ids.map(String) }),
  };

  const data = await client.request<{ createEmployee: GraphQLEmployee }>(
    CREATE_EMPLOYEE,
    { input: cleanedInput }
  );
  return toUser(data.createEmployee);
}

export interface UpdateEmployeeInput {
  first_name?: string;
  last_name?: string;
  role?: "supervisor" | "employee";
  department?: string;
  avatar_url?: string;
  supervisor_id?: string;
}

export async function updateEmployeeGraphQL(
  id: number,
  input: UpdateEmployeeInput
): Promise<User> {
  const client = createProxyGraphQLClient();
  const data = await client.request<{ updateEmployee: GraphQLEmployee }>(
    UPDATE_EMPLOYEE,
    { id: id.toString(), input }
  );
  return toUser(data.updateEmployee);
}

export async function deleteEmployeeGraphQL(id: number): Promise<boolean> {
  const client = createProxyGraphQLClient();
  const data = await client.request<{ deleteEmployee: boolean }>(
    DELETE_EMPLOYEE,
    { id: id.toString() }
  );
  return data.deleteEmployee;
}
