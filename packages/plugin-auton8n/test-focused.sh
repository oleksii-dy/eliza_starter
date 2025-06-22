#!/bin/bash

echo "Running focused plugin creation tests..."
echo "======================================"

# Run tests and filter output for readability
npm test 2>&1 | grep -E "(Starting|✓|✅|❌|PASSED|FAILED|Test Summary|Status:|Plugin creation|test passed|test failed|Build succeeded)" 