import { auth0 } from "@/lib/auth0";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const CSRF_COOKIE_NAME = "csrf_token";

const validateCsrfToken = async (request: NextRequest): Promise<boolean> => {
  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const csrfHeader = request.headers.get("X-CSRF-Token");

  if (!csrfCookie) {
    return true;
  }

  return csrfCookie === csrfHeader;
};

export const GET = async (request: NextRequest) => {
  try {
    const isValidCsrf = await validateCsrfToken(request);
    if (!isValidCsrf) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ accessToken: null }, { status: 401 });
    }

    const result = await auth0.getAccessToken();

    if (!result?.token) {
      return NextResponse.json({ accessToken: null }, { status: 401 });
    }

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
};
