import { Invitation, CreateInvitationRequest } from "./types";
import { User } from "@/shared/types/user";

const API_BASE_URL = "/api/proxy";
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function fetchWithProxy(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...options.headers, "Content-Type": "application/json" },
    credentials: "same-origin",
  });
}

async function handleResponse<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new Error(error || errorMessage);
  }
  return response.json();
}

// Authenticated invitation management
export async function getInvitations(): Promise<Invitation[]> {
  const response = await fetchWithProxy("/invitations");
  return handleResponse<Invitation[]>(response, "Failed to fetch invitations");
}

export async function createInvitation(data: CreateInvitationRequest): Promise<Invitation> {
  const response = await fetchWithProxy("/invitations", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse<Invitation>(response, "Failed to create invitation");
}

export async function revokeInvitation(id: number): Promise<void> {
  const response = await fetchWithProxy(`/invitations/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to revoke invitation");
}

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

export async function validateInvitation(token: string): Promise<ValidateInvitationResponse> {
  const response = await fetch(`${BACKEND_URL}/api/invitations/validate/${token}`);
  if (!response.ok) throw new Error("Invalid invitation");
  return response.json();
}

export async function acceptInvitation(token: string, data: AcceptInvitationRequest): Promise<User> {
  const response = await fetch(`${BACKEND_URL}/api/invitations/accept/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await response.text().catch(() => "Failed to accept invitation"));
  return response.json();
}
