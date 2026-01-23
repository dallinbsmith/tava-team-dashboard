/**
 * Common style constants for consistent UI across the application.
 * Use with cn() for conditional styling.
 */

// Internal base styles (not exported - used for composition)
const inputBase =
  "w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text";

const inputFocus =
  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

const buttonBase =
  "px-4 py-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

// Input styles
export const inputStyles = `${inputBase} ${inputFocus}`;

// Select/dropdown trigger styles (looks like input but is a button)
export const selectTriggerStyles =
  `${inputBase} ${inputFocus} text-left flex items-center justify-between`;

// Button styles
export const buttonPrimary =
  `${buttonBase} bg-primary-500 text-white hover:bg-primary-600`;

export const buttonSecondary =
  `${buttonBase} border border-theme-border text-theme-text hover:bg-theme-elevated`;

// Modal styles
export const modalOverlay = "fixed inset-0 z-50 flex items-center justify-center";

export const modalBackdrop = "absolute inset-0 bg-black/50";

export const modalHeader =
  "flex items-center justify-between p-4 border-b border-theme-border";

export const modalTitle = "text-lg font-semibold text-theme-text";

// Error/alert styles
export const errorAlert =
  "bg-red-900/30 border border-red-500/30 p-3 text-red-400 text-sm";

// Label styles
export const labelStyles = "block text-sm font-medium text-theme-text-muted mb-1";

// Dropdown menu styles
export const dropdownMenu =
  "absolute z-10 mt-1 w-full bg-theme-surface border border-theme-border shadow-lg max-h-60 overflow-auto";

export const dropdownItem =
  "w-full px-3 py-2 text-left hover:bg-theme-elevated text-theme-text";

// Skeleton loading styles
export const skeleton = "animate-pulse bg-theme-elevated rounded";

// Badge styles (small tags/chips)
const badgeBase = "inline-flex items-center px-2 py-0.5 text-xs font-medium border";
export const badge = `${badgeBase} bg-theme-elevated text-theme-text-muted border-theme-border`;
export const badgeRounded = `${badge} rounded`;
export const badgePrimary = `${badgeBase} bg-primary-900/30 text-primary-300 border-primary-500/30`;
export const badgePrimaryHover = `${badgePrimary} hover:bg-primary-900/50 hover:border-primary-500/50 transition-colors`;

// Role badge styles
export const badgeSupervisor = `${badgeBase} bg-purple-900/30 text-purple-300 border-purple-500/30`;
export const badgeAdmin = `${badgeBase} bg-amber-900/30 text-amber-300 border-amber-500/30`;
export const badgeEmployee = `${badgePrimary}`;

// Pill badge (rounded-full variant)
export const pillBase = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium";
export const pillSupervisor = `${pillBase} bg-purple-900/30 text-purple-300 border border-purple-500/30`;
export const pillAdmin = `${pillBase} bg-amber-900/30 text-amber-300 border border-amber-500/30`;
export const pillEmployee = `${pillBase} bg-primary-900/30 text-primary-300 border border-primary-500/30`;

// Icon container styles
export const iconContainer = "flex items-center justify-center rounded flex-shrink-0";
export const iconContainerSm = `${iconContainer} w-7 h-7 sm:w-8 sm:h-8 bg-theme-elevated transition-colors`;
export const iconContainerHover = `${iconContainerSm} group-hover:bg-primary-900/30`;

// Dropdown item button (full width menu items)
export const dropdownItemButton = "w-full flex items-center gap-2 px-4 py-2.5 text-sm text-theme-text hover:bg-theme-elevated transition-colors";

// Card styles
export const cardBase = "bg-theme-surface border border-theme-border";
export const cardHover = `${cardBase} hover:border-primary-500/50 hover:shadow-lg transition-all`;
export const cardInteractive = `${cardHover} hover:scale-[1.02] duration-300`;

// Table header styles
export const tableHeader = "text-left px-4 py-3 text-xs font-semibold text-theme-text-muted uppercase tracking-wider";
export const tableHeaderSortable = `${tableHeader} cursor-pointer hover:bg-theme-surface/50 transition-colors`;

// Widget container
export const widgetContainer = "bg-theme-surface border border-theme-border overflow-hidden flex flex-col";
export const widgetHeader = "px-6 py-4 border-b border-theme-border flex items-center justify-between";
export const widgetFooter = "px-6 py-3 bg-theme-elevated border-t border-theme-border mt-auto";
