#!/bin/bash

# ElizaOS GitHub Plugin E2E Test Runner
# This script helps set up and run end-to-end webhook tests

set -e

echo "🚀 ElizaOS GitHub Plugin E2E Test Setup"
echo "========================================"

# Check if required environment variables are set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN environment variable is required"
    echo "   Please set your GitHub token: export GITHUB_TOKEN=ghp_your_token_here"
    exit 1
fi

# Set default values if not provided
export TEST_OWNER=${TEST_OWNER:-${GITHUB_OWNER}}
export TEST_REPO=${TEST_REPO:-"test-webhook-repo"}
export AGENT_URL=${AGENT_URL:-"http://localhost:3000"}
export AGENT_NAME=${AGENT_NAME:-"ElizaAgent"}
export GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET:-"test-webhook-secret-123"}

echo "Configuration:"
echo "  GitHub Owner: $TEST_OWNER"
echo "  Test Repository: $TEST_REPO"
echo "  Agent URL: $AGENT_URL"
echo "  Agent Name: $AGENT_NAME"
echo ""

# Check if test repository exists
echo "🔍 Checking test repository..."
if ! curl -s -H "Authorization: token $GITHUB_TOKEN" \
     "https://api.github.com/repos/$TEST_OWNER/$TEST_REPO" > /dev/null 2>&1; then
    echo "⚠️  Test repository $TEST_OWNER/$TEST_REPO not found"
    echo ""
    read -p "Do you want to create it? (y/N): " create_repo
    
    if [ "$create_repo" = "y" ] || [ "$create_repo" = "Y" ]; then
        echo "📝 Creating test repository..."
        curl -s -X POST \
             -H "Authorization: token $GITHUB_TOKEN" \
             -H "Accept: application/vnd.github.v3+json" \
             "https://api.github.com/user/repos" \
             -d "{\"name\":\"$TEST_REPO\",\"description\":\"Test repository for ElizaOS GitHub plugin E2E tests\",\"private\":false,\"auto_init\":true}" > /dev/null
        
        if [ $? -eq 0 ]; then
            echo "✅ Test repository created successfully"
        else
            echo "❌ Failed to create test repository"
            exit 1
        fi
    else
        echo "❌ Test repository is required. Please create it manually or set TEST_REPO to an existing repository."
        exit 1
    fi
else
    echo "✅ Test repository found"
fi

# Check if ElizaOS agent is running
echo "🔍 Checking ElizaOS agent..."
if curl -s "$AGENT_URL/api/runtime/health" > /dev/null 2>&1; then
    echo "✅ ElizaOS agent is running"
else
    echo "❌ ElizaOS agent is not running at $AGENT_URL"
    echo "   Please start your ElizaOS agent first:"
    echo "   elizaos start --character your-github-agent.json"
    exit 1
fi

# Check if required packages are installed
echo "🔍 Checking dependencies..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

# Check if we have the required npm packages
cd "$(dirname "$0")/.."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check for specific packages needed by the test script
if ! node -e "require('@octokit/rest')" 2>/dev/null; then
    echo "📦 Installing @octokit/rest..."
    npm install @octokit/rest axios
fi

echo ""
echo "🧪 Starting E2E Tests"
echo "====================="
echo ""

# Run the actual test script
node scripts/e2e-webhook-test.js

echo ""
echo "✅ E2E test run completed"
echo ""
echo "📋 Next Steps:"
echo "  1. Review any failed tests above"
echo "  2. Check ElizaOS logs for webhook processing details"
echo "  3. Verify webhook deliveries in GitHub repository settings"
echo "  4. Clean up any test issues/PRs created during testing"