#!/bin/bash
# run-unit-tests.sh - Simple unit test runner

echo "🧪 Running elizaOS CLI Unit Tests"
echo "================================="

# Run unit tests
echo "Running unit tests..."
bun test tests/commands --coverage

exit_code=$?

if [ $exit_code -eq 0 ]; then
  echo -e "\n✅ All unit tests passed!"
else
  echo -e "\n❌ Unit tests failed with exit code: $exit_code"
fi

exit $exit_code 