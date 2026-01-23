# CLAUDE.md - Development Guidelines

This document captures the coding standards and best practices for this codebase. Follow these guidelines to maintain consistency and quality.

## Code Style

### Comments
- **No JSX comments** - Do not add comments like `{/* Header */}` or `{/* Content */}` to describe UI sections
- **Comments are for complexity only** - Only add comments to explain genuinely complex logic that isn't self-evident from the code
- **Use sparingly** - If you need a comment, consider if the code could be refactored to be self-documenting instead
- **No section dividers** - Avoid `// ============` style dividers or file header comments
- **No JSDoc for obvious functions** - Don't document what the function name already tells you

### Functions
- **Arrow functions over function declarations** - Use `const fn = () => {}` instead of `function fn() {}`
- **Exception**: Default exports for React components may use function declarations
- **Keep functions small** - If a function is doing too much, break it up

### TypeScript
- **Interfaces over inline types** - Extract repeated type shapes into named interfaces
- **No `any`** - Use specific types; if truly unknown, use `unknown` with type guards
- **Remove unused imports** - ESLint will catch these; fix them immediately

## Component Architecture

### Single Responsibility
- Keep components small and focused on one thing
- If a component fetches data, formats it, AND renders complex UI, break it up
- Extract logic into custom hooks when it becomes complex

### Folder Structure
- Group by feature, not by file type
- Each feature folder contains its components, hooks, types, and actions:
  ```
  app/(pages)/(dashboard)/calendar/
  ├── actions/
  ├── components/
  ├── types.ts
  ├── hooks.ts
  └── CalendarPageClient.tsx
  ```

### Functional Components Only
- No class components
- Use hooks for state and side effects

## State Management

### Keep State Local
- Don't reach for Context or global state immediately
- Keep state as close to where it's used as possible
- Only lift state when siblings genuinely need to share it

### Derived State
- Don't store in `useState` what can be calculated from props or existing state
- Bad: `const [filteredList, setFilteredList] = useState(...)`
- Good: `const filteredList = useMemo(() => list.filter(...), [list, query])`

### React Query for Server State
- Use React Query (`@tanstack/react-query`) for all server data
- Centralize query keys in `lib/query-keys.ts`
- Let React Query handle caching, refetching, and loading states

## Performance

### Memoization
- Use `useMemo` for expensive calculations
- Use `useCallback` for functions passed to memoized children
- Don't over-memoize - they have overhead; use when there's a real benefit

### Lazy Loading
- Use Next.js dynamic imports for heavy components
- Code-split by route (Next.js does this automatically)

### Key Props
- Never use array index as key for lists that can change
- Use stable, unique IDs

## Hooks Best Practices

### Custom Hooks
- Extract repeated `useEffect` logic into custom hooks
- Name hooks with `use` prefix: `useEmployeeList`, `useModalManager`
- Keep hooks in `hooks/` folder or co-located with features

### useEffect
- Keep effects small and focused
- One effect per concern
- Clean up subscriptions and timers

### Dependency Arrays
- Include all dependencies ESLint asks for
- If you're fighting the dependency array, reconsider your approach

## Error Handling

### Error Boundaries
- Wrap major sections in Error Boundaries
- A crash in one widget shouldn't take down the entire page
- Provide meaningful fallback UI

### API Errors
- Use centralized error parsing (`lib/errors.ts`)
- Show user-friendly messages, not raw error strings
- Log technical details to console for debugging

## Security

### Input Sanitization
- Never use `dangerouslySetInnerHTML` unless absolutely necessary
- If you must use it, sanitize the input first
- Validate all user input on the server

### Authentication
- Auth tokens are handled server-side via Auth0 middleware
- Never expose access tokens to client JavaScript
- Use the proxy pattern for API calls

## File Naming

- Components: `PascalCase.tsx` - `EmployeeCard.tsx`
- Hooks: `camelCase.ts` - `useEmployeeList.ts`
- Utilities: `kebab-case.ts` - `query-keys.ts`
- Types: `types.ts` within feature folders
- Actions: `api.ts` (client) and `server.ts` (server actions) in `actions/` folders

## Testing

- Co-locate tests with source: `__tests__/ComponentName.test.tsx`
- Use React Testing Library for component tests
- Focus on user behavior, not implementation details
- Maintain coverage thresholds defined in `jest.config.ts`

## Imports

### Path Aliases
- Use `@/` alias for all imports from project root
- Example: `import { User } from "@/shared/types/user"`

### Import Order
1. React/Next.js imports
2. Third-party libraries
3. Internal utilities (`@/lib/...`)
4. Components (`@/components/...`)
5. Types
6. Relative imports (if any)

## Props

### Destructure Props
```tsx
// Good
const UserCard = ({ name, email, avatar }: UserCardProps) => { ... }

// Avoid
const UserCard = (props: UserCardProps) => { ... }
```

### Explicit Interfaces
```tsx
interface UserCardProps {
  name: string;
  email: string;
  avatar?: string;
}
```

## API Patterns

### Server Actions
- Use Next.js Server Actions for mutations
- Return `ActionResult<T>` type: `{ success: true, data: T } | { success: false, error: string }`
- Revalidate paths after mutations

### Client-Side Fetching
- Use React Query hooks for data fetching
- Centralize API functions in `lib/api.ts` or feature-specific `actions/api.ts`

## Quick Reference

| Do | Don't |
|-----|------|
| Arrow functions | Function declarations |
| Small, focused components | God components |
| Local state first | Context/Redux everywhere |
| Derived values | Redundant state |
| Custom hooks | Duplicated useEffect logic |
| Meaningful variable names | Comments explaining variables |
| Type everything | `any` |
| Query keys in one place | Scattered string keys |
