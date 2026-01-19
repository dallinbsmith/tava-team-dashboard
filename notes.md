# Manager Dashboard - Implementation Notes

## Architecture Overview

This project implements a manager dashboard with the following stack:

- **Backend**: Go with Chi router, PostgreSQL database
- **Frontend**: Next.js 15 with App Router, Server-Side Rendering
- **Authentication**: Auth0 for both managers and employees
- **Styling**: Tailwind CSS + Lucide icons

## Project Structure

```
├── backend/                    # Go API server
│   ├── cmd/server/            # Main entry point
│   ├── config/                # Configuration loading
│   └── internal/
│       ├── database/          # PostgreSQL connection & repositories
│       ├── handlers/          # HTTP handlers
│       ├── middleware/        # Auth middleware
│       └── models/            # Data models
├── frontend/                   # Next.js application
│   ├── app/                   # App Router pages
│   │   ├── api/auth/         # Auth0 route handlers
│   │   ├── dashboard/        # Main dashboard (SSR)
│   │   ├── employee/[id]/    # Employee detail view
│   │   └── login/            # Login page
│   ├── components/           # React components
│   ├── lib/                  # API client & Auth0 config
│   └── types/                # TypeScript types
└── docker-compose.yml         # PostgreSQL database (optional)
```

## Setup Instructions

### 1. Set up PostgreSQL

**Option A: Using Homebrew (macOS)**
```bash
brew install postgresql@16
brew services start postgresql@16
/opt/homebrew/opt/postgresql@16/bin/createdb manager_dashboard
```

**Option B: Using Docker**
```bash
docker compose up -d
```

### 2. Configure Auth0

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Create a new **Application** (Regular Web Application)
3. Create a new **API** with an identifier (this becomes your audience)
4. Configure the application settings:
   - Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`
   - Allowed Web Origins: `http://localhost:3000`

### 3. Backend Setup

```bash
cd backend

# Copy and configure environment variables
cp .env.example .env

# Edit .env:
# - Set DATABASE_URL with your username (run `whoami` to find it)
#   For Homebrew: postgres://YOUR_USERNAME@localhost:5432/manager_dashboard?sslmode=disable
#   For Docker:   postgres://postgres:postgres@localhost:5432/manager_dashboard?sslmode=disable
# - Set AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_CLIENT_ID from Auth0 dashboard

# Install dependencies and run
go mod download
go run cmd/server/main.go
```

### 4. Frontend Setup

```bash
cd frontend

# Copy and configure environment variables
cp .env.local.example .env.local

# Edit .env.local with your Auth0 credentials
# Generate AUTH0_SECRET with: openssl rand -hex 32

# Install dependencies and run
npm install
npm run dev
```

### 5. Access the App

Open http://localhost:3000 in your browser.

## Key Features

### Authentication Flow
- Users authenticate via Auth0 Universal Login
- JWT tokens are validated by the Go backend
- Users are auto-provisioned in PostgreSQL on first login
- Role-based access control (manager vs employee)

### Server-Side Rendering
- Dashboard data is fetched on the server using the access token
- Employees list is pre-rendered for fast initial load
- Search/filter is client-side for instant feedback

### Database Schema
- Single `users` table with role differentiation
- Manager-employee relationship via `manager_id` foreign key
- Indexes on auth0_id, email, manager_id for performance

## Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user@localhost:5432/manager_dashboard?sslmode=disable` |
| `AUTH0_DOMAIN` | Auth0 tenant domain | `your-tenant.auth0.com` |
| `AUTH0_AUDIENCE` | Auth0 API identifier | `https://your-api` |
| `AUTH0_CLIENT_ID` | Auth0 application client ID | `abc123...` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)
| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH0_SECRET` | Session encryption key (32 bytes) | `openssl rand -hex 32` |
| `AUTH0_BASE_URL` | Frontend base URL | `http://localhost:3000` |
| `AUTH0_ISSUER_BASE_URL` | Auth0 tenant URL | `https://your-tenant.auth0.com` |
| `AUTH0_CLIENT_ID` | Auth0 application client ID | `abc123...` |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret | `xyz789...` |
| `AUTH0_AUDIENCE` | Auth0 API identifier | `https://your-api` |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8080` |

## Next Steps / Future Enhancements

- Add employee CRUD operations in the UI
- Implement role assignment for managers
- Add team management (assign employees to managers)
- Add pagination for large teams
- Add employee profile editing
- Implement real-time updates with WebSockets
