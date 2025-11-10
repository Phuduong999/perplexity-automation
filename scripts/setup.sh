#!/bin/bash

# Perplexity Automation - Complete Setup Script
# This script automates the entire setup process

set -e

echo "🚀 Perplexity Automation - Complete Setup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Print colored message
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi
print_success "Node.js $(node --version) found"

if ! command_exists npm; then
    print_error "npm is not installed."
    exit 1
fi
print_success "npm $(npm --version) found"

if ! command_exists psql; then
    print_warning "PostgreSQL not found. Please install PostgreSQL 15+."
fi

if ! command_exists redis-cli; then
    print_warning "Redis not found. Please install Redis 7+."
fi

echo ""

# Setup Backend
echo "🔧 Setting up Backend..."
cd server

if [ ! -f ".env" ]; then
    cp .env.example .env
    print_success "Created .env file"
    print_warning "Please edit server/.env with your configuration"
else
    print_warning ".env already exists, skipping"
fi

npm install
print_success "Backend dependencies installed"

# Generate Prisma client
npx prisma generate
print_success "Prisma client generated"

echo ""

# Setup Admin Dashboard
echo "🎨 Setting up Admin Dashboard..."
cd ../admin-dashboard

if [ ! -f ".env" ]; then
    cp .env.example .env
    print_success "Created .env file"
else
    print_warning ".env already exists, skipping"
fi

npm install
print_success "Admin dashboard dependencies installed"

echo ""

# Setup Extension
echo "🔌 Setting up Chrome Extension..."
cd ..

npm install
print_success "Extension dependencies installed"

npm run build
print_success "Extension built successfully"

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Setup completed successfully!${NC}"
echo ""
echo "📝 Next steps:"
echo "1. Edit server/.env with your database and AWS credentials"
echo "2. Run database migrations: cd server && npx prisma migrate dev"
echo "3. Seed database: cd server && npm run db:seed"
echo "4. Start backend: cd server && npm run dev"
echo "5. Start admin dashboard: cd admin-dashboard && npm run dev"
echo "6. Load extension in Chrome from the 'dist' folder"
echo ""
echo "📚 For detailed instructions, see SETUP.md"

