#!/bin/bash

# Rolodex Plugin Scenario Test Runner
# This script runs all rolodex scenarios and generates a report

echo "🚀 Starting Rolodex Plugin Scenario Tests"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create results directory
RESULTS_DIR="scenario-results/rolodex-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

# Function to run a scenario
run_scenario() {
    local scenario_id=$1
    local scenario_name=$2
    echo -e "${YELLOW}Running scenario: $scenario_name${NC}"
    echo "----------------------------------------"
    
    # Run from the CLI directory
    cd ../cli
    
    # Run the scenario and capture output
    if npm run scenario -- --scenarios "$scenario_id" --verbose > "$RESULTS_DIR/$scenario_id.log" 2>&1; then
        echo -e "${GREEN}✓ $scenario_name passed${NC}"
        echo "PASSED" > "$RESULTS_DIR/$scenario_id.result"
    else
        echo -e "${RED}✗ $scenario_name failed${NC}"
        echo "FAILED" > "$RESULTS_DIR/$scenario_id.result"
    fi
    
    # Return to plugin directory
    cd ../packages/plugin-rolodex
    echo ""
}

# Run all scenarios
echo "Running Entity Introduction scenario..."
run_scenario "rolodex-entity-introduction" "Entity Introduction and Extraction"

echo "Running Relationship Building scenario..."
run_scenario "rolodex-relationship-building" "Relationship Building and Evolution"

echo "Running Trust Evolution scenario..."
run_scenario "rolodex-trust-evolution" "Trust Evolution and Security"

echo "Running Complex Network scenario..."
run_scenario "rolodex-complex-network" "Complex Professional Network"

echo "Running Follow-up Management scenario..."
run_scenario "rolodex-follow-up-management" "Follow-up Scheduling and Management"

# Generate summary report
echo "========================================"
echo "📊 Test Summary"
echo "========================================"

PASSED=0
FAILED=0

for result_file in "$RESULTS_DIR"/*.result; do
    if grep -q "PASSED" "$result_file"; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
done

echo -e "Total scenarios: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""
echo "Detailed logs saved to: $RESULTS_DIR"

# Create summary report
cat > "$RESULTS_DIR/summary.txt" << EOF
Rolodex Plugin Scenario Test Results
====================================
Date: $(date)
Total Scenarios: $((PASSED + FAILED))
Passed: $PASSED
Failed: $FAILED

Individual Results:
EOF

for scenario in "entity-introduction" "relationship-building" "trust-evolution" "complex-network" "follow-up-management"; do
    if [ -f "$RESULTS_DIR/rolodex-$scenario.result" ]; then
        result=$(cat "$RESULTS_DIR/rolodex-$scenario.result")
        echo "- rolodex-$scenario: $result" >> "$RESULTS_DIR/summary.txt"
    fi
done

echo ""
echo "Summary report: $RESULTS_DIR/summary.txt"

# Exit with appropriate code
if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi 