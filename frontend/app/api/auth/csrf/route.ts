import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

// CSRF token generation and validation
// The token is stored in an HTTP-only cookie and returned to the client
// Client must send the token in the X-CSRF-Token header for protected endpoints

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_TOKEN_LENGTH = 32;

export async function GET() {
  const cookieStore = await cookies();
  let csrfToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  // Generate new token if none exists
  if (!csrfToken) {
    csrfToken = randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
  }

  const response = NextResponse.json({ csrfToken });

  // Set the CSRF token in an HTTP-only cookie
  // SameSite=Strict prevents the cookie from being sent with cross-site requests
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return response;
}
