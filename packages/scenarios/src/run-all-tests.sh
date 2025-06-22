#!/bin/bash

echo "Running ElizaOS Scenario Tests"
echo "=============================="
echo ""

# Array of scenario names to test
scenarios=(
    "truth-vs-lie"
    "research-task"
    "coding-challenge"
    "workflow-planning"
    "01-research-knowledge"
    "02-github-todo"
    "03-planning-execution"
    "04-rolodex-relationship"
    "05-stagehand-web"
    "06-blockchain-defi"
    "07-plugin-manager"
    "08-secrets-security"
    "09-complex-investigation"
    "10-automated-deployment"
)

failed_scenarios=()
passed_scenarios=()

# Run each scenario
for scenario in "${scenarios[@]}"; do
    echo "Testing: $scenario"
    echo "-------------------"
    
    # Run the test and capture exit code
    npx tsx src/test-runner.ts --filter="$scenario" > /dev/null 2>&1
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ PASSED: $scenario"
        passed_scenarios+=("$scenario")
    else
        echo "❌ FAILED: $scenario"
        failed_scenarios+=("$scenario")
    fi
    echo ""
done

# Summary
echo "=============================="
echo "Test Summary"
echo "=============================="
echo "Total: ${#scenarios[@]}"
echo "Passed: ${#passed_scenarios[@]}"
echo "Failed: ${#failed_scenarios[@]}"
echo ""

if [ ${#failed_scenarios[@]} -gt 0 ]; then
    echo "Failed scenarios:"
    for scenario in "${failed_scenarios[@]}"; do
        echo "  - $scenario"
    done
    exit 1
else
    echo "All scenarios passed!"
    exit 0
fi 