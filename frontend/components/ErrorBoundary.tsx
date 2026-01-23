"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  minimal?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 *
 * @example Basic usage
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * @example With custom fallback
 * ```tsx
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * @example With error callback
 * ```tsx
 * <ErrorBoundary onError={(error) => logToService(error)}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    if (process.env.NODE_ENV === "development") {
      console.error("Error caught by ErrorBoundary:", error);
      console.error("Component stack:", errorInfo.componentStack);
    }

    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { children, fallback, minimal } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      if (typeof fallback === "function") {
        return fallback(error!, this.resetError);
      }
      return fallback;
    }

    if (minimal) {
      return (
        <div className="p-4 bg-red-900/20 border border-red-500/30 text-center">
          <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-400 mb-2">Something went wrong</p>
          <button
            onClick={this.resetError}
            className="text-xs text-red-300 hover:text-red-200 underline"
          >
            Try again
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-[300px] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-theme-surface border border-theme-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-900/40 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-theme-text">
                Something went wrong
              </h2>
              <p className="text-sm text-theme-text-muted">
                An unexpected error occurred
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30">
              <p className="text-sm text-red-400 font-mono">{error.message}</p>
            </div>
          )}

          <div className="flex gap-3 mb-4">
            <button
              onClick={this.resetError}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-theme-border text-theme-text hover:bg-theme-elevated transition-colors"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </div>

          {process.env.NODE_ENV === "development" && errorInfo && (
            <div>
              <button
                onClick={this.toggleDetails}
                className="flex items-center gap-1 text-sm text-theme-text-muted hover:text-theme-text"
              >
                {showDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {showDetails ? "Hide" : "Show"} Error Details
              </button>

              {showDetails && (
                <div className="mt-3 p-3 bg-theme-elevated border border-theme-border overflow-auto max-h-48">
                  <pre className="text-xs text-theme-text-muted font-mono whitespace-pre-wrap">
                    {error?.stack}
                    {"\n\nComponent Stack:"}
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

/**
 * Query Error Fallback
 *
 * A fallback component designed for React Query errors.
 * Shows the error message with a retry button.
 */
export const QueryErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary?: () => void;
}) => {
  return (
    <div className="p-6 bg-theme-surface border border-theme-border">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-red-900/40 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-theme-text mb-1">
            Failed to load data
          </h3>
          <p className="text-sm text-theme-text-muted mb-3">{error.message}</p>
          {resetErrorBoundary && (
            <button
              onClick={resetErrorBoundary}
              className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
