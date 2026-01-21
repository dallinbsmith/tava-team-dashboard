import { auth0 } from "./auth0";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export interface ProxyOptions {
  requireAuth?: boolean;
  method?: string;
  backendPath?: string;
}

const jsonError = (error: string, status: number, details?: string) =>
  NextResponse.json(details ? { error, details } : { error }, { status });

async function getToken(requireAuth: boolean): Promise<string | null | "error"> {
  if (!requireAuth) return null;
  try {
    const result = await auth0.getAccessToken();
    return result?.token ?? "error";
  } catch (e) {
    console.error("Failed to get access token:", e);
    return "error";
  }
}

async function getBody(request: NextRequest): Promise<string | undefined> {
  if (request.method === "GET" || request.method === "HEAD") return undefined;
  try {
    return await request.text();
  } catch {
    return undefined;
  }
}

async function parseResponse(res: Response): Promise<{ body: string | object; contentType: string | null } | null> {
  const contentType = res.headers.get("content-type");
  try {
    const body = contentType?.includes("application/json") ? await res.json() : await res.text();
    return { body, contentType };
  } catch (e) {
    console.error("Proxy: Failed to parse response:", e);
    return null;
  }
}

/** Proxies a request to the Go backend with server-side token handling. */
export async function proxyToBackend(request: NextRequest, options: ProxyOptions = {}): Promise<NextResponse> {
  const { requireAuth = true, method, backendPath } = options;

  try {
    const token = await getToken(requireAuth);
    if (token === "error") return jsonError("Unauthorized - please log in again", 401);

    const url = new URL(request.url);
    const path = backendPath || url.pathname.replace(/^\/api\/proxy/, "/api");
    const backendUrl = `${BACKEND_URL}${path}${url.search}`;

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // Forward impersonation header if present
    const impersonateHeader = request.headers.get("X-Impersonate-User-Id");
    if (impersonateHeader) headers["X-Impersonate-User-Id"] = impersonateHeader;

    console.log(`Proxy: Fetching ${backendUrl}`);
    const res = await fetch(backendUrl, { method: method || request.method, headers, body: await getBody(request) });
    console.log(`Proxy: Backend responded with status ${res.status}`);

    // Handle 204 No Content responses - return empty response with no body
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const parsed = await parseResponse(res);
    if (!parsed) return jsonError("Failed to parse backend response", 502);

    return typeof parsed.body === "string"
      ? new NextResponse(parsed.body, { status: res.status, headers: { "Content-Type": parsed.contentType || "text/plain" } })
      : NextResponse.json(parsed.body, { status: res.status });
  } catch (error) {
    console.error("Proxy error:", error);
    return jsonError("Internal server error", 500, error instanceof Error ? error.message : "Unknown error");
  }
}

/**
 * Creates a simple proxy handler for a specific backend path pattern.
 */
export function createProxyHandler(options: ProxyOptions = {}) {
  return async function handler(request: NextRequest) {
    return proxyToBackend(request, options);
  };
}
