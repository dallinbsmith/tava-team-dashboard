export type Role = "admin" | "supervisor" | "employee";

export interface Squad {
  id: number;
  name: string;
  created_at?: string;
}

export interface User {
  id: number;
  auth0_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  title: string;
  department: string;
  squads: Squad[];
  avatar_url?: string;
  supervisor_id?: number;
  date_started?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  jira_account_id?: string;
}

export interface Employee extends User {
  supervisor?: User;
}

export interface Supervisor extends User {
  direct_reports?: User[];
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  title?: string;
  department?: string;
  squad_ids?: number[];
  role?: Role;
  supervisor_id?: number | null;
  date_started?: string | null;
}
