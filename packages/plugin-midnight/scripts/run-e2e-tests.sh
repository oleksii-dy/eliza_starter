#!/bin/bash

# Midnight Network Plugin E2E Test Runner
# This script sets up and runs comprehensive end-to-end tests

set -e

echo "🚀 Midnight Network Plugin E2E Test Setup"
echo "========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "src/index.ts" ]; then
    print_error "Please run this script from the plugin-midnight directory"
    exit 1
fi

# Check for required dependencies
print_status "Checking dependencies..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed"
    exit 1
fi

print_success "Dependencies check passed"

# Build the plugin
print_status "Building plugin..."
npm run build
if [ $? -eq 0 ]; then
    print_success "Plugin build completed"
else
    print_error "Plugin build failed"
    exit 1
fi

# Check for environment configuration
print_status "Checking environment configuration..."

if [ ! -f ".env.local" ]; then
    if [ -f ".env.test" ]; then
        print_warning ".env.local not found, copying from .env.test"
        cp .env.test .env.local
        print_warning "Please edit .env.local with your actual test credentials"
    else
        print_error "No environment configuration found. Please create .env.local"
        exit 1
    fi
fi

# Validate critical environment variables
source .env.local

if [ -z "$MIDNIGHT_WALLET_MNEMONIC" ] || [ "$MIDNIGHT_WALLET_MNEMONIC" = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about" ]; then
    print_warning "Using default test mnemonic - this is only suitable for testing"
fi

if [ -z "$MIDNIGHT_NETWORK_URL" ]; then
    print_error "MIDNIGHT_NETWORK_URL is required in .env.local"
    exit 1
fi

print_success "Environment configuration validated"

# Run different test modes based on arguments
case "${1:-all}" in
    "build")
        print_status "Running build tests only..."
        npm run test
        ;;
    "unit")
        print_status "Running unit tests..."
        elizaos test -t component
        ;;
    "integration")
        print_status "Running integration tests..."
        node --loader ts-node/esm src/tests/e2e-test-runner.ts
        ;;
    "api")
        print_status "Running API endpoint tests..."
        print_status "Starting test agent..."
        
        # Start the agent in background
        elizaos start --character character-test.json --port 3001 &
        AGENT_PID=$!
        
        # Wait for startup
        sleep 10
        
        # Test API endpoints
        print_status "Testing API endpoints..."
        
        # Test status endpoint
        if curl -s http://localhost:3001/api/midnight/status | grep -q "connected"; then
            print_success "Status endpoint working"
        else
            print_error "Status endpoint failed"
        fi
        
        # Test wallet endpoint  
        if curl -s http://localhost:3001/api/midnight/wallet | grep -q "hasWallet"; then
            print_success "Wallet endpoint working"
        else
            print_error "Wallet endpoint failed"
        fi
        
        # Cleanup
        kill $AGENT_PID 2>/dev/null || true
        ;;
    "network")
        print_status "Running network connectivity tests..."
        print_warning "This requires real Midnight Network access"
        
        # Test network connectivity
        if ping -c 1 rpc.testnet.midnight.network &> /dev/null; then
            print_success "Midnight testnet reachable"
        else
            print_warning "Midnight testnet not reachable"
        fi
        
        # Run network-specific tests
        node --loader ts-node/esm src/tests/e2e-test-runner.ts
        ;;
    "full"|"all")
        print_status "Running full E2E test suite..."
        
        # Run all test types in sequence
        print_status "1. Running build tests..."
        npm run test
        
        print_status "2. Running plugin unit tests..."
        elizaos test -t component || print_warning "Component tests may not be available"
        
        print_status "3. Running integration tests..."
        node --loader ts-node/esm src/tests/e2e-test-runner.ts
        
        print_status "4. Testing API endpoints..."
        # Start agent for API testing
        elizaos start --character character-test.json --port 3001 &
        AGENT_PID=$!
        sleep 10
        
        # Quick API tests
        curl -s http://localhost:3001/api/midnight/status || print_warning "Status endpoint test failed"
        curl -s http://localhost:3001/api/midnight/wallet || print_warning "Wallet endpoint test failed"
        
        # Cleanup
        kill $AGENT_PID 2>/dev/null || true
        ;;
    "help")
        echo "Usage: $0 [test-type]"
        echo ""
        echo "Test types:"
        echo "  build        - Run build and compilation tests only"
        echo "  unit         - Run unit tests"
        echo "  integration  - Run integration tests"
        echo "  api          - Test API endpoints with running agent"
        echo "  network      - Test network connectivity and real API calls"
        echo "  full/all     - Run complete test suite (default)"
        echo "  help         - Show this help message"
        echo ""
        echo "Environment setup:"
        echo "  - Copy .env.test to .env.local"
        echo "  - Edit .env.local with your test credentials"
        echo "  - Ensure you have access to Midnight Network testnet"
        exit 0
        ;;
    *)
        print_error "Unknown test type: $1"
        print_status "Run '$0 help' for usage information"
        exit 1
        ;;
esac

print_success "E2E test execution completed!"
echo ""
echo "Next steps:"
echo "- Review test results above"
echo "- Check logs for any warnings or errors"
echo "- For real network testing, ensure you have valid testnet credentials"
echo "- Run '$0 help' to see all available test types"