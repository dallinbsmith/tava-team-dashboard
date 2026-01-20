import { auth0 } from "@/lib/auth0";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const CSRF_COOKIE_NAME = "csrf_token";

// Validate CSRF token from header matches cookie
async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const csrfHeader = request.headers.get("X-CSRF-Token");

  // If no CSRF cookie exists, allow the request (first request scenario)
  // The client will fetch CSRF token and include it in subsequent requests
  if (!csrfCookie) {
    return true;
  }

  // If cookie exists, header must match
  return csrfCookie === csrfHeader;
}

export async function GET(request: NextRequest) {
  try {
    // Validate CSRF token
    const isValidCsrf = await validateCsrfToken(request);
    if (!isValidCsrf) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }

    // Get the session to check if user is authenticated
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ accessToken: null }, { status: 401 });
    }

    // Get access token with refresh if needed
    const result = await auth0.getAccessToken();

    if (!result?.token) {
      return NextResponse.json({ accessToken: null }, { status: 401 });
    }

    // Calculate expiry from the token result or use default
    const expiresIn = result.expiresAt
      ? Math.floor((result.expiresAt * 1000 - Date.now()) / 1000)
      : 3600;

    return NextResponse.json({
      accessToken: result.token,
      expiresIn,
    });
  } catch {
    return NextResponse.json({ accessToken: null }, { status: 401 });
  }
}
