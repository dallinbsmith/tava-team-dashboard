import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./shared/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary color palette using CSS variables
        primary: {
          50: "rgb(var(--color-primary-50) / <alpha-value>)",
          100: "rgb(var(--color-primary-100) / <alpha-value>)",
          200: "rgb(var(--color-primary-200) / <alpha-value>)",
          300: "rgb(var(--color-primary-300) / <alpha-value>)",
          400: "rgb(var(--color-primary-400) / <alpha-value>)",
          500: "rgb(var(--color-primary-500) / <alpha-value>)",
          600: "rgb(var(--color-primary-600) / <alpha-value>)",
          700: "rgb(var(--color-primary-700) / <alpha-value>)",
          800: "rgb(var(--color-primary-800) / <alpha-value>)",
          900: "rgb(var(--color-primary-900) / <alpha-value>)",
          950: "rgb(var(--color-primary-950) / <alpha-value>)",
        },
        // Secondary color palette using CSS variables
        secondary: {
          50: "rgb(var(--color-secondary-50) / <alpha-value>)",
          100: "rgb(var(--color-secondary-100) / <alpha-value>)",
          200: "rgb(var(--color-secondary-200) / <alpha-value>)",
          300: "rgb(var(--color-secondary-300) / <alpha-value>)",
          400: "rgb(var(--color-secondary-400) / <alpha-value>)",
          500: "rgb(var(--color-secondary-500) / <alpha-value>)",
          600: "rgb(var(--color-secondary-600) / <alpha-value>)",
          700: "rgb(var(--color-secondary-700) / <alpha-value>)",
          800: "rgb(var(--color-secondary-800) / <alpha-value>)",
          900: "rgb(var(--color-secondary-900) / <alpha-value>)",
          950: "rgb(var(--color-secondary-950) / <alpha-value>)",
        },
        // Accent color palette using CSS variables
        accent: {
          50: "rgb(var(--color-accent-50) / <alpha-value>)",
          100: "rgb(var(--color-accent-100) / <alpha-value>)",
          200: "rgb(var(--color-accent-200) / <alpha-value>)",
          300: "rgb(var(--color-accent-300) / <alpha-value>)",
          400: "rgb(var(--color-accent-400) / <alpha-value>)",
          500: "rgb(var(--color-accent-500) / <alpha-value>)",
          600: "rgb(var(--color-accent-600) / <alpha-value>)",
          700: "rgb(var(--color-accent-700) / <alpha-value>)",
          800: "rgb(var(--color-accent-800) / <alpha-value>)",
          900: "rgb(var(--color-accent-900) / <alpha-value>)",
          950: "rgb(var(--color-accent-950) / <alpha-value>)",
        },
        // Status colors
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        error: "rgb(var(--color-error) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",

        // Semantic theme colors
        theme: {
          // Backgrounds
          base: "rgb(var(--bg-base) / <alpha-value>)",
          surface: "rgb(var(--bg-surface) / <alpha-value>)",
          elevated: "rgb(var(--bg-elevated) / <alpha-value>)",
          muted: "rgb(var(--bg-muted) / <alpha-value>)",
          subtle: "rgb(var(--bg-subtle) / <alpha-value>)",

          // Sidebar
          sidebar: "rgb(var(--bg-sidebar) / <alpha-value>)",
          "sidebar-hover": "rgb(var(--bg-sidebar-hover) / <alpha-value>)",
          "sidebar-active": "rgb(var(--bg-sidebar-active) / <alpha-value>)",

          // Text
          text: "rgb(var(--text-base) / <alpha-value>)",
          "text-muted": "rgb(var(--text-muted) / <alpha-value>)",
          "text-subtle": "rgb(var(--text-subtle) / <alpha-value>)",
          "text-inverted": "rgb(var(--text-inverted) / <alpha-value>)",

          // Borders
          border: "rgb(var(--border-base) / <alpha-value>)",
          "border-muted": "rgb(var(--border-muted) / <alpha-value>)",
          "border-subtle": "rgb(var(--border-subtle) / <alpha-value>)",

          // Input
          input: "rgb(var(--input-bg) / <alpha-value>)",
          "input-border": "rgb(var(--input-border) / <alpha-value>)",
          "input-focus": "rgb(var(--input-border-focus) / <alpha-value>)",

          // Interactive
          "focus-ring": "rgb(var(--focus-ring) / <alpha-value>)",
          divider: "rgb(var(--divider) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "Manrope", "system-ui", "sans-serif"],
        primary: ["var(--font-manrope)", "Manrope", "system-ui", "sans-serif"],
        secondary: ["var(--font-manrope)", "Manrope", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)"],
      },
      fontWeight: {
        light: "300",
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-base)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)",
        "4xl": "var(--text-4xl)",
      },
      borderRadius: {
        none: "var(--radius-none)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      spacing: {
        xs: "var(--spacing-xs)",
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
        xl: "var(--spacing-xl)",
        "2xl": "var(--spacing-2xl)",
      },
      transitionDuration: {
        fast: "var(--transition-fast)",
        normal: "var(--transition-normal)",
        slow: "var(--transition-slow)",
      },
      backgroundColor: {
        // Convenient aliases
        "app-base": "rgb(var(--bg-base) / <alpha-value>)",
        "app-surface": "rgb(var(--bg-surface) / <alpha-value>)",
        "app-elevated": "rgb(var(--bg-elevated) / <alpha-value>)",
      },
      textColor: {
        // Convenient aliases
        "app-base": "rgb(var(--text-base) / <alpha-value>)",
        "app-muted": "rgb(var(--text-muted) / <alpha-value>)",
        "app-subtle": "rgb(var(--text-subtle) / <alpha-value>)",
      },
      borderColor: {
        // Convenient aliases
        "app-base": "rgb(var(--border-base) / <alpha-value>)",
        "app-muted": "rgb(var(--border-muted) / <alpha-value>)",
      },
    },
  },
  plugins: [],
} satisfies Config;
