#!/bin/bash
# Deploy Next.js Frontend to AWS Amplify

set -e

# Configuration
APP_NAME="manager-dashboard-frontend"
REGION="us-east-1"

echo "=== Deploying Frontend to AWS Amplify ==="

# Option 1: Connect to Git Repository (Recommended)
echo ""
echo "RECOMMENDED: Connect via AWS Console"
echo "=================================="
echo "1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/"
echo "2. Click 'New app' → 'Host web app'"
echo "3. Select your Git provider (GitHub, GitLab, etc.)"
echo "4. Authorize and select your repository"
echo "5. Select the branch to deploy"
echo "6. Amplify will auto-detect Next.js and configure build settings"
echo ""
echo "Build settings should look like:"
echo "=================================="
cat << 'EOF'
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/.next
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
      - frontend/.next/cache/**/*
EOF

echo ""
echo "Environment Variables to set in Amplify Console:"
echo "================================================"
echo "  NEXT_PUBLIC_API_URL=https://your-apprunner-url.awsapprunner.com"
echo "  NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain"
echo "  NEXT_PUBLIC_AUTH0_CLIENT_ID=your-auth0-client-id"
echo "  NEXT_PUBLIC_AUTH0_AUDIENCE=your-auth0-audience"
echo ""

# Option 2: Manual deployment with Amplify CLI
echo ""
echo "ALTERNATIVE: Deploy with Amplify CLI"
echo "====================================="
echo "1. Install Amplify CLI: npm install -g @aws-amplify/cli"
echo "2. Configure: amplify configure"
echo "3. Initialize: cd frontend && amplify init"
echo "4. Add hosting: amplify add hosting"
echo "5. Publish: amplify publish"
