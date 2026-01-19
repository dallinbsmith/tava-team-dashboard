import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@auth0/nextjs-auth0/edge";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  try {
    const session = await getSession(request, response);

    if (!session) {
      const loginUrl = new URL("/api/auth/login", request.url);
      loginUrl.searchParams.set("returnTo", request.url);
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    // If we can't get the session, redirect to login
    const loginUrl = new URL("/api/auth/login", request.url);
    loginUrl.searchParams.set("returnTo", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/settings/:path*",
    "/admin/:path*",
    "/employee/:path*",
    "/calendar/:path*",
    "/time-off/:path*",
    "/orgchart/:path*",
  ],
};
