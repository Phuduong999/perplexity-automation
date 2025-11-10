#!/bin/bash

# Supabase Connection Verification Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Supabase Connection Verification${NC}"
echo "=========================================="
echo ""

cd server

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Run ./scripts/setup-supabase.sh first"
    exit 1
fi

echo -e "${YELLOW}📋 Checking configuration...${NC}"

# Check if DATABASE_URL is set
if grep -q "DATABASE_URL=" .env; then
    echo -e "${GREEN}✓ DATABASE_URL configured${NC}"
else
    echo -e "${RED}❌ DATABASE_URL not found in .env${NC}"
    exit 1
fi

# Check if SUPABASE_URL is set
if grep -q "SUPABASE_URL=" .env; then
    echo -e "${GREEN}✓ SUPABASE_URL configured${NC}"
else
    echo -e "${RED}❌ SUPABASE_URL not found in .env${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔌 Testing database connection...${NC}"

# Test database connection
npx prisma db execute --stdin <<SQL 2>/dev/null <<EOF
SELECT 
    version() as postgres_version,
    current_database() as database_name,
    current_user as user_name;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database connection successful!${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please check your DATABASE_URL and password"
    exit 1
fi

echo ""
echo -e "${YELLOW}📊 Checking database schema...${NC}"

# Check if migrations are applied
MIGRATION_STATUS=$(npx prisma migrate status 2>&1)

if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
    echo -e "${GREEN}✓ Database schema is up to date${NC}"
elif echo "$MIGRATION_STATUS" | grep -q "No migration found"; then
    echo -e "${YELLOW}⚠ No migrations found - run: npx prisma migrate dev${NC}"
else
    echo -e "${YELLOW}⚠ Migrations pending - run: npx prisma migrate dev${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Checking tables...${NC}"

# List tables
TABLES=$(npx prisma db execute --stdin <<SQL 2>/dev/null
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
SQL
)

if [ -n "$TABLES" ]; then
    echo -e "${GREEN}✓ Tables found:${NC}"
    echo "$TABLES" | grep -v "table_name" | grep -v "^-" | grep -v "^(" | sed 's/^/ - /'
else
    echo -e "${YELLOW}⚠ No tables found - run migrations first${NC}"
fi

echo ""
echo -e "${YELLOW}👤 Checking admin user...${NC}"

# Check if admin user exists
ADMIN_EXISTS=$(npx prisma db execute --stdin <<SQL 2>/dev/null
SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN';
SQL
)

if echo "$ADMIN_EXISTS" | grep -q "1"; then
    echo -e "${GREEN}✓ Admin user exists${NC}"
else
    echo -e "${YELLOW}⚠ No admin user found - run: npm run db:seed${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Verification Complete!${NC}"
echo ""
echo -e "${YELLOW}📊 Supabase Dashboard:${NC}"
echo "  https://app.supabase.com/project/okexcmjsuvctvjgvvzqh"
echo ""
echo -e "${YELLOW}🔧 Useful Commands:${NC}"
echo "  npx prisma studio          # Open database GUI"
echo "  npx prisma migrate dev     # Run migrations"
echo "  npm run db:seed            # Seed database"
echo ""

