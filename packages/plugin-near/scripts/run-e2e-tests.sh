#!/bin/bash

echo "======================================"
echo "NEAR Plugin E2E Test Runner"
echo "======================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found"
  echo "Please create a .env file with your NEAR credentials"
  exit 1
fi

# Source the .env file
source .env

# Verify required environment variables
required_vars=("NEAR_NETWORK" "NEAR_ADDRESS" "NEAR_WALLET_PUBLIC_KEY" "NEAR_WALLET_SECRET_KEY")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: $var is not set in .env"
    exit 1
  fi
done

echo "✅ Environment configured"
echo "  Network: $NEAR_NETWORK"
echo "  Account: $NEAR_ADDRESS"
echo ""

# Run different test suites
echo "Running E2E Tests..."
echo ""

# Plugin structure tests
echo "1. Testing plugin structure and initialization..."
bun test src/__tests__/e2e/near-plugin.test.ts

# Storage integration tests
echo ""
echo "2. Testing on-chain storage operations..."
bun test src/__tests__/e2e/storage-integration.test.ts

# Agent interaction tests
echo ""
echo "3. Testing agent-to-agent interactions..."
bun test src/__tests__/e2e/agent-interactions.test.ts

# Multi-agent communication tests
echo ""
echo "4. Testing multi-agent communication scenarios..."
bun test src/__tests__/e2e/multi-agent-communication.test.ts

# Run all tests with the elizaos test runner
echo ""
echo "5. Running all tests with elizaos test runner..."
cd ../..
bun run packages/cli/src/index.ts test --name "near-plugin-integration"

echo ""
echo "======================================"
echo "E2E Tests Complete"
echo "======================================" 