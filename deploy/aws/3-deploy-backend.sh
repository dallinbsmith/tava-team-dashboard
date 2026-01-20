#!/bin/bash
# Deploy Go Backend to AWS App Runner

set -e

# Configuration - CHANGE THESE
APP_NAME="manager-dashboard-api"
REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$APP_NAME"

echo "=== Deploying Backend to AWS App Runner ==="

# Step 1: Create ECR Repository
echo "Creating ECR repository..."
aws ecr create-repository \
    --repository-name $APP_NAME \
    --region $REGION 2>/dev/null || echo "Repository already exists"

# Step 2: Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region $REGION | \
    docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Step 3: Build and push Docker image
echo "Building Docker image..."
cd ../backend
docker build -t $APP_NAME -f ../deploy/aws/2-backend-dockerfile .

echo "Tagging image..."
docker tag $APP_NAME:latest $ECR_REPO:latest

echo "Pushing to ECR..."
docker push $ECR_REPO:latest

# Step 4: Create App Runner service
echo "Creating App Runner service..."

# Create the service configuration
cat > /tmp/apprunner-config.json << EOF
{
    "ServiceName": "$APP_NAME",
    "SourceConfiguration": {
        "ImageRepository": {
            "ImageIdentifier": "$ECR_REPO:latest",
            "ImageRepositoryType": "ECR",
            "ImageConfiguration": {
                "Port": "8080",
                "RuntimeEnvironmentVariables": {
                    "ENVIRONMENT": "production",
                    "PORT": "8080"
                }
            }
        },
        "AutoDeploymentsEnabled": true,
        "AuthenticationConfiguration": {
            "AccessRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/AppRunnerECRAccessRole"
        }
    },
    "InstanceConfiguration": {
        "Cpu": "1024",
        "Memory": "2048"
    },
    "HealthCheckConfiguration": {
        "Protocol": "HTTP",
        "Path": "/health",
        "Interval": 10,
        "Timeout": 5,
        "HealthyThreshold": 1,
        "UnhealthyThreshold": 5
    }
}
EOF

# First, create the IAM role for App Runner to access ECR
echo "Creating IAM role for App Runner..."
cat > /tmp/trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "build.apprunner.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

aws iam create-role \
    --role-name AppRunnerECRAccessRole \
    --assume-role-policy-document file:///tmp/trust-policy.json \
    2>/dev/null || echo "Role already exists"

aws iam attach-role-policy \
    --role-name AppRunnerECRAccessRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess \
    2>/dev/null || echo "Policy already attached"

# Wait for role to propagate
sleep 10

# Create the App Runner service
aws apprunner create-service \
    --cli-input-json file:///tmp/apprunner-config.json \
    --region $REGION

echo ""
echo "=== Backend Deployment Started ==="
echo "App Runner is provisioning your service. This takes 2-5 minutes."
echo ""
echo "Check status with:"
echo "aws apprunner describe-service --service-arn <SERVICE_ARN> --region $REGION"
echo ""
echo "IMPORTANT: After deployment, configure these environment variables in App Runner console:"
echo "  - DATABASE_URL: Your RDS connection string"
echo "  - AUTH0_DOMAIN: Your Auth0 domain"
echo "  - AUTH0_AUDIENCE: Your Auth0 API audience"
echo "  - AUTH0_CLIENT_ID: Your Auth0 client ID"
echo "  - FRONTEND_URL: Your Amplify frontend URL"
