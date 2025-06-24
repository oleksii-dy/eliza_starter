#!/bin/bash

# CrossMint Plugin Test Runner
# This script helps run different test suites with proper environment setup

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    print_error "Bun is not installed. Please install Bun first: https://bun.sh"
    exit 1
fi

# Parse command line arguments
TEST_TYPE=${1:-unit}

case $TEST_TYPE in
    unit)
        print_status "Running unit tests..."
        bun test src/__tests__/integration.test.ts
        ;;
    
    integration)
        print_status "Running integration tests..."
        if [ -z "$CROSSMINT_API_KEY" ]; then
            print_warning "CROSSMINT_API_KEY not set. Integration tests will be skipped."
        fi
        bun test src/__tests__/e2e/
        ;;
    
    all)
        print_status "Running all tests..."
        bun test
        ;;
    
    watch)
        print_status "Running tests in watch mode..."
        bun test --watch
        ;;
    
    debug)
        print_status "Running debug utilities..."
        bun test-utils/test-production.mjs
        ;;
    
    *)
        echo "Usage: $0 [unit|integration|all|watch|debug]"
        echo ""
        echo "Options:"
        echo "  unit        - Run unit tests only (default)"
        echo "  integration - Run integration tests (requires CROSSMINT_API_KEY)"
        echo "  all         - Run all tests"
        echo "  watch       - Run tests in watch mode"
        echo "  debug       - Run debug utilities"
        exit 1
        ;;
esac

print_status "Tests completed!" 