#!/bin/bash
# timeout-test-runner.sh - Run CLI tests with timeout and freeze detection

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OVERALL_TIMEOUT_MINUTES=20
INDIVIDUAL_TEST_TIMEOUT_MINUTES=10
FREEZE_DETECTION_INTERVAL=30  # Check for progress every 30 seconds
FREEZE_THRESHOLD=600          # No output for 10 minutes = freeze

echo -e "${BLUE}🧪 ElizaOS CLI Test Suite with Timeout Controls${NC}"
echo "================================================================="
echo -e "${YELLOW}Configuration:${NC}"
echo "  • Overall timeout: ${OVERALL_TIMEOUT_MINUTES} minutes"
echo "  • Individual test timeout: ${INDIVIDUAL_TEST_TIMEOUT_MINUTES} minutes"
echo "  • Freeze detection: ${FREEZE_THRESHOLD} seconds without output"
echo "================================================================="

# Function to run command with timeout and freeze detection
run_with_timeout_and_freeze_detection() {
    local test_name="$1"
    local test_command="$2"
    local individual_timeout=$((INDIVIDUAL_TEST_TIMEOUT_MINUTES * 60))
    
    echo -e "\n${YELLOW}Starting: ${test_name}${NC}"
    echo "Command: $test_command"
    echo "Timeout: ${INDIVIDUAL_TEST_TIMEOUT_MINUTES} minutes"
    echo "Starting at: $(date)"
    
    # Create temporary files for monitoring
    local output_file=$(mktemp)
    local pid_file=$(mktemp)
    local last_output_file=$(mktemp)
    
    # Initialize last output time
    date +%s > "$last_output_file"
    
    # Start the test command in background with output capture
    {
        eval "$test_command" 2>&1 | while IFS= read -r line; do
            echo "$line"
            echo "$line" >> "$output_file"
            # Update last output time
            date +%s > "$last_output_file"
        done
        echo $? > "$pid_file"
    } &
    
    local test_pid=$!
    local start_time=$(date +%s)
    local last_check_time=$start_time
    
    # Monitor the process
    while kill -0 $test_pid 2>/dev/null; do
        local current_time=$(date +%s)
        local elapsed_time=$((current_time - start_time))
        local last_output_time=$(cat "$last_output_file" 2>/dev/null || echo $start_time)
        local time_since_output=$((current_time - last_output_time))
        
        # Check for overall timeout
        if [ $elapsed_time -gt $individual_timeout ]; then
            echo -e "\n${RED}⏰ TIMEOUT: ${test_name} exceeded ${INDIVIDUAL_TEST_TIMEOUT_MINUTES} minutes${NC}"
            echo -e "${RED}This test is taking too long and should be analyzed/optimized${NC}"
            kill -TERM $test_pid 2>/dev/null || true
            sleep 5
            kill -KILL $test_pid 2>/dev/null || true
            cleanup_temp_files "$output_file" "$pid_file" "$last_output_file"
            return 1
        fi
        
        # Check for freeze (no output)
        if [ $time_since_output -gt $FREEZE_THRESHOLD ]; then
            echo -e "\n${RED}🧊 FREEZE DETECTED: No output from ${test_name} for ${FREEZE_THRESHOLD} seconds${NC}"
            echo -e "${RED}Test appears to be frozen/stuck${NC}"
            echo -e "${YELLOW}Last output was at: $(date -r $last_output_time 2>/dev/null || date)${NC}"
            
            # Try to get stack trace or debug info
            echo -e "${YELLOW}Attempting to gather debug information...${NC}"
            ps aux | grep -E "(vitest|bun|node)" | head -10 || true
            
            kill -TERM $test_pid 2>/dev/null || true
            sleep 5
            kill -KILL $test_pid 2>/dev/null || true
            cleanup_temp_files "$output_file" "$pid_file" "$last_output_file"
            return 1
        fi
        
        # Progress indicator every minute
        if [ $((elapsed_time % 60)) -eq 0 ] && [ $elapsed_time -gt $last_check_time ]; then
            local minutes=$((elapsed_time / 60))
            echo -e "${BLUE}⏱️  Progress: ${test_name} running for ${minutes} minute(s)...${NC}"
            last_check_time=$elapsed_time
        fi
        
        sleep $FREEZE_DETECTION_INTERVAL
    done
    
    # Get exit code
    wait $test_pid
    local exit_code=$?
    
    # Show completion status
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    local duration_minutes=$((total_duration / 60))
    local duration_seconds=$((total_duration % 60))
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ ${test_name} completed successfully${NC}"
        echo -e "${GREEN}Duration: ${duration_minutes}m ${duration_seconds}s${NC}"
    else
        echo -e "${RED}❌ ${test_name} failed (exit code: $exit_code)${NC}"
        echo -e "${RED}Duration: ${duration_minutes}m ${duration_seconds}s${NC}"
        
        # Show last few lines of output for debugging
        echo -e "${YELLOW}Last output from test:${NC}"
        tail -10 "$output_file" 2>/dev/null || echo "No output captured"
    fi
    
    cleanup_temp_files "$output_file" "$pid_file" "$last_output_file"
    return $exit_code
}

# Function to clean up temporary files
cleanup_temp_files() {
    local output_file="$1"
    local pid_file="$2"
    local last_output_file="$3"
    
    rm -f "$output_file" "$pid_file" "$last_output_file" 2>/dev/null || true
}

# Function to run test suite with tracking
run_test_suite() {
    local suite_name="$1"
    local test_command="$2"
    
    if run_with_timeout_and_freeze_detection "$suite_name" "$test_command"; then
        echo -e "${GREEN}✓ ${suite_name} passed${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ ${suite_name} failed${NC}"
        ((FAILED_TESTS++))
        FAILED_SUITE_NAMES+=("$suite_name")
        
        # Ask if we should continue or stop
        echo -e "${YELLOW}❓ Test suite '${suite_name}' failed. Continue with remaining tests? (y/n)${NC}"
        read -r -t 10 response || response="y"  # Default to continue after 10 seconds
        
        if [[ "$response" =~ ^[Nn] ]]; then
            echo -e "${RED}Stopping test execution as requested${NC}"
            return 1
        fi
    fi
    ((TOTAL_TESTS++))
    return 0
}

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_SUITE_NAMES=()
OVERALL_START_TIME=$(date +%s)

# Change to CLI directory
cd "$(dirname "$0")/.."

echo -e "\n${YELLOW}Building CLI first...${NC}"
if ! run_with_timeout_and_freeze_detection "CLI Build" "bun run build"; then
    echo -e "${RED}❌ CLI build failed - cannot proceed with tests${NC}"
    exit 1
fi

echo -e "\n${BLUE}🚀 Starting test execution...${NC}"

# Run TypeScript validation
run_test_suite "TypeScript Validation" "tsc --noEmit" || exit 1

# Run unit tests with memory optimization
if [ "$CI" = "true" ]; then
    echo -e "${YELLOW}Running in CI mode - reduced memory usage${NC}"
    run_test_suite "Unit Tests" "cross-env NODE_OPTIONS=\"--max-old-space-size=4096\" bun test tests/commands --timeout 300000"
else
    run_test_suite "Unit Tests" "bun test tests/commands --timeout 300000"
fi

# Run BATS tests if available
if command -v bats >/dev/null 2>&1; then
    run_test_suite "BATS Command Tests" "bats tests/bats/commands"
    run_test_suite "BATS Integration Tests" "bats tests/bats/integration"
    run_test_suite "BATS E2E Tests" "bats tests/bats/e2e"
else
    echo -e "${YELLOW}⚠️  BATS not installed, skipping integration tests${NC}"
    echo "Install BATS with: brew install bats-core (macOS) or apt-get install bats (Linux)"
fi

# Test global installation if not in CI
if [ "$CI" != "true" ]; then
    echo -e "\n${YELLOW}Testing global installation...${NC}"
    npm pack > /dev/null 2>&1
    PACKAGE_FILE=$(ls elizaos-cli-*.tgz | head -n 1)
    if [[ -n "$PACKAGE_FILE" ]]; then
        run_test_suite "Global Install Test" "npm install -g ./$PACKAGE_FILE && elizaos --version && npm uninstall -g @elizaos/cli"
        rm -f "$PACKAGE_FILE"
    fi
fi

# Calculate overall duration
OVERALL_END_TIME=$(date +%s)
OVERALL_DURATION=$((OVERALL_END_TIME - OVERALL_START_TIME))
OVERALL_MINUTES=$((OVERALL_DURATION / 60))
OVERALL_SECONDS=$((OVERALL_DURATION % 60))

# Check if we exceeded overall timeout
OVERALL_TIMEOUT_SECONDS=$((OVERALL_TIMEOUT_MINUTES * 60))
if [ $OVERALL_DURATION -gt $OVERALL_TIMEOUT_SECONDS ]; then
    echo -e "\n${RED}⚠️  WARNING: Total test execution exceeded overall timeout of ${OVERALL_TIMEOUT_MINUTES} minutes${NC}"
    echo -e "${RED}Consider breaking up tests or optimizing slow test suites${NC}"
fi

# Summary report
echo -e "\n================================================================="
echo -e "${BLUE}📊 Test Execution Summary${NC}"
echo "================================================================="
echo -e "Total Duration: ${OVERALL_MINUTES}m ${OVERALL_SECONDS}s"
echo -e "Overall Timeout: ${OVERALL_TIMEOUT_MINUTES} minutes ($([ $OVERALL_DURATION -gt $OVERALL_TIMEOUT_SECONDS ] && echo "EXCEEDED" || echo "within limit"))"
echo -e "Total Test Suites: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [[ ${#FAILED_SUITE_NAMES[@]} -gt 0 ]]; then
    echo -e "\n${RED}Failed Test Suites:${NC}"
    for suite in "${FAILED_SUITE_NAMES[@]}"; do
        echo -e "  ${RED}• ${suite}${NC}"
    done
fi

# Performance analysis
echo -e "\n${BLUE}📈 Performance Analysis:${NC}"
if [ $OVERALL_DURATION -gt 1200 ]; then  # > 20 minutes
    echo -e "${RED}• Test suite is taking longer than 20 minutes - optimization needed${NC}"
elif [ $OVERALL_DURATION -gt 600 ]; then  # > 10 minutes
    echo -e "${YELLOW}• Test suite is taking longer than 10 minutes - consider optimization${NC}"
else
    echo -e "${GREEN}• Test suite duration is acceptable${NC}"
fi

# Recommendations
if [[ $FAILED_TESTS -gt 0 ]]; then
    echo -e "\n${YELLOW}💡 Recommendations:${NC}"
    echo "• Fix failing tests before proceeding"
    echo "• Run individual test suites to isolate issues"
    echo "• Check test logs for specific error details"
    echo "• Consider increasing timeouts for legitimate long-running tests"
fi

# Exit with appropriate code
if [[ $FAILED_TESTS -eq 0 ]]; then
    echo -e "\n${GREEN}🎉 All test suites passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some test suites failed!${NC}"
    exit 1
fi