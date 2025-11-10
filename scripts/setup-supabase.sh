#!/bin/bash

# Supabase Setup Script
# Automates Supabase PostgreSQL configuration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Supabase PostgreSQL Setup${NC}"
echo "=========================================="
echo ""

# Supabase project details
SUPABASE_URL="https://okexcmjsuvctvjgvvzqh.supabase.co"
PROJECT_REF="okexcmjsuvctvjgvvzqh"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZXhjbWpzdXZjdHZqZ3Z2enFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTgyMjYsImV4cCI6MjA3ODA3NDIyNn0.vOmq-3Irm9dS0lWG-QLXFs4WsB64Ncc1mJwgFQswnP0"

echo -e "${YELLOW}📋 Supabase Project Information:${NC}"
echo "  Project URL: $SUPABASE_URL"
echo "  Project Ref: $PROJECT_REF"
echo "  Region: Asia Pacific (Singapore)"
echo ""

# Prompt for database password
echo -e "${YELLOW}🔑 Database Password Required${NC}"
echo "Get your password from: https://app.supabase.com/project/$PROJECT_REF/settings/database"
echo ""
read -sp "Enter your Supabase database password: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Password cannot be empty${NC}"
    exit 1
fi

# Create .env file
echo -e "${BLUE}📝 Creating .env file...${NC}"

cd server

cat > .env << EOF
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Supabase PostgreSQL Connection
# Connection pooling (for application queries)
DATABASE_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (for migrations)
DIRECT_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Supabase Configuration
SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_ANON_KEY="${ANON_KEY}"

# JWT Authentication
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# AWS S3 Configuration (update with your credentials)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=perplexity-automation-files

# Redis Configuration (local development)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000,chrome-extension://*

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.xlsx,.xls

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# Admin (change these!)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-this-password
EOF

echo -e "${GREEN}✓ .env file created${NC}"
echo ""

# Test database connection
echo -e "${BLUE}🔍 Testing database connection...${NC}"

npx prisma db execute --stdin <<SQL
SELECT version();
SQL

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database connection successful!${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please check your password and try again"
    exit 1
fi

echo ""

# Generate Prisma client
echo -e "${BLUE}🔧 Generating Prisma client...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma client generated${NC}"
echo ""

# Run migrations
echo -e "${BLUE}📊 Running database migrations...${NC}"
npx prisma migrate dev --name init
echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

# Seed database
echo -e "${BLUE}🌱 Seeding database...${NC}"
npm run db:seed
echo -e "${GREEN}✓ Database seeded${NC}"
echo ""

# Setup admin dashboard
echo -e "${BLUE}🎨 Setting up Admin Dashboard...${NC}"
cd ../admin-dashboard

cat > .env << EOF
VITE_API_URL=http://localhost:3000/api/v1
EOF

echo -e "${GREEN}✓ Admin dashboard configured${NC}"
echo ""

cd ..

echo "=========================================="
echo -e "${GREEN}✅ Supabase Setup Complete!${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Update AWS S3 credentials in server/.env"
echo "2. Change admin password in server/.env"
echo "3. Start development: ./scripts/dev.sh"
echo ""
echo -e "${YELLOW}🔗 Useful Links:${NC}"
echo "  Dashboard: https://app.supabase.com/project/$PROJECT_REF"
echo "  Database: https://app.supabase.com/project/$PROJECT_REF/editor"
echo "  SQL Editor: https://app.supabase.com/project/$PROJECT_REF/sql"
echo ""
echo -e "${YELLOW}📚 Documentation:${NC}"
echo "  See SUPABASE_SETUP.md for detailed information"
echo ""
echo -e "${GREEN}🎉 Ready to start developing!${NC}"

