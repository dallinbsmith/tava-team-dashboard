
What: 
A management dashboard for employees and supervisors alike. 

Highlights:
  Frontend — Next.js 15 on Vercel                                                  
  - App router with Auth0 authentication via middleware                           
  - Server-side proxy routes (/api/proxy/*) inject access tokens before forwarding to the backend — keeps tokens out of client JavaScript                             
  - React Query for data fetching, context providers for user/org state                                                                                                   

  Backend — Go API on AWS ECS Fargate                                              
  - RESTful API plus a GraphQL endpoint                                            
  - PostgreSQL on RDS with golang-migrate for schema management                    
  - JWT validation against Auth0                                                   
  - Sits behind an ALB with CloudFront for SSL termination on a custom domain                                                                                              

  Infrastructure                                                                   
  - ECR for container images                                                       
  - S3 for avatar storage                                                         
  - Vercel handles frontend CDN/deploys via git push
  - Cloudfront SSL/HTTPS termination in front of the HTTP-only ALB                                                                                                           

  Core Features                                                                    
  - Employee/team management with org chart                                       
  - Calendar (tasks, meetings, time-off requests)                                  
  - Jira integration for ticket sync                                               
  - Invitation-based onboarding flow  

Why:
After finding out the task, I figured I'd use the time as an opportunity to build a tool I'd use based on past pain points. 

  Two major things that would help me:
  - At my last stop, I was incredibly accurate roadmapping. However, I would be off when there would be employees that would take large blocks of time off that didn't get recorded somewhere. 
  - Org charts seemed to live in Figma files that changed constantly and drafts were only visible to a couple supervisors.

AI usage:
If you look at the Github lines committed (312,586++ 216,953--) you're probably wondering how I got all that code committed in a weeks time. Simply put, I'm a strong believer that modern Developers need to have a healthy workflow with AI. So what that means in practice, developers should not be writing all code by hand, they also should definitely not just accept everything spit out point blank. I have an AI approach that takes basic storming and norming patterns and develop closely with multiple models. Generally I have a personally coding or verfication step followed by 2 AI steps (implementation step then best practices filter).  

  Guardrails:
  - Claude user rules
  - Claude.md repo rules
  - Verifying against multiple models

  What this looks like in Practice:
  Architecting personally => rough AI Architecting => Basic technology implementation => Check implemenation against AI => Architecting best practices prompts => Rough component hand coding => Check implemenation against AI => Follow up for common best practices. New feature rough coding, ...repeat.

  Admittedly, the backend I relied heavily on AI. More on that below in lessons.

Some developers might frown on that pattern because there is a lot of back and forth with AI in my development and in some circles can be scoffed at as Vibecoding. However, I take patterns and code quality very seriously as well as the flow of data to keep the codebase clean and keep everything from spiraling out into spaghetti code.

Difficulties:
- Wiring up all the different integrations was wildly time consuming (S3, ECS, Vercel, Cloudfront, Jira, Auth0) and it's incredibly time consuming to get all env vars wired up properly, and data flowing properly. 
- Stale data. Balancing Auth tokens, GraphQL, Server Side components, refresh, local storage was a thorn throughout the project. This was the most recurring bug during the build.
- Jira complexities. While wiring up Jira was fun, Atlassian can be hyper tailored to each individual organization. Accommodating all those complexities became overwhelming.

Lessons:
- Stick with either REST or GraphQL and minimize overlap. GraphQL was implemented because I figured items like events/tasks could be used at larger levels and more granular levels. Looking back I should have just stuck with rest. Bouncing back and forth between postman and GraphQL playgroud slowed up the process.
- I bit off a big bite to chew on this one which caused a litany of edge cases to accommodate. Going into it I was hopeful to do a lot of learning in Go because I know Tava is moving that direction and I figured this would be a good opportunity to start getting my feet wet and expanding my learning. But due to self inflicted scope explosion, I spent significantly less time in the backend than I had hoped.  


## Tech Stack

### Backend
- **Framework**: Go 1.24 with Chi router
- **API**: REST + GraphQL (gqlgen)
- **Database**: PostgreSQL 16
- **Authentication**: Auth0 JWT validation
- **Storage**: AWS S3 for file uploads
- **Email**: Resend for transactional emails
- **Monitoring**: Prometheus metrics

### Frontend
- **Framework**: Next.js 15 with App Router (SSR)
- **State Management**: TanStack React Query
- **Authentication**: Auth0 Next.js SDK
- **Styling**: Tailwind CSS + custom theme system
- **Icons**: Lucide React
- **Testing**: Jest + React Testing Library (1500+ tests)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Go 1.22+** - [Download Go](https://go.dev/dl/)
- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **PostgreSQL 16** - via Homebrew (macOS) or Docker
- **Auth0 account** - [Sign up for free](https://auth0.com/signup)

---

## Quick Start

### Step 1: Clone and Navigate

```bash
git clone <repository-url>
cd smith-dallin-technical-assessment
```

### Step 2: Set Up PostgreSQL

Choose **one** of the following options:

#### Option A: Homebrew (macOS - Recommended)

```bash
# Install PostgreSQL
brew install postgresql@16

# Start the PostgreSQL service
brew services start postgresql@16

# Create the database (replace YOUR_USERNAME with output of `whoami`)
/opt/homebrew/opt/postgresql@16/bin/createdb manager_dashboard
```

To verify it's running:
```bash
brew services list | grep postgresql
```

#### Option B: Docker

```bash
docker compose up -d
```

To verify it's running:
```bash
docker ps | grep postgres
```

### Step 3: Configure Auth0

You need to create both an **Application** and an **API** in Auth0.

#### 3.1 Create an Auth0 Account
1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Sign up or log in

#### 3.2 Create a New Application
1. In the sidebar, go to **Applications** → **Applications**
2. Click **+ Create Application**
3. Enter a name (e.g., "Manager Dashboard")
4. Select **Regular Web Applications**
5. Click **Create**

#### 3.3 Configure Application Settings
In your new application's **Settings** tab, scroll down and set:

| Setting | Value |
|---------|-------|
| **Allowed Callback URLs** | `http://localhost:3000/api/auth/callback` |
| **Allowed Logout URLs** | `http://localhost:3000` |
| **Allowed Web Origins** | `http://localhost:3000` |

Click **Save Changes** at the bottom.

#### 3.4 Copy Your Application Credentials
From the **Settings** tab, copy these values (you'll need them later):
- **Domain** (e.g., `your-tenant.us.auth0.com`)
- **Client ID**
- **Client Secret**

#### 3.5 Create an API
1. In the sidebar, go to **Applications** → **APIs**
2. Click **+ Create API**
3. Enter:
   - **Name**: `Manager Dashboard API`
   - **Identifier**: `https://manager-dashboard-api` (this is your "audience")
   - **Signing Algorithm**: RS256
4. Click **Create**

Copy the **Identifier** - this is your `AUTH0_AUDIENCE`.

### Step 4: Set Up the Backend

```bash
cd backend

# Copy the environment template
cp .env.example .env
```

Edit `backend/.env` with your values:

```bash
PORT=8080

# Database URL
# For Homebrew: postgres://YOUR_MAC_USERNAME@localhost:5432/manager_dashboard?sslmode=disable
# For Docker:   postgres://postgres:postgres@localhost:5432/manager_dashboard?sslmode=disable
#
# To find your Mac username, run: whoami
DATABASE_URL=postgres://YOUR_MAC_USERNAME@localhost:5432/manager_dashboard?sslmode=disable

# Auth0 Configuration (from Step 3)
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://manager-dashboard-api
AUTH0_CLIENT_ID=your-client-id

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

Install dependencies and start the server:

```bash
# Download Go dependencies
go mod download

# Start the backend server
go run cmd/server/main.go
```

You should see:
```
2024/xx/xx xx:xx:xx Server starting on port 8080
```

Keep this terminal running and open a new one for the frontend.

### Step 5: Set Up the Frontend

```bash
cd frontend

# Copy the environment template
cp .env.local.example .env.local
```

Generate a secret for Auth0 session encryption:
```bash
openssl rand -hex 32
```

Edit `frontend/.env.local` with your values:

```bash
# Paste the output from openssl rand -hex 32
AUTH0_SECRET=your-generated-32-byte-hex-string

# Base URL for your app
AUTH0_BASE_URL=http://localhost:3000

# Auth0 Configuration (from Step 3)
AUTH0_ISSUER_BASE_URL=https://your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://manager-dashboard-api

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Install dependencies and start the dev server:

```bash
# Install Node.js dependencies
npm install

# Start the frontend dev server
npm run dev
```

You should see:
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
```

### Step 6: Open the App

1. Open your browser to **http://localhost:3000**
2. Click **Sign in with Auth0**
3. Create an account or sign in
4. You'll be redirected to the dashboard

---

## Project Structure

```
├── backend/                    # Go API server
│   ├── cmd/
│   │   ├── server/            # Entry point (main.go)
│   │   └── seed/              # Database seeding utility
│   ├── config/                # Environment configuration
│   └── internal/
│       ├── app/               # Application setup and routing
│       ├── apperrors/         # Custom error types
│       ├── auth0/             # Auth0 Management API client
│       ├── cache/             # In-memory caching layer
│       ├── database/          # PostgreSQL connection & repositories
│       │   └── migrations/    # SQL migration files (golang-migrate)
│       ├── graph/             # GraphQL schema and resolvers
│       ├── handlers/          # REST API handlers
│       ├── jira/              # Jira integration client
│       ├── logger/            # Structured logging with slog
│       ├── middleware/        # Auth0 JWT validation, logging, rate limiting
│       ├── models/            # User/Employee data models
│       ├── oauth/             # OAuth state management
│       ├── repository/        # Repository interfaces for testing
│       │   └── mocks/         # Mock implementations
│       ├── services/          # Business logic layer
│       └── storage/           # S3 file storage service
│
├── frontend/                   # Next.js application
│   ├── app/                   # Next.js App Router
│   │   ├── (pages)/           # Page routes
│   │   │   └── (dashboard)/   # Dashboard layout group
│   │   │       ├── calendar/  # Calendar page (co-located)
│   │   │       │   ├── page.tsx
│   │   │       │   ├── components/
│   │   │       │   ├── types.ts
│   │   │       │   ├── api.ts
│   │   │       │   └── hooks.ts
│   │   │       ├── time-off/  # Time off page (co-located)
│   │   │       ├── orgchart/  # Org chart page (co-located)
│   │   │       ├── teams/     # Teams management page
│   │   │       └── settings/  # Settings page
│   │   └── api/               # API routes (Auth0, proxy)
│   │
│   ├── shared/                # Shared code across pages
│   │   ├── types/             # Shared TypeScript types (User, Squad, etc.)
│   │   └── common/            # Shared UI components (Avatar, Pagination, etc.)
│   │
│   ├── components/            # Global UI components (BaseModal, Button, etc.)
│   │   └── __tests__/         # Component unit tests
│   ├── hooks/                 # Global React hooks
│   │   ├── queries/           # React Query hooks
│   │   ├── mutations/         # Mutation hooks
│   │   └── __tests__/         # Hook tests
│   ├── lib/                   # Utilities
│   │   ├── api.ts             # Client-side API utilities
│   │   ├── graphql.ts         # GraphQL client and queries
│   │   ├── styles.ts          # Reusable Tailwind style constants
│   │   ├── utils.ts           # Utility functions (cn, formatters)
│   │   ├── server-actions.ts  # Shared Server Action utilities
│   │   └── __tests__/         # Utility tests
│   ├── providers/             # React context providers
│   │   └── __tests__/         # Provider tests
│   └── test-utils/            # Testing utilities and wrappers
│
├── docker-compose.yml         # PostgreSQL container config
└── README.md
```

### Frontend Architecture

The frontend follows a **co-located architecture** where each page folder contains everything it needs:

```
app/(pages)/(dashboard)/time-off/
├── page.tsx            # Server Component (data fetching)
├── TimeOffPageClient.tsx # Client Component (interactivity)
├── loading.tsx         # Loading UI (shown during navigation)
├── error.tsx           # Error boundary (graceful error handling)
├── actions.ts          # Server Actions (mutations)
├── components/         # Page-specific React components
│   ├── TimeOffRequestForm.tsx
│   ├── TimeOffRequestList.tsx
│   └── ...
├── types.ts            # TypeScript types for this page
├── api.ts              # API functions (server-side fetching)
├── hooks.ts            # React Query hooks for client-side data
└── index.ts            # Barrel export for clean imports
```

**Benefits:**
- **Co-location**: Page, components, types, API, and hooks all live together
- **Clear boundaries**: Each page folder is self-contained
- **Easy navigation**: Find everything related to a feature in one place
- **Shared code**: Common types and components live in `shared/`

### Next.js 15 Optimizations

The frontend leverages Next.js 15 App Router features for optimal performance:

#### Server Components

Pages use React Server Components for server-side data fetching, reducing client-side JavaScript:

```
app/(pages)/(dashboard)/calendar/
├── page.tsx              # Server Component - fetches data on server
├── CalendarPageClient.tsx # Client Component - handles interactivity
└── components/           # Mix of server and client components
```

#### Server Actions

Mutations use Next.js Server Actions instead of client-side API calls:

```typescript
// app/(pages)/(dashboard)/calendar/actions.ts
"use server";

export async function createMeetingAction(data: CreateMeetingRequest): Promise<ActionResult<Meeting>> {
  const res = await authPost("/api/calendar/meetings", data);
  // ...
  revalidatePath("/calendar");
  return success(meeting);
}
```

**Server Actions are implemented for:**
- Calendar (tasks, meetings, responses)
- Time-off (requests, reviews, cancellations)
- Org chart (drafts, changes, squads, departments)
- Invitations (create, revoke)

#### Shared Server Action Utilities

Common patterns are centralized in `lib/server-actions.ts`:

```typescript
import { authPost, authPut, authDelete, success, failure } from "@/lib/server-actions";

// Type-safe results
type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

// Authenticated fetch helpers
const res = await authPost("/api/endpoint", body);
return success(data);  // or failure("error message")
```

#### Suspense Boundaries & Loading States

Each route has dedicated loading and error states:

```
app/(pages)/(dashboard)/calendar/
├── loading.tsx   # Skeleton UI shown during navigation
├── error.tsx     # Error boundary for graceful error handling
└── page.tsx
```

**Dashboard uses code splitting with React.lazy():**
```typescript
const JiraTasks = lazy(() => import("./components/JiraTasks"));
const CalendarWidget = lazy(() => import("./components/CalendarWidget"));

<Suspense fallback={<JiraTasksSkeleton />}>
  <JiraTasks />
</Suspense>
```

#### Performance Benefits

| Optimization | Benefit |
|-------------|---------|
| Server Components | Reduced client JS bundle, faster initial load |
| Server Actions | Type-safe mutations, automatic revalidation |
| Suspense boundaries | Non-blocking UI, progressive loading |
| Code splitting | Lazy-loaded widgets, smaller initial bundle |
| Route-level loading states | Instant navigation feedback |

### Style System

The frontend uses a centralized style system for consistent theming:

#### `cn()` Utility (`lib/utils.ts`)

Combines `clsx` and `tailwind-merge` for intelligent class name handling:

```typescript
import { cn } from "@/lib/utils";

// Merge classes with conflict resolution
<div className={cn("p-4 bg-blue-500", isActive && "bg-green-500")} />
```

#### Style Constants (`lib/styles.ts`)

Reusable Tailwind style constants for consistent UI:

```typescript
import { button, badge, cardBase, widgetContainer } from "@/lib/styles";

// Buttons
<button className={cn(button, "w-full")}>Submit</button>

// Badges
<span className={badgePrimary}>Active</span>
<span className={badgeSupervisor}>Supervisor</span>

// Cards and containers
<div className={cn(cardBase, "rounded-lg p-4")}>Content</div>
<div className={widgetContainer}>Widget</div>
```

Available style categories:
- **Buttons**: `button`, `buttonDanger`, `buttonGhost`, `buttonIcon`
- **Badges**: `badge`, `badgePrimary`, `badgeSupervisor`, `badgeAdmin`
- **Pills**: `pillSupervisor`, `pillAdmin`, `pillEmployee`
- **Cards**: `cardBase`, `cardHover`, `cardInteractive`
- **Containers**: `widgetContainer`, `widgetHeader`, `widgetFooter`
- **Tables**: `tableHeader`, `tableHeaderSortable`
- **Form inputs**: `input`, `inputError`

---

## API Endpoints

The application provides both **REST** and **GraphQL** APIs.

### GraphQL API

The GraphQL endpoint is available at `/graphql` (POST requests require Auth0 Bearer token).

A GraphQL Playground is available at `http://localhost:8080/graphql` (GET request) for exploring the schema.

**Queries:**
```graphql
# Get all employees (supervisors see direct reports, employees see themselves)
query {
  employees {
    id
    email
    first_name
    last_name
    role
    department
    supervisor { id first_name last_name }
  }
}

# Get a single employee by ID
query {
  employee(id: "1") {
    id
    email
    first_name
    last_name
    direct_reports { id first_name last_name }
  }
}

# Get current authenticated user
query {
  me { id email first_name last_name role }
}
```

**Mutations:**
```graphql
# Create a new employee
mutation {
  createEmployee(input: {
    email: "new@example.com"
    first_name: "John"
    last_name: "Doe"
    role: employee
    department: "Engineering"
  }) { id email }
}

# Update an employee
mutation {
  updateEmployee(id: "1", input: {
    department: "Marketing"
  }) { id department }
}

# Delete an employee
mutation {
  deleteEmployee(id: "1")
}
```

### REST API

All REST endpoints require a valid Auth0 Bearer token in the `Authorization` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/me` | Get current authenticated user |
| GET | `/api/employees` | Get direct reports (supervisors see their team, employees see themselves) |
| GET | `/api/users` | Get all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create new user (supervisors only) |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user (supervisors only, their direct reports) |
| GET | `/api/supervisors` | Get all supervisors |
| GET | `/health` | Health check (no auth required) |

---

## Features

### Core Features
- **Auth0 Authentication**: Secure login via Auth0 Universal Login
- **Role-Based Access Control**: Supervisors see their direct reports (employees and other supervisors), employees see only themselves
- **Auto-Provisioning**: Users are automatically created in the database on first login
- **Search & Filter**: Client-side filtering by name, email, or department
- **Department Grouping**: Employees are grouped by department in the list view
- **Responsive Design**: Works on desktop and mobile devices

### Performance Features
- **Server Components**: Data fetched on the server for fast initial load
- **Server Actions**: Type-safe mutations with automatic cache revalidation
- **Suspense Boundaries**: Progressive loading with skeleton UIs
- **Code Splitting**: Lazy-loaded dashboard widgets for smaller bundles
- **Route-Level Loading States**: Instant navigation feedback

---

## Troubleshooting

### "Connection refused" errors
- Make sure PostgreSQL is running: `brew services list` or `docker ps`
- Verify your `DATABASE_URL` has the correct username

### "Invalid token" errors
- Verify `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` match in both backend and frontend
- Make sure you created an **API** in Auth0 (not just an Application)

### "Callback URL mismatch" errors
- Check that `http://localhost:3000/api/auth/callback` is in your Auth0 Application's Allowed Callback URLs

### Frontend shows "Failed to load dashboard data"
- Make sure the backend is running on port 8080
- Check the backend terminal for error messages

### Clear Next.js cache
If you see stale errors after making changes:
```bash
rm -rf frontend/.next
npm run dev
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 8080) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH0_DOMAIN` | Yes | Your Auth0 tenant domain (e.g., `tenant.us.auth0.com`) |
| `AUTH0_AUDIENCE` | Yes | Your Auth0 API identifier |
| `AUTH0_CLIENT_ID` | Yes | Your Auth0 application client ID |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: `http://localhost:3000`) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH0_SECRET` | Yes | Session encryption key (generate with `openssl rand -hex 32`) |
| `AUTH0_BASE_URL` | Yes | Your app's base URL (`http://localhost:3000`) |
| `AUTH0_ISSUER_BASE_URL` | Yes | Auth0 tenant URL (`https://tenant.us.auth0.com`) |
| `AUTH0_CLIENT_ID` | Yes | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Yes | Auth0 application client secret |
| `AUTH0_AUDIENCE` | Yes | Auth0 API identifier |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL (`http://localhost:8080`) |

---

## Development

### Running Both Servers

You need two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
go run cmd/server/main.go
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Database Migrations

Migrations run automatically when the backend starts using [golang-migrate](https://github.com/golang-migrate/migrate). Migration files are located in `backend/internal/database/migrations/` and are embedded into the binary at compile time.

**Migration files follow the naming convention:**
```
000001_initial_schema.up.sql    # Apply migration
000001_initial_schema.down.sql  # Rollback migration
```

**To add a new migration:**
1. Create two files with the next sequence number:
   - `000002_add_feature.up.sql` - SQL to apply the change
   - `000002_add_feature.down.sql` - SQL to rollback the change
2. Restart the server - migrations run automatically on startup

**Migration tracking:**
- golang-migrate creates a `schema_migrations` table to track applied versions
- Migrations are idempotent - running the server multiple times is safe

### Adding New Users as Supervisors

By default, new users are created with the `employee` role. To make a user a supervisor, you can update their role directly in the database:

```sql
UPDATE users SET role = 'supervisor' WHERE email = 'user@example.com';
```

### Setting Up Supervisor Hierarchies

Supervisors can manage both employees and other supervisors. To assign a supervisor to a user:

```sql
-- Get the supervisor's ID first
SELECT id FROM users WHERE email = 'supervisor@example.com';

-- Then assign that supervisor to another user (employee or supervisor)
UPDATE users SET supervisor_id = <supervisor_id> WHERE email = 'employee@example.com';
```

---

## Testing

The frontend has comprehensive test coverage with 1500+ tests across 60+ test files.

### Running Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Test Structure

Tests are co-located with the code they test:

```
frontend/
├── components/__tests__/      # Component tests
├── hooks/__tests__/           # Hook tests
├── lib/__tests__/             # Utility tests
├── providers/__tests__/       # Provider tests
└── test-utils/                # Testing utilities
    ├── index.ts               # Barrel exports
    ├── render.tsx             # Custom render with providers
    └── query-wrapper.tsx      # React Query test wrapper
```

### Test Utilities

Custom test utilities are provided in `test-utils/`:

```typescript
import { render, createQueryWrapper } from "@/test-utils";

// Render with all providers (Auth0, React Query, etc.)
render(<MyComponent />);

// Create a React Query wrapper for hook testing
const wrapper = createQueryWrapper();
const { result } = renderHook(() => useMyHook(), { wrapper });
```

### Code Quality

```bash
# Run linter
npm run lint

# Format code with Prettier
npx prettier --write .
```
