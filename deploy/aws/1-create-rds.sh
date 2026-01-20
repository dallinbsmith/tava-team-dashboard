#!/bin/bash
# Create RDS PostgreSQL Database for Manager Dashboard

set -e

# Configuration - CHANGE THESE
DB_INSTANCE_ID="manager-dashboard-db"
DB_NAME="manager_dashboard"
DB_USERNAME="postgres"
DB_PASSWORD="CHANGE_THIS_SECURE_PASSWORD"  # Use a strong password!
REGION="us-east-1"
VPC_SECURITY_GROUP=""  # Will be created

echo "=== Creating RDS PostgreSQL Instance ==="

# Create a security group for RDS
echo "Creating security group..."
SG_ID=$(aws ec2 create-security-group \
    --group-name manager-dashboard-rds-sg \
    --description "Security group for Manager Dashboard RDS" \
    --query 'GroupId' \
    --output text \
    --region $REGION)

echo "Security Group ID: $SG_ID"

# Allow inbound PostgreSQL traffic (port 5432)
# In production, restrict this to your App Runner VPC
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 5432 \
    --cidr 0.0.0.0/0 \
    --region $REGION

# Create RDS instance
echo "Creating RDS instance (this takes 5-10 minutes)..."
aws rds create-db-instance \
    --db-instance-identifier $DB_INSTANCE_ID \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15 \
    --master-username $DB_USERNAME \
    --master-user-password $DB_PASSWORD \
    --allocated-storage 20 \
    --storage-type gp2 \
    --db-name $DB_NAME \
    --vpc-security-group-ids $SG_ID \
    --publicly-accessible \
    --backup-retention-period 7 \
    --region $REGION

echo "Waiting for RDS instance to be available..."
aws rds wait db-instance-available \
    --db-instance-identifier $DB_INSTANCE_ID \
    --region $REGION

# Get the endpoint
ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_ID \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region $REGION)

echo ""
echo "=== RDS Instance Created ==="
echo "Endpoint: $ENDPOINT"
echo "Port: 5432"
echo "Database: $DB_NAME"
echo "Username: $DB_USERNAME"
echo ""
echo "Connection string:"
echo "postgresql://$DB_USERNAME:$DB_PASSWORD@$ENDPOINT:5432/$DB_NAME"
echo ""
echo "Save this connection string for the next step!"
