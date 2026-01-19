import { getAccessToken, getSession } from "@auth0/nextjs-auth0";
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
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ accessToken: null }, { status: 401 });
    }

    // Get access token with refresh if needed
    // Auth0 SDK handles refresh token rotation automatically via HTTP-only cookies
    const { accessToken } = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json({ accessToken: null }, { status: 401 });
    }

    // Calculate expiry - Auth0 v3 doesn't expose this directly,
    // so we use a conservative 1 hour default
    // The actual token may be valid longer, but we'll refresh proactively
    const expiresIn = 3600; // 1 hour in seconds

    return NextResponse.json({
      accessToken,
      expiresIn,
    });
  } catch {
    return NextResponse.json({ accessToken: null }, { status: 401 });
  }
}
