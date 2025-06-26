#!/bin/bash

# Test runner script for all test types

echo "🧪 Running ElizaOS Agent Tests..."
echo "================================"

# Run unit tests
echo ""
echo "📦 Running Unit Tests..."
bun test

# Check if unit tests passed
if [ $? -ne 0 ]; then
    echo "❌ Unit tests failed!"
    exit 1
fi

echo "✅ Unit tests passed!"

# Run type checking
echo ""
echo "🔍 Running Type Check..."
bun run typecheck

if [ $? -ne 0 ]; then
    echo "❌ Type checking failed!"
    exit 1
fi

echo "✅ Type checking passed!"

# Run linting
echo ""
echo "🎨 Running Linter..."
bun run lint:check

if [ $? -ne 0 ]; then
    echo "❌ Linting failed!"
    exit 1
fi

echo "✅ Linting passed!"

# Run format check
echo ""
echo "📐 Checking Code Formatting..."
bun run format:check

if [ $? -ne 0 ]; then
    echo "❌ Format check failed!"
    exit 1
fi

echo "✅ Format check passed!"

echo ""
echo "================================"
echo "✨ All tests passed successfully!"
echo ""
echo "To run specific test suites:"
echo "  - Unit tests: bun test"
echo "  - E2E tests: bun run test:e2e (when available)"
echo "  - Cypress tests: bun run cypress:run"
echo "  - Coverage: bun test --coverage" 