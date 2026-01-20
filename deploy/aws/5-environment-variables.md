# Environment Variables for AWS Deployment

## Backend (App Runner)

Set these in the App Runner console under "Configuration" → "Environment variables":

```
# Required
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@your-rds-endpoint.rds.amazonaws.com:5432/manager_dashboard
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-identifier
AUTH0_CLIENT_ID=your-auth0-client-id
FRONTEND_URL=https://main.your-amplify-app.amplifyapp.com
ENVIRONMENT=production

# Optional - Auth0 Management API (for user creation features)
AUTH0_MGMT_CLIENT_ID=your-mgmt-client-id
AUTH0_MGMT_CLIENT_SECRET=your-mgmt-client-secret

# Optional - Jira Integration
JIRA_CLIENT_ID=your-jira-client-id
JIRA_CLIENT_SECRET=your-jira-client-secret
JIRA_CALLBACK_URL=https://your-amplify-url.amplifyapp.com/api/jira/callback

# Optional - S3 for avatar storage
S3_ENABLED=true
S3_BUCKET=your-avatar-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# Performance tuning (defaults are usually fine)
RATE_LIMIT_RPS=100
RATE_LIMIT_BURST=200
LOG_LEVEL=info
LOG_FORMAT=json
```

## Frontend (Amplify)

Set these in Amplify Console under "App settings" → "Environment variables":

```
NEXT_PUBLIC_API_URL=https://your-service.us-east-1.awsapprunner.com
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-auth0-client-id
NEXT_PUBLIC_AUTH0_AUDIENCE=https://your-api-identifier

# Auth0 (server-side)
AUTH0_SECRET=generate-a-32-char-random-string
AUTH0_BASE_URL=https://main.your-amplify-app.amplifyapp.com
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
```

## Auth0 Configuration

Update your Auth0 application settings:

1. **Allowed Callback URLs:**
   ```
   https://main.your-amplify-app.amplifyapp.com/api/auth/callback
   ```

2. **Allowed Logout URLs:**
   ```
   https://main.your-amplify-app.amplifyapp.com
   ```

3. **Allowed Web Origins:**
   ```
   https://main.your-amplify-app.amplifyapp.com
   ```

4. **Allowed Origins (CORS):**
   ```
   https://main.your-amplify-app.amplifyapp.com
   ```

## Database Migration

After RDS is created, run migrations:

```bash
# Connect to RDS and run migrations
psql postgresql://postgres:YOUR_PASSWORD@your-endpoint:5432/manager_dashboard < backend/migrations/001_init.sql
```

Or use a migration tool from your local machine (ensure your IP is allowed in the security group).
