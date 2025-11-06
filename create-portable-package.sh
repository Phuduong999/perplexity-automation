#!/bin/bash

# Script to create portable package for Windows
# This creates a ready-to-use extension package that can be copied to any Windows machine

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║           Creating Portable Extension Package for Windows                   ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Build the extension
echo "📦 Step 1: Building extension..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Step 2: Create portable folder
echo "📂 Step 2: Creating PORTABLE_EXTENSION folder..."
rm -rf PORTABLE_EXTENSION
mkdir -p PORTABLE_EXTENSION

# Step 3: Copy all necessary files from dist
echo "📋 Step 3: Copying extension files..."
cp -r dist/* PORTABLE_EXTENSION/

# Step 4: Create documentation files
echo "📝 Step 4: Creating documentation..."
# Files already created: INSTALL.txt and README_PORTABLE.txt

# Step 5: Create ZIP file for easy transfer
echo "📦 Step 5: Creating ZIP package..."
rm -f PORTABLE_EXTENSION.zip

# Check if zip command exists
if command -v zip &> /dev/null; then
    cd PORTABLE_EXTENSION
    zip -r ../PORTABLE_EXTENSION.zip . -x "*.DS_Store"
    cd ..
    echo "✅ ZIP package created: PORTABLE_EXTENSION.zip"
else
    echo "⚠️  'zip' command not found. Creating tar.gz instead..."
    tar -czf PORTABLE_EXTENSION.tar.gz PORTABLE_EXTENSION/
    echo "✅ TAR.GZ package created: PORTABLE_EXTENSION.tar.gz"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                            ✅ PACKAGE READY!                                 ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📦 Package location:"
echo "   - Folder: ./PORTABLE_EXTENSION/"
if [ -f "PORTABLE_EXTENSION.zip" ]; then
    echo "   - ZIP:    ./PORTABLE_EXTENSION.zip"
else
    echo "   - TAR.GZ: ./PORTABLE_EXTENSION.tar.gz"
fi
echo ""
echo "📋 Next steps:"
echo "   1. Copy PORTABLE_EXTENSION.zip to Windows machine"
echo "   2. Extract the ZIP file"
echo "   3. Read INSTALL.txt for installation instructions"
echo "   4. Put Excel files in IngredientName/ folder"
echo "   5. Load extension in Chrome (chrome://extensions/)"
echo ""
echo "🎯 No Node.js or GitHub needed on target machine!"
echo ""

