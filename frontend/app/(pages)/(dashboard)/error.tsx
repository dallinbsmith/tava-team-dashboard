"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Dashboard Error Boundary
 *
 * This component catches errors in the dashboard route segment and its children.
 * It provides a user-friendly error message and recovery options.
 */
export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-theme-surface border border-theme-border p-6 text-center">
        <div className="w-12 h-12 bg-red-900/40 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>

        <h2 className="text-lg font-semibold text-theme-text mb-2">
          Something went wrong
        </h2>

        <p className="text-theme-text-muted mb-6">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>

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
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 border border-theme-border text-theme-text hover:bg-theme-elevated transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
