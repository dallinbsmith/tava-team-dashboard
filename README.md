# Supervisor Dashboard

A full-stack employee management dashboard with Auth0 authentication, built with Go and Next.js. Supports hierarchical supervisor/employee relationships where supervisors can manage both employees and other supervisors.

## Tech Stack

- **Backend**: Go with Chi router
- **Frontend**: Next.js 15 with App Router (Server-Side Rendering)
- **Database**: PostgreSQL 16
- **Authentication**: Auth0
- **Styling**: Tailwind CSS + Lucide icons

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
│       ├── database/          # PostgreSQL connection & repositories
│       │   └── migrations/    # SQL migration files (golang-migrate)
│       ├── handlers/          # REST API handlers
│       ├── logger/            # Structured logging with slog
│       ├── middleware/        # Auth0 JWT validation, logging, rate limiting
│       ├── models/            # User/Employee data models
│       ├── oauth/             # OAuth state management
│       ├── repository/        # Repository interfaces for testing
│       │   └── mocks/         # Mock implementations
│       └── services/          # Business logic layer
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
│   │   │       └── settings/  # Settings page
│   │   └── api/               # API routes (Auth0, proxy)
│   │
│   ├── shared/                # Shared code across pages
│   │   ├── types/             # Shared TypeScript types (User, Squad, etc.)
│   │   └── common/            # Shared UI components (Avatar, Pagination, etc.)
│   │
│   ├── components/            # Global UI components (BaseModal, Button, etc.)
│   ├── hooks/                 # Global React hooks
│   ├── lib/                   # API client utilities
│   └── providers/             # React context providers
│
├── docker-compose.yml         # PostgreSQL container config
└── README.md
```

### Frontend Architecture

The frontend follows a **co-located architecture** where each page folder contains everything it needs:

```
app/(pages)/(dashboard)/time-off/
├── page.tsx            # Next.js page component
├── components/         # Page-specific React components
│   ├── TimeOffRequestForm.tsx
│   ├── TimeOffRequestList.tsx
│   └── ...
├── types.ts            # TypeScript types for this page
├── api.ts              # API functions (fetch calls)
├── hooks.ts            # React Query hooks for data fetching
└── index.ts            # Barrel export for clean imports
```

**Benefits:**
- **Co-location**: Page, components, types, API, and hooks all live together
- **Clear boundaries**: Each page folder is self-contained
- **Easy navigation**: Find everything related to a feature in one place
- **Shared code**: Common types and components live in `shared/`

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

- **Auth0 Authentication**: Secure login via Auth0 Universal Login
- **Role-Based Access Control**: Supervisors see their direct reports (employees and other supervisors), employees see only themselves
- **Server-Side Rendering**: Dashboard data fetched on the server for fast initial load
- **Auto-Provisioning**: Users are automatically created in the database on first login
- **Search & Filter**: Client-side filtering by name, email, or department
- **Department Grouping**: Employees are grouped by department in the list view
- **Responsive Design**: Works on desktop and mobile devices

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
