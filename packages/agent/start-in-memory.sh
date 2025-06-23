#!/bin/bash

# Start Eliza with in-memory database
# This avoids WebAssembly issues by not persisting data to disk

echo "Starting Eliza with in-memory database..."
echo "WARNING: All data will be lost when the agent stops!"
echo ""

# Force PGLite to use in-memory mode
export DATABASE_PATH=":memory:"
export PGLITE_PATH=":memory:"

# Start the agent
bun run start 