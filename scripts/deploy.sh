#!/bin/bash

# Production Deployment Script

set -e

echo "🚀 Deploying to Production"
echo "=========================="
echo ""

# Check if on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
    echo "❌ Must be on main branch to deploy"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Uncommitted changes detected. Please commit or stash them."
    exit 1
fi

# Run tests
echo "🧪 Running tests..."
./scripts/test.sh

# Build backend
echo "🔨 Building backend..."
cd server
npm run build
cd ..

# Build admin dashboard
echo "🎨 Building admin dashboard..."
cd admin-dashboard
npm run build
cd ..

# Build extension
echo "🔌 Building extension..."
npm run build

echo ""
echo "✓ Build completed successfully!"
echo ""
echo "📦 Ready to deploy:"
echo "  - Backend: server/dist/"
echo "  - Admin Dashboard: admin-dashboard/dist/"
echo "  - Extension: dist/"
echo ""
echo "Next steps:"
echo "1. Deploy backend to your server"
echo "2. Deploy admin dashboard to hosting"
echo "3. Publish extension to Chrome Web Store"

