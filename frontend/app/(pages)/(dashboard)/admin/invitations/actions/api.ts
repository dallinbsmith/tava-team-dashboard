import { Invitation, CreateInvitationRequest } from "../types";
import { User } from "@/shared/types/user";
import { fetchWithProxy, handleResponse } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-utils";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Authenticated invitation management
export const getInvitations = async (): Promise<Invitation[]> => {
  const response = await fetchWithProxy("/invitations");
  return handleResponse<Invitation[]>(response, "Failed to fetch invitations");
};

export const createInvitation = async (
  data: CreateInvitationRequest,
): Promise<Invitation> => {
  const response = await fetchWithProxy("/invitations", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<Invitation>(response, "Failed to create invitation");
};

export const revokeInvitation = async (id: number): Promise<void> => {
  const response = await fetchWithProxy(`/invitations/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to revoke invitation");
};

// Public invitation endpoints (no auth - direct to backend)
export interface ValidateInvitationResponse {
  valid: boolean;
  email: string;
  role: string;
  expires_at: string;
  status: string;
}

export interface AcceptInvitationRequest {
  auth0_id: string;
  first_name: string;
  last_name: string;
}

export const validateInvitation = async (
  token: string,
): Promise<ValidateInvitationResponse> => {
  const response = await fetch(
    `${BACKEND_URL}/api/invitations/validate/${token}`,
  );
  if (!response.ok) throw new Error("Invalid invitation");
  return response.json();
};

export const acceptInvitation = async (
  token: string,
  data: AcceptInvitationRequest,
): Promise<User> => {
  const response = await fetch(
    `${BACKEND_URL}/api/invitations/accept/${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!response.ok)
    throw new Error(
      await extractErrorMessage(response, "Failed to accept invitation"),
    );
  return response.json();
};
