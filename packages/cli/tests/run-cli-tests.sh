#!/bin/bash

# CLI Test Runner Script
# This script runs the CLI validation tests and integrates with existing test infrastructure

set -e

echo "🧪 Running CLI Testing Infrastructure..."
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the CLI package directory?"
    exit 1
fi

# Check if CLI package
if ! grep -q '"name": "@elizaos/cli"' package.json; then
    print_error "This doesn't appear to be the CLI package directory"
    exit 1
fi

print_status "Detected CLI package at $(pwd)"

# Build CLI first if not built
if [ ! -f "dist/index.js" ]; then
    print_status "Building CLI..."
    bun run build
    if [ $? -ne 0 ]; then
        print_error "Failed to build CLI"
        exit 1
    fi
    print_status "CLI built successfully"
else
    print_status "CLI already built"
fi

# Run the CLI validation tests
print_status "Running CLI validation tests..."
bun test tests/commands/cli-validation.test.ts --timeout 60000
CLI_TEST_EXIT_CODE=$?

# Run integration tests if basic tests pass
if [ $CLI_TEST_EXIT_CODE -eq 0 ]; then
    print_status "Running CLI integration tests..."
    bun test tests/integration/cli-integration.test.ts --timeout 120000
    INTEGRATION_TEST_EXIT_CODE=$?
else
    print_warning "Skipping integration tests due to CLI validation test failures"
    INTEGRATION_TEST_EXIT_CODE=1
fi

# Run the custom CLI test runner
print_status "Running custom CLI test runner..."
bun run tests/cli-test-runner.ts --timeout 60000
CUSTOM_TEST_EXIT_CODE=$?

# Summary
echo ""
echo "==============================================="
echo "🧪 CLI Test Results Summary"
echo "==============================================="

if [ $CLI_TEST_EXIT_CODE -eq 0 ]; then
    print_status "✅ CLI Validation Tests: PASSED"
else
    print_error "❌ CLI Validation Tests: FAILED"
fi

if [ $INTEGRATION_TEST_EXIT_CODE -eq 0 ]; then
    print_status "✅ CLI Integration Tests: PASSED"
else
    print_error "❌ CLI Integration Tests: FAILED"
fi

if [ $CUSTOM_TEST_EXIT_CODE -eq 0 ]; then
    print_status "✅ Custom CLI Tests: PASSED"
else
    print_error "❌ Custom CLI Tests: FAILED"
fi

# Exit with appropriate code
if [ $CLI_TEST_EXIT_CODE -eq 0 ] && [ $INTEGRATION_TEST_EXIT_CODE -eq 0 ] && [ $CUSTOM_TEST_EXIT_CODE -eq 0 ]; then
    echo ""
    print_status "🎉 All CLI tests passed!"
    exit 0
else
    echo ""
    print_error "❌ Some CLI tests failed"
    exit 1
fi