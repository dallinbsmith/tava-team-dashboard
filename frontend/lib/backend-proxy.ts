import { getAccessToken } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export interface ProxyOptions {
  // Whether to require authentication
  requireAuth?: boolean;
  // HTTP method to use (defaults to request method)
  method?: string;
  // Custom path to forward to (defaults to stripping /api/proxy prefix)
  backendPath?: string;
}

/**
 * Proxies a request to the Go backend with server-side token handling.
 * The access token is never exposed to the client - it's added server-side.
 */
export async function proxyToBackend(
  request: NextRequest,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const { requireAuth = true, method, backendPath } = options;

  try {
    // Get access token server-side (from Auth0 session cookies)
    let accessToken: string | undefined;
    if (requireAuth) {
      try {
        const tokenResult = await getAccessToken();
        accessToken = tokenResult.accessToken;
      } catch (tokenError) {
        console.error("Failed to get access token:", tokenError);
        return NextResponse.json(
          { error: "Unauthorized - please log in again" },
          { status: 401 }
        );
      }

      if (!accessToken) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Determine the backend path
    const url = new URL(request.url);
    const path = backendPath || url.pathname.replace(/^\/api\/proxy/, "/api");
    const backendUrl = `${BACKEND_URL}${path}${url.search}`;

    // Build headers for backend request
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    // Get request body if present
    let body: string | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        body = await request.text();
      } catch {
        // No body
      }
    }

    // Make the request to the backend
    console.log(`Proxy: Fetching ${backendUrl}`);
    const backendResponse = await fetch(backendUrl, {
      method: method || request.method,
      headers,
      body,
    });
    console.log(`Proxy: Backend responded with status ${backendResponse.status}`);

    // Get response body
    const contentType = backendResponse.headers.get("content-type");
    let responseBody: string | object;

    try {
      if (contentType?.includes("application/json")) {
        responseBody = await backendResponse.json();
      } else {
        responseBody = await backendResponse.text();
      }
    } catch (parseError) {
      console.error("Proxy: Failed to parse response:", parseError);
      return NextResponse.json(
        { error: "Failed to parse backend response" },
        { status: 502 }
      );
    }

    // Return the proxied response
    if (typeof responseBody === "string") {
      return new NextResponse(responseBody, {
        status: backendResponse.status,
        headers: {
          "Content-Type": contentType || "text/plain",
        },
      });
    }

    return NextResponse.json(responseBody, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
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
