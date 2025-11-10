#!/bin/bash

# Test Script - Run all tests

set -e

echo "🧪 Running All Tests"
echo "===================="
echo ""

# Backend tests
echo "📦 Backend Tests..."
cd server
npm test
echo ""

# Extension build test
echo "🔌 Extension Build Test..."
cd ..
npm run build
echo ""

echo "✓ All tests passed!"

