"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Calendar Error Boundary
 *
 * Catches errors specific to the calendar feature and provides
 * contextual recovery options.
 */
export default function CalendarError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Calendar error:", error);
  }, [error]);

  // Determine error type for contextual messaging
  const isJiraError = error.message?.toLowerCase().includes("jira");
  const isNetworkError =
    error.message?.toLowerCase().includes("fetch") ||
    error.message?.toLowerCase().includes("network");

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-theme-surface border border-theme-border p-6 text-center">
        <div className="w-12 h-12 bg-red-900/40 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>

        <h2 className="text-lg font-semibold text-theme-text mb-2">
          Unable to Load Calendar
        </h2>

        <p className="text-theme-text-muted mb-4">
          {isJiraError
            ? "There was a problem connecting to Jira. Your calendar events may not include Jira tickets."
            : isNetworkError
              ? "We couldn't load your calendar events. Please check your connection."
              : error.message ||
                "An unexpected error occurred while loading the calendar."}
        </p>

        {isJiraError && (
          <div className="bg-blue-900/20 border border-blue-500/30 p-3 mb-4 text-left text-sm">
            <p className="text-blue-300">
              <strong>Jira Integration Issue</strong>
            </p>
            <p className="text-blue-200/70 mt-1">
              You can still view tasks, meetings, and time off. Check your{" "}
              <a href="/settings" className="underline hover:text-blue-200">
                Jira settings
              </a>{" "}
              to reconnect.
            </p>
          </div>
        )}

        {isNetworkError && (
          <div className="bg-theme-elevated border border-theme-border p-3 mb-4 text-left text-sm">
            <p className="text-theme-text-muted">
              <strong className="text-theme-text">Troubleshooting:</strong>
            </p>
            <ul className="list-disc list-inside text-theme-text-muted mt-1 space-y-1">
              <li>Check your internet connection</li>
              <li>Refresh the page</li>
              <li>Try again in a few moments</li>
            </ul>
          </div>
        )}

        {error.digest && (
          <p className="text-xs text-theme-text-muted mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Calendar
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 border border-theme-border text-theme-text hover:bg-theme-elevated transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-theme-border">
          <p className="text-xs text-theme-text-muted">
            You can also manage time off from the{" "}
            <a
              href="/time-off"
              className="text-primary-400 hover:text-primary-300"
            >
              Time Off page
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
