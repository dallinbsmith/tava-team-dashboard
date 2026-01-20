import { auth0 } from "@/lib/auth0";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

// This handles the OAuth callback from Atlassian
// It receives the code and state, then forwards them to the backend
export async function GET(request: NextRequest) {
  try {
    // Get the authorization code and state from query params
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      // Redirect to settings page with error
      const settingsUrl = new URL("/settings", request.url);
      settingsUrl.searchParams.set("jira_error", error);
      if (errorDescription) {
        settingsUrl.searchParams.set("jira_error_description", errorDescription);
      }
      return NextResponse.redirect(settingsUrl);
    }

    if (!code || !state) {
      const settingsUrl = new URL("/settings", request.url);
      settingsUrl.searchParams.set("jira_error", "missing_params");
      settingsUrl.searchParams.set("jira_error_description", "Missing code or state parameter");
      return NextResponse.redirect(settingsUrl);
    }

    // Get access token for backend request
    const result = await auth0.getAccessToken();
    const accessToken = result?.token;

    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Forward the code and state to the backend to exchange for tokens
    const backendUrl = `${BACKEND_URL}/api/jira/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      const settingsUrl = new URL("/settings", request.url);
      settingsUrl.searchParams.set("jira_error", "exchange_failed");
      settingsUrl.searchParams.set("jira_error_description", errorText);
      return NextResponse.redirect(settingsUrl);
    }

    const data = await backendResponse.json();

    // Redirect to settings page with success
    const settingsUrl = new URL("/settings", request.url);
    settingsUrl.searchParams.set("jira_connected", "true");
    if (data.site_name) {
      settingsUrl.searchParams.set("jira_site", data.site_name);
    }
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    console.error("Jira OAuth callback error:", error);
    const settingsUrl = new URL("/settings", request.url);
    settingsUrl.searchParams.set("jira_error", "internal_error");
    settingsUrl.searchParams.set("jira_error_description", "An internal error occurred");
    return NextResponse.redirect(settingsUrl);
  }
}
