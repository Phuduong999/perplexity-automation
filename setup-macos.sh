#!/bin/bash

# Perplexity Automation - macOS Setup Script
# This script sets up the project on macOS

echo "🚀 Perplexity Automation - macOS Setup"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "📥 Please install Node.js from https://nodejs.org/"
    echo "   Or use Homebrew: brew install node"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Build extension
echo "🔨 Building extension..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ dist/ folder not found"
    exit 1
fi

echo "✅ Extension built in dist/ folder"
echo ""

# Instructions
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Open Chrome/Edge browser"
echo "2. Go to chrome://extensions (or edge://extensions)"
echo "3. Enable 'Developer mode' (top right)"
echo "4. Click 'Load unpacked'"
echo "5. Select the 'dist/' folder from this directory"
echo ""
echo "📂 Extension location: $(pwd)/dist"
echo ""
echo "🎯 To start processing:"
echo "   - Click extension icon"
echo "   - Wait 3 seconds for auto-start"
echo "   - Extension will process all 12 Excel files automatically"
echo ""
echo "✅ Setup complete!"

