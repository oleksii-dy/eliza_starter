#!/bin/bash

echo "🎯 Simple Scenario Test"
echo "====================="
echo ""

# Set environment variables
export DATABASE_TYPE=pglite
export NODE_ENV=test

# Go to CLI directory
cd "$(dirname "$0")/.."

echo "📍 Current directory: $(pwd)"
echo ""

# Check if dist exists
if [ ! -d "dist" ]; then
    echo "❌ dist directory not found. Building CLI..."
    bun x tsup
    echo "✅ Build complete"
fi

echo "📋 Running scenario test..."
echo ""

# Run the scenario with minimal setup
node dist/index.js scenario run --filter "truth" --verbose 2>&1 | grep -v "Debugger" | head -50

echo ""
echo "✅ Test complete" 