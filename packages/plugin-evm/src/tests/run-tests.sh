#!/bin/bash

# EVM Plugin Test Runner
# This script helps run different test configurations

echo "🧪 EVM Plugin Test Runner"
echo "========================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to run tests with specific configuration
run_test_suite() {
    local suite_name=$1
    local command=$2
    
    echo -e "\n${YELLOW}Running ${suite_name}...${NC}"
    eval $command
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${suite_name} passed${NC}"
    else
        echo -e "${RED}❌ ${suite_name} failed${NC}"
        exit 1
    fi
}

# Check command line arguments
case "$1" in
    "testnet")
        echo "Running testnet tests only..."
        run_test_suite "Testnet Tests" "bun test --run"
        ;;
    
    "mainnet-swap")
        echo "Running mainnet swap tests..."
        if [ -z "$MAINNET_TEST_PRIVATE_KEY" ]; then
            echo -e "${RED}Error: MAINNET_TEST_PRIVATE_KEY not set${NC}"
            exit 1
        fi
        run_test_suite "Mainnet Swap Tests" "RUN_MAINNET_SWAP_TESTS=true bun test swap-mainnet.test.ts"
        ;;
    
    "mainnet-full")
        echo "Running full mainnet tests..."
        if [ -z "$MAINNET_TEST_PRIVATE_KEY" ]; then
            echo -e "${RED}Error: MAINNET_TEST_PRIVATE_KEY not set${NC}"
            exit 1
        fi
        run_test_suite "Full Mainnet Tests" "RUN_MAINNET_TESTS=true bun test mainnet.test.ts"
        ;;
    
    "all")
        echo "Running all tests (testnet + mainnet)..."
        run_test_suite "Testnet Tests" "bun test --run"
        
        if [ -n "$MAINNET_TEST_PRIVATE_KEY" ]; then
            run_test_suite "Mainnet Swap Tests" "RUN_MAINNET_SWAP_TESTS=true bun test swap-mainnet.test.ts"
            run_test_suite "Full Mainnet Tests" "RUN_MAINNET_TESTS=true bun test mainnet.test.ts"
        else
            echo -e "${YELLOW}Skipping mainnet tests (MAINNET_TEST_PRIVATE_KEY not set)${NC}"
        fi
        ;;
    
    "deploy-governance")
        echo "Deploying governance contracts to testnet..."
        if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
            echo -e "${RED}Error: DEPLOYER_PRIVATE_KEY not set${NC}"
            exit 1
        fi
        bun run src/tests/testnet-governance-deploy.ts
        ;;
    
    "coverage")
        echo "Running tests with coverage..."
        run_test_suite "Coverage Report" "bun test --coverage"
        ;;
    
    *)
        echo "Usage: $0 {testnet|mainnet-swap|mainnet-full|all|deploy-governance|coverage}"
        echo ""
        echo "Options:"
        echo "  testnet          - Run testnet tests only (default, safe)"
        echo "  mainnet-swap     - Run mainnet swap tests (requires MAINNET_TEST_PRIVATE_KEY)"
        echo "  mainnet-full     - Run all mainnet tests (expensive!)"
        echo "  all              - Run all available tests"
        echo "  deploy-governance - Deploy governance contracts to testnet"
        echo "  coverage         - Run tests with coverage report"
        echo ""
        echo "Environment variables:"
        echo "  MAINNET_TEST_PRIVATE_KEY - Private key for mainnet tests"
        echo "  DEPLOYER_PRIVATE_KEY     - Private key for contract deployment"
        echo "  FUNDED_TEST_PRIVATE_KEY  - Private key with testnet funds"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Test run complete!${NC}" 