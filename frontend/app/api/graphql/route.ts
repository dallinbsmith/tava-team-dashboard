import { auth0 } from "@/lib/auth0";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * GraphQL proxy route that forwards requests to the Go backend.
 * The access token is added server-side from Auth0 session cookies,
 * keeping it secure and never exposed to client JavaScript.
 */
export async function POST(request: NextRequest) {
  try {
    const result = await auth0.getAccessToken();
    const accessToken = result?.token;

    if (!accessToken) {
      return NextResponse.json(
        { errors: [{ message: "Unauthorized" }] },
        { status: 401 }
      );
    }

    const body = await request.text();

    const backendResponse = await fetch(`${BACKEND_URL}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body,
    });

    const responseData = await backendResponse.json();

    return NextResponse.json(responseData, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error("GraphQL proxy error:", error);
    return NextResponse.json(
      { errors: [{ message: "Internal server error" }] },
      { status: 500 }
    );
  }
}
