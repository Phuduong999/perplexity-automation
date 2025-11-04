#!/bin/bash

# Test Helper Script for Perplexity Automation Extension
# Usage: ./test-helper.sh [test|production]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FILE="src/excelPopup.ts"

function print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Perplexity Automation - Test Helper${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

function print_current_mode() {
    echo -e "${YELLOW}📊 Current Configuration:${NC}"
    echo ""
    
    # Extract current TEST_MODE value
    TEST_MODE=$(grep "const TEST_MODE = " "$FILE" | sed 's/.*= \(.*\);/\1/')
    ROWS_PER_THREAD=$(grep "const ROWS_PER_THREAD = TEST_MODE" "$FILE" | sed 's/.*? \([0-9]*\) : \([0-9]*\);/\1 or \2/')
    
    echo "   File: $FILE"
    echo "   TEST_MODE: $TEST_MODE"
    
    if [ "$TEST_MODE" = "true" ]; then
        echo -e "   ROWS_PER_THREAD: ${GREEN}5 (Test Mode)${NC}"
        echo ""
        echo -e "${GREEN}✅ Currently in TEST MODE${NC}"
        echo "   - New thread every 5 rows"
        echo "   - Faster testing"
    else
        echo -e "   ROWS_PER_THREAD: ${BLUE}50 (Production Mode)${NC}"
        echo ""
        echo -e "${BLUE}✅ Currently in PRODUCTION MODE${NC}"
        echo "   - New thread every 50 rows"
        echo "   - Production settings"
    fi
    echo ""
}

function set_test_mode() {
    echo -e "${YELLOW}🔧 Switching to TEST MODE...${NC}"
    
    # Use sed to replace TEST_MODE value
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's/const TEST_MODE = false;/const TEST_MODE = true;/' "$FILE"
    else
        # Linux
        sed -i 's/const TEST_MODE = false;/const TEST_MODE = true;/' "$FILE"
    fi
    
    echo -e "${GREEN}✅ Switched to TEST MODE${NC}"
    echo "   - ROWS_PER_THREAD = 5"
    echo ""
    
    build_extension
}

function set_production_mode() {
    echo -e "${YELLOW}🔧 Switching to PRODUCTION MODE...${NC}"
    
    # Use sed to replace TEST_MODE value
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's/const TEST_MODE = true;/const TEST_MODE = false;/' "$FILE"
    else
        # Linux
        sed -i 's/const TEST_MODE = true;/const TEST_MODE = false;/' "$FILE"
    fi
    
    echo -e "${GREEN}✅ Switched to PRODUCTION MODE${NC}"
    echo "   - ROWS_PER_THREAD = 50"
    echo ""
    
    build_extension
}

function build_extension() {
    echo -e "${YELLOW}🔨 Building extension...${NC}"
    npm run build
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Build successful!${NC}"
        echo ""
        echo -e "${BLUE}📦 Next steps:${NC}"
        echo "   1. Go to Chrome: chrome://extensions/"
        echo "   2. Click 'Reload' on Perplexity Automation extension"
        echo "   3. Open Excel Popup and start testing"
        echo ""
    else
        echo ""
        echo -e "${RED}❌ Build failed!${NC}"
        exit 1
    fi
}

function show_test_scenarios() {
    echo -e "${BLUE}🧪 Test Scenarios:${NC}"
    echo ""
    echo "   Test Case 1: Normal Flow (3 rows)"
    echo "   Test Case 2: Markdown Timeout (simulate timeout on row 3)"
    echo "   Test Case 3: Scheduled New Thread (7 rows in TEST_MODE)"
    echo ""
    echo "   See TEST_SCENARIOS.md for detailed instructions"
    echo ""
}

function show_usage() {
    echo "Usage: ./test-helper.sh [command]"
    echo ""
    echo "Commands:"
    echo "   test        - Switch to TEST MODE (5 rows per thread)"
    echo "   production  - Switch to PRODUCTION MODE (50 rows per thread)"
    echo "   status      - Show current configuration"
    echo "   build       - Build extension with current settings"
    echo "   scenarios   - Show test scenarios"
    echo "   help        - Show this help message"
    echo ""
}

# Main script
print_header

case "$1" in
    test)
        set_test_mode
        show_test_scenarios
        ;;
    production)
        set_production_mode
        ;;
    status)
        print_current_mode
        ;;
    build)
        build_extension
        ;;
    scenarios)
        show_test_scenarios
        ;;
    help)
        show_usage
        ;;
    *)
        print_current_mode
        echo ""
        show_usage
        ;;
esac

