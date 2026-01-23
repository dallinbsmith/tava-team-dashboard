"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Org Chart Error Boundary
 *
 * Catches errors specific to the organization chart feature and provides
 * contextual recovery options.
 */
export default function OrgChartError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Org chart error:", error);
  }, [error]);

  // Determine if this is a data loading error vs other error
  const isDataError =
    error.message?.toLowerCase().includes("fetch") ||
    error.message?.toLowerCase().includes("load") ||
    error.message?.toLowerCase().includes("network");

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-theme-surface border border-theme-border p-6 text-center">
        <div className="w-12 h-12 bg-red-900/40 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>

        <h2 className="text-lg font-semibold text-theme-text mb-2">
          Unable to Load Organization Chart
        </h2>

        <p className="text-theme-text-muted mb-4">
          {isDataError
            ? "We couldn't load the organization data. This might be a temporary connection issue."
            : error.message || "An unexpected error occurred while loading the organization chart."}
        </p>

        {isDataError && (
          <div className="bg-theme-elevated border border-theme-border p-3 mb-4 text-left text-sm">
            <p className="text-theme-text-muted">
              <strong className="text-theme-text">Tip:</strong> Check that:
            </p>
            <ul className="list-disc list-inside text-theme-text-muted mt-1 space-y-1">
              <li>Your internet connection is stable</li>
              <li>The backend server is running</li>
              <li>You have permission to view the org chart</li>
            </ul>
          </div>
        )}

        {error.digest && (
          <p className="text-xs text-theme-text-muted mb-4 font-mono">Error ID: {error.digest}</p>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Chart
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
            Need help? Contact your administrator or try viewing the{" "}
            <a href="/teams" className="text-primary-400 hover:text-primary-300">
              Teams page
            </a>{" "}
            instead.
          </p>
        </div>
      </div>
    </div>
  );
}
