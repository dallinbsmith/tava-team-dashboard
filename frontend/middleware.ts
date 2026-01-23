import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";

// Routes that require authentication
const protectedRoutes = [
  "/",
  "/settings",
  "/admin",
  "/employee",
  "/calendar",
  "/time-off",
  "/orgchart",
];

export const middleware = async (request: NextRequest) => {
  // Let Auth0 handle its routes (/auth/login, /auth/logout, /auth/callback, etc.)
  const authResponse = await auth0.middleware(request);

  // If Auth0 middleware handled the request (auth routes), return its response
  if (authResponse.status !== 200 || request.nextUrl.pathname.startsWith("/auth")) {
    return authResponse;
  }

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) =>
      request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + "/")
  );

  if (isProtectedRoute) {
    const session = await auth0.getSession(request);

    if (!session) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("returnTo", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return authResponse;
};

export const config = {
  matcher: [
    // Match all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
