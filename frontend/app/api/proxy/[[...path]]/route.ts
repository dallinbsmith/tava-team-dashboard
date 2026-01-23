import { proxyToBackend } from "@/lib/backend-proxy";
import { NextRequest } from "next/server";

/**
 * Catch-all proxy route that forwards requests to the Go backend.
 *
 * This keeps the Auth0 access token server-side only - it's never exposed
 * to client JavaScript. The token is retrieved from Auth0 session cookies
 * and added to the backend request server-side.
 *
 * Example mappings:
 *   /api/proxy/me          -> /api/me
 *   /api/proxy/employees   -> /api/employees
 *   /api/proxy/users/1     -> /api/users/1
 *   /api/proxy/jira/tasks  -> /api/jira/tasks
 */

export const GET = async (request: NextRequest) => {
  return proxyToBackend(request);
};

export const POST = async (request: NextRequest) => {
  return proxyToBackend(request);
};

export const PUT = async (request: NextRequest) => {
  return proxyToBackend(request);
};

export const DELETE = async (request: NextRequest) => {
  return proxyToBackend(request);
};

export const PATCH = async (request: NextRequest) => {
  return proxyToBackend(request);
};
