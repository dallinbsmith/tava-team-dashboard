# AWS Deployment Guide

Deploy Manager Dashboard to AWS using App Runner, Amplify, and RDS.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  AWS Amplify    │────▶│  App Runner     │────▶│  RDS PostgreSQL │
│  (Frontend)     │     │  (Backend API)  │     │  (Database)     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     Next.js                  Go API              PostgreSQL 15
```

## Estimated Monthly Costs

| Service | Configuration | Cost |
|---------|--------------|------|
| RDS PostgreSQL | db.t3.micro, 20GB | ~$15-25 |
| App Runner | 1 vCPU, 2GB RAM | ~$25-40 |
| Amplify Hosting | Build + Hosting | ~$5-15 |
| Data Transfer | ~10GB/month | ~$1-5 |
| **Total** | | **~$50-85/month** |

*Costs vary by usage. Free tier eligible for first 12 months.*

## Deployment Steps

### 1. Create Database (RDS)

```bash
chmod +x 1-create-rds.sh
./1-create-rds.sh
```

Wait for RDS to be available (~5-10 minutes). Save the connection string.

### 2. Run Database Migrations

```bash
# From your local machine
psql "postgresql://postgres:PASSWORD@your-endpoint:5432/manager_dashboard" < ../backend/migrations/001_init.sql
```

### 3. Deploy Backend (App Runner)

```bash
chmod +x 3-deploy-backend.sh
./3-deploy-backend.sh
```

After deployment, configure environment variables in App Runner console.

### 4. Deploy Frontend (Amplify)

Follow the instructions in `4-deploy-frontend.sh` to connect your Git repo to Amplify.

### 5. Configure Environment Variables

See `5-environment-variables.md` for all required variables.

### 6. Update Auth0

Update your Auth0 application with the production URLs.

## Updating the Application

### Backend Updates

```bash
# Build and push new image
cd backend
docker build -t manager-dashboard-api -f ../deploy/aws/2-backend-dockerfile .
docker tag manager-dashboard-api:latest YOUR_ECR_REPO:latest
docker push YOUR_ECR_REPO:latest

# App Runner auto-deploys when new image is pushed
```

### Frontend Updates

Push to your connected Git branch - Amplify auto-deploys.

## Troubleshooting

### Backend not connecting to database
- Check security group allows inbound from App Runner
- Verify DATABASE_URL is correct
- Check RDS is publicly accessible or use VPC connector

### Frontend API calls failing
- Verify NEXT_PUBLIC_API_URL points to App Runner URL
- Check CORS settings (FRONTEND_URL in backend)
- Verify Auth0 configuration

### Health check failing
- Ensure /health endpoint returns 200
- Check App Runner logs in CloudWatch

## Security Recommendations

1. **Use AWS Secrets Manager** for sensitive values instead of plain environment variables
2. **Enable RDS encryption** at rest
3. **Use VPC Connector** for App Runner to RDS communication (removes need for public RDS)
4. **Enable CloudWatch alarms** for monitoring
5. **Set up AWS WAF** in front of App Runner for DDoS protection
