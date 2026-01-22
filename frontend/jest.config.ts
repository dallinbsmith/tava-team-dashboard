import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  collectCoverageFrom: [
    "**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
    "!jest.config.ts",
    "!jest.setup.ts",
    "!next.config.ts",
    "!postcss.config.mjs",
    "!tailwind.config.ts",
  ],
  // Coverage thresholds for tested files
  // These ensure code quality doesn't regress
  coverageThreshold: {
    // Tested utility files - maintain high coverage
    "lib/errors.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    "lib/queryKeys.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    "lib/api-utils.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // Tested hooks - maintain high coverage
    "hooks/useModalManager.ts": {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: 90,
    },
    "hooks/useAsyncOperation.ts": {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: 90,
    },
    "hooks/queries/useCurrentUserQuery.ts": {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: 90,
    },
    "hooks/queries/useEmployeesQuery.ts": {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: 90,
    },
    // Tested UI components - maintain high coverage
    "components/ui/Button.tsx": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    "components/ui/StatusBadge.tsx": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // Tested filter components - maintain high coverage
    "components/filters/FilterCheckbox.tsx": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    "components/filters/SearchableFilterList.tsx": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    "components/filters/FilterDropdown.tsx": {
      branches: 80,
      functions: 80,
      lines: 90,
      statements: 90,
    },
    // Tested modal components
    "components/BaseModal.tsx": {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: 90,
    },
    "components/CreateEmployeeModal.tsx": {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // Tested providers
    "providers/CurrentUserProvider.tsx": {
      branches: 70,
      functions: 80,
      lines: 85,
      statements: 85,
    },
    "providers/QueryProvider.tsx": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    "providers/ImpersonationProvider.tsx": {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    "providers/OrganizationProvider.tsx": {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "providers/AppProviders.tsx": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // Query hooks
    "hooks/queries/useAllUsersQuery.ts": {
      branches: 80,
      functions: 90,
      lines: 85,
      statements: 85,
    },
    "hooks/queries/useSquadsQuery.ts": {
      branches: 80,
      functions: 90,
      lines: 85,
      statements: 85,
    },
    // Mutation hooks
    "hooks/mutations/useEmployeeMutations.ts": {
      branches: 80,
      functions: 90,
      lines: 85,
      statements: 85,
    },
    "hooks/mutations/useDepartmentMutations.ts": {
      branches: 80,
      functions: 90,
      lines: 85,
      statements: 85,
    },
    // Shared common components
    "shared/common/Avatar.tsx": {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    "shared/common/Pagination.tsx": {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    "shared/common/GroupedSection.tsx": {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    "shared/common/Sidebar.tsx": {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "shared/common/ImpersonationBanner.tsx": {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    "shared/common/ConfirmationModal.tsx": {
      branches: 55,
      functions: 80,
      lines: 60,
      statements: 60,
    },
    // UI components
    "components/ui/EmptyState.tsx": {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    "components/ui/ErrorAlert.tsx": {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    "components/ui/FormField.tsx": {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "components/ui/LoadingSpinner.tsx": {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    // Other hooks
    "hooks/useEmployeeList.ts": {
      branches: 85,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    // ErrorBoundary
    "components/ErrorBoundary.tsx": {
      branches: 60,
      functions: 70,
      lines: 75,
      statements: 75,
    },
    // OrgChart components
    "app/(pages)/(dashboard)/orgchart/components/FilterButton.tsx": {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90,
    },
    "app/(pages)/(dashboard)/orgchart/components/OrgChartTreeSkeleton.tsx": {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    "app/(pages)/(dashboard)/orgchart/components/EmployeeCard.tsx": {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};

export default createJestConfig(config);
