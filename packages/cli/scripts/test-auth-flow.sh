#!/bin/bash

# Test Authentication Flow Script
# Runs comprehensive tests for the device authentication flow

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${CLI_ROOT}/../.." && pwd)"

echo "🧪 ElizaOS Authentication Flow Tests"
echo "===================================="

# Check if bats is available
if ! command -v bats >/dev/null 2>&1; then
    echo "❌ BATS not found. Installing..."
    
    if command -v npm >/dev/null 2>&1; then
        npm install -g bats
    elif command -v bun >/dev/null 2>&1; then
        bun add -g bats
    else
        echo "❌ Please install BATS test framework first"
        exit 1
    fi
fi

# Ensure CLI is built
echo "🔨 Building CLI..."
cd "${CLI_ROOT}"
bun run build

# Ensure platform client is built
echo "🔨 Building platform client..."
cd "${REPO_ROOT}/packages/platform"
bun run build:client

# Set test environment
export REPO_ROOT="${REPO_ROOT}"
export CLI_ROOT="${CLI_ROOT}"
export TEST_MODE=true

# Run the comprehensive auth flow tests
echo "🚀 Running authentication flow tests..."
cd "${CLI_ROOT}"

# Run specific test file with detailed output
bats tests/bats/auth-device-flow.bats --verbose --print-output-on-failure

echo ""
echo "✅ Authentication flow tests completed!"
echo ""
echo "🔧 To run individual tests:"
echo "  bats tests/bats/auth-device-flow.bats -f 'platform server starts'"
echo "  bats tests/bats/auth-device-flow.bats -f 'complete device flow'"
echo ""
echo "📖 To run all CLI tests:"
echo "  cd packages/cli && bun test"