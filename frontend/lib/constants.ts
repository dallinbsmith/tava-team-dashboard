/**
 * Shared constants used across the application
 * Centralizes magic numbers for easier maintenance and consistency
 */

// =============================================================================
// PAGINATION
// =============================================================================

export const PAGINATION = {
  /** Default items per page for general lists */
  DEFAULT: 10,
  /** Items per page in squad breakdown widget */
  SQUADS: 6,
  /** Items per page in time-off requests widget */
  TIME_OFF: 4,
  /** Items per page in team members widget */
  TEAM_MEMBERS: 8,
} as const;

// =============================================================================
// JIRA TASK LIMITS
// =============================================================================

export const JIRA_LIMITS = {
  /** Default max results for Jira task queries */
  TASKS_DEFAULT: 50,
  /** Max results for compact/widget views */
  TASKS_COMPACT: 5,
  /** Max results per user for team task queries (full view) */
  TEAM_TASKS_DEFAULT: 20,
  /** Max results per user for team task queries (compact view) */
  TEAM_TASKS_COMPACT: 5,
  /** Default max results for epic queries */
  EPICS_DEFAULT: 100,
} as const;

// =============================================================================
// CACHE / STALE TIMES (in milliseconds)
// =============================================================================

export const STALE_TIMES = {
  /** 5 minutes - standard stale time for most queries */
  STANDARD: 5 * 60 * 1000,
  /** 1 minute - for frequently changing data */
  SHORT: 1 * 60 * 1000,
  /** 15 minutes - for rarely changing data */
  LONG: 15 * 60 * 1000,
} as const;

export const GC_TIMES = {
  /** 30 minutes - standard garbage collection time */
  STANDARD: 30 * 60 * 1000,
} as const;

// =============================================================================
// CALENDAR EVENT COLORS
// =============================================================================

export const CALENDAR_COLORS = {
  /** Event type base colors */
  EVENT_TYPES: {
    epic: "#6366f1",
    jira: "#0052cc",
    task: "#059669",
    meeting: "#7c3aed",
    time_off: "#d97706",
  },
  /** Pending time off color (darker amber) */
  PENDING_TIME_OFF: "#92400e",
  /** Default event color (blue) */
  DEFAULT: "#3b82f6",
  /** Hover/lighter variants for event types */
  EVENT_TYPE_HOVER: {
    epic: "#818cf8",
    jira: "#2684ff",
    task: "#34d399",
    meeting: "#a78bfa",
    time_off: "#fbbf24",
  },
} as const;

// =============================================================================
// UI CONSTANTS
// =============================================================================

export const UI = {
  /** Number of days to consider a due date as "approaching" */
  APPROACHING_DAYS_THRESHOLD: 7,
  /** Animation delay increment for staggered animations (ms) */
  STAGGER_DELAY: 100,
} as const;

// =============================================================================
// ANIMATION CONSTANTS
// =============================================================================

export const ANIMATION = {
  /** Duration for number counting animations (ms) */
  COUNT_DURATION_MS: 1000,
  /** Number of steps for smooth counting animations */
  COUNT_STEPS: 30,
} as const;

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

export const TOKEN = {
  /** Buffer time before token expiry to trigger refresh (ms) - 60 seconds */
  EXPIRY_BUFFER_MS: 60 * 1000,
  /** Default token expiry time if not provided by server (seconds) */
  DEFAULT_EXPIRY_SECONDS: 3600,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/** Async no-op function for default/placeholder async callbacks */
export const asyncNoop = async () => {};
