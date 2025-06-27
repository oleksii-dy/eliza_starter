#!/bin/bash
# Wrapper script to run elizaos test

# Try the built version first
if [ -f "../cli/dist/src/index.js" ]; then
    echo "Running elizaos test with built CLI..."
    exec node ../cli/dist/src/index.js test "$@"
else
    echo "Built CLI not found, running from source..."
    exec bun run ../cli/src/index.ts test "$@"
fi 