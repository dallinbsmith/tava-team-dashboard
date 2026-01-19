import { Role, User } from "../../../../shared/types/user";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface Invitation {
  id: number;
  email: string;
  role: Role;
  department?: string;
  squad_ids?: number[];
  token?: string;
  invited_by_id: number;
  invited_by?: User;
  status: InvitationStatus;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInvitationRequest {
  email: string;
  role: "admin" | "supervisor";
  department?: string;
  squad_ids?: number[];
}
