#!/bin/bash

# Script to start ElizaOS with automatic turbo cache cleanup
# This prevents the "cache miss" issue when ctrl+c is used

echo "🧹 Clearing turbo cache to prevent cache issues..."
rm -rf .turbo

echo "🚀 Starting ElizaOS..."
bun run start "$@" 