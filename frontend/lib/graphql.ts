import { GraphQLClient, gql } from "graphql-request";
import { User } from "@/shared/types";

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
 * The accessToken parameter is kept for backward compatibility but ignored.
 * @deprecated The accessToken parameter is no longer needed. Use createProxyGraphQLClient() instead.
 */
export function createGraphQLClient(accessToken?: string) {
  return new GraphQLClient(getGraphQLProxyURL(), {
    credentials: "same-origin", // Include cookies for session
  });
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

// GraphQL Queries
export const GET_EMPLOYEES = gql`
  query GetEmployees {
    employees {
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
      supervisor {
        id
        first_name
        last_name
        email
      }
    }
  }
`;

export const GET_EMPLOYEE = gql`
  query GetEmployee($id: ID!) {
    employee(id: $id) {
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
      supervisor {
        id
        first_name
        last_name
        email
      }
      direct_reports {
        id
        first_name
        last_name
        email
        role
        title
      }
    }
  }
`;

export const GET_ME = gql`
  query GetMe {
    me {
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
  }
`;

// GraphQL Mutations
export const CREATE_EMPLOYEE = gql`
  mutation CreateEmployee($input: CreateEmployeeInput!) {
    createEmployee(input: $input) {
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
  }
`;

export const UPDATE_EMPLOYEE = gql`
  mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) {
    updateEmployee(id: $id, input: $input) {
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
    created_at: employee.created_at,
    updated_at: employee.updated_at,
  };
}

// API functions using GraphQL
// Note: accessToken parameters are kept for backward compatibility but ignored.
// The proxy handles token management server-side.

export async function getEmployeesGraphQL(
  accessToken?: string
): Promise<User[]> {
  const client = createProxyGraphQLClient();
  const data = await client.request<{ employees: GraphQLEmployee[] }>(
    GET_EMPLOYEES
  );
  return data.employees.map(toUser);
}

export async function getEmployeeGraphQL(
  accessToken: string | undefined,
  id: number
): Promise<User> {
  const client = createProxyGraphQLClient();
  const data = await client.request<{ employee: GraphQLEmployee }>(
    GET_EMPLOYEE,
    { id: id.toString() }
  );
  return toUser(data.employee);
}

export async function getCurrentUserGraphQL(
  accessToken?: string
): Promise<User> {
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
}

export async function createEmployeeGraphQL(
  accessToken: string | undefined,
  input: CreateEmployeeInput
): Promise<User> {
  const client = createProxyGraphQLClient();
  const data = await client.request<{ createEmployee: GraphQLEmployee }>(
    CREATE_EMPLOYEE,
    { input }
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
  accessToken: string | undefined,
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

export async function deleteEmployeeGraphQL(
  accessToken: string | undefined,
  id: number
): Promise<boolean> {
  const client = createProxyGraphQLClient();
  const data = await client.request<{ deleteEmployee: boolean }>(
    DELETE_EMPLOYEE,
    { id: id.toString() }
  );
  return data.deleteEmployee;
}
