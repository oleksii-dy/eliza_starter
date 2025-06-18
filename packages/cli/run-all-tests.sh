#!/bin/bash
# run-all-tests.sh

# Don't use set -e, we want to handle errors ourselves
# set -e

# Set test environment variables
export ELIZA_TEST_MODE="true"
export NODE_ENV="test"

echo "🧪 Running elizaOS CLI Test Suite"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Track PIDs for cleanup
CHILD_PIDS=()
CLEANUP_DONE=false
BATS_RUNNING=false

# Cleanup function
cleanup() {
  if [ "$CLEANUP_DONE" = "true" ]; then
    return
  fi
  
  # Don't cleanup if BATS is still running
  if [ "$BATS_RUNNING" = "true" ]; then
    echo -e "\n${YELLOW}BATS tests still running, skipping cleanup${NC}"
    return
  fi
  
  CLEANUP_DONE=true
  
  echo -e "\n${YELLOW}Cleaning up test processes...${NC}"
  
  # Only kill tracked background processes (not BATS)
  for pid in "${CHILD_PIDS[@]}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "Killing background process $pid"
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  
  # Wait briefly for graceful shutdown
  sleep 1
  
  # Force kill any remaining tracked processes
  for pid in "${CHILD_PIDS[@]}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "Force killing background process $pid"
      kill -KILL "$pid" 2>/dev/null || true
    fi
  done
  
  # Kill any orphaned elizaos server processes (but not test runners)
  pkill -f "elizaos start" 2>/dev/null || true
  pkill -f "node.*dist/index.js start" 2>/dev/null || true
  
  # Clean up test artifacts
  rm -rf ~/.eliza/test-* 2>/dev/null || true
}

# Set up signal handlers
trap cleanup EXIT
trap cleanup SIGINT
trap cleanup SIGTERM
trap cleanup SIGHUP

# Function to run test suite
run_test_suite() {
  local suite_name="$1"
  local test_command="$2"
  
  echo -e "\n${YELLOW}Running ${suite_name}...${NC}"
  echo -e "${BLUE}Command: ${test_command}${NC}"
  
  # Special handling for BATS tests - run them in foreground
  if [[ "$test_command" == *"bats"* ]]; then
    BATS_RUNNING=true
    # Run BATS tests in foreground to ensure they complete properly
    if eval "$test_command"; then
      echo -e "${GREEN}✓ ${suite_name} passed${NC}"
      ((PASSED_TESTS++))
    else
      local exit_code=$?
      # Skip exit code 143 (SIGTERM) as it might be from cleanup
      if [[ $exit_code -ne 143 ]]; then
        echo -e "${RED}✗ ${suite_name} failed with exit code: ${exit_code}${NC}"
        ((FAILED_TESTS++))
      else
        echo -e "${YELLOW}⚠ ${suite_name} was terminated${NC}"
        ((FAILED_TESTS++))
      fi
    fi
    ((TOTAL_TESTS++))
    BATS_RUNNING=false
  else
    # For non-BATS tests, run in background as before
    eval "$test_command" &
    local test_pid=$!
    CHILD_PIDS+=($test_pid)
    
    # Wait for test to complete
    if wait $test_pid; then
      echo -e "${GREEN}✓ ${suite_name} passed${NC}"
      ((PASSED_TESTS++))
    else
      local exit_code=$?
      echo -e "${RED}✗ ${suite_name} failed with exit code: ${exit_code}${NC}"
      ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    
    # Remove PID from tracking
    CHILD_PIDS=(${CHILD_PIDS[@]/$test_pid})
  fi
}

# Change to CLI directory
cd "$(dirname "$0")"

# Build the CLI first
echo "Building CLI..."
if ! bun run build; then
  echo -e "${RED}Build failed!${NC}"
  exit 1
fi

# Verify build completed successfully
if [ ! -f "dist/index.js" ]; then
  echo -e "${RED}Build appears incomplete - dist/index.js not found!${NC}"
  exit 1
fi

echo -e "${GREEN}Build completed successfully${NC}"

# Run TypeScript checks
# Skip TypeScript validation due to dependency type issues
echo -e "${YELLOW}⚠ Skipping TypeScript validation due to dependency type issues${NC}"
# run_test_suite "TypeScript Validation" "tsc --noEmit"

# Run unit tests - disable coverage in CI due to memory constraints
if [ "$CI" = "true" ]; then
  echo -e "${YELLOW}Running tests without coverage in CI to avoid memory issues${NC}"
  run_test_suite "Unit Tests" "cross-env NODE_OPTIONS=\"--max-old-space-size=4096\" bun test tests/commands --timeout 300000"
else
  # Run with coverage locally
  run_test_suite "Unit Tests" "bun test tests/commands --coverage"
fi

# Run BATS tests if available
if command -v bats >/dev/null 2>&1; then
  # Set shorter timeout for BATS tests in CI
  if [ "$CI" = "true" ]; then
    export TEST_TIMEOUT=10  # Reduce from default 30s to 10s in CI
  fi
  
  run_test_suite "BATS Command Tests" "bats tests/bats/commands"
  run_test_suite "BATS Integration Tests" "bats tests/bats/integration" 
  run_test_suite "BATS E2E Tests" "bats tests/bats/e2e"
else
  echo -e "${YELLOW}⚠ BATS not installed, skipping integration tests${NC}"
  echo "Install BATS with: brew install bats-core (macOS) or apt-get install bats (Linux)"
fi

# Test global installation
echo -e "\n${YELLOW}Testing global installation...${NC}"

# Skip global install test if requested or in monorepo
if [ "$SKIP_GLOBAL_INSTALL" = "true" ]; then
  echo -e "${YELLOW}⚠ Skipping global install test (SKIP_GLOBAL_INSTALL=true)${NC}"
elif [ -f "../../pnpm-workspace.yaml" ] || [ -f "../../package.json" ]; then
  echo -e "${YELLOW}⚠ Detected monorepo environment, skipping global install test${NC}"
  echo -e "${YELLOW}  To test global install: cd to a temporary directory outside the monorepo${NC}"
else
  # Try to get npm prefix outside of workspace context
  NPM_PREFIX=$(cd /tmp && npm config get prefix 2>/dev/null || echo "")
  if [ -z "$NPM_PREFIX" ]; then
    echo -e "${YELLOW}⚠ Could not determine npm prefix, skipping global install test${NC}"
  elif [ ! -w "$NPM_PREFIX" ] && [ "$CI" != "true" ]; then
    echo -e "${YELLOW}⚠ No write access to npm global directory ($NPM_PREFIX), skipping global install test${NC}"
    echo -e "${YELLOW}  To enable: npm config set prefix ~/.npm-global${NC}"
  else
    # Try npm pack with error handling
    echo -e "${BLUE}Running npm pack...${NC}"
    if npm pack 2>&1; then
      PACKAGE_FILE=$(ls elizaos-cli-*.tgz 2>/dev/null | head -n 1)
      if [[ -n "$PACKAGE_FILE" ]]; then
        echo -e "${BLUE}Found package file: $PACKAGE_FILE${NC}"
        run_test_suite "Global Install Test" "npm install -g ./$PACKAGE_FILE && elizaos --version && npm uninstall -g @elizaos/cli"
        rm -f "$PACKAGE_FILE"
      else
        echo -e "${RED}✗ npm pack succeeded but no .tgz file found${NC}"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
      fi
    else
      echo -e "${RED}✗ npm pack failed${NC}"
      ((FAILED_TESTS++))
      ((TOTAL_TESTS++))
    fi
  fi
fi

# Summary
echo -e "\n================================="
echo -e "Test Summary:"
echo -e "Total: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [[ $FAILED_TESTS -eq 0 ]]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed!${NC}"
  exit 1
fi 