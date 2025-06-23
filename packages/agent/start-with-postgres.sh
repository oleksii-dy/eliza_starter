#!/bin/bash

# Start Eliza with PostgreSQL instead of PGLite
# This avoids the WebAssembly issues with PGLite

echo "Starting Eliza with PostgreSQL..."
echo "Make sure PostgreSQL is running and accessible at localhost:5432"
echo ""

# Set the PostgreSQL URL environment variable
# This will make the SQL plugin use PostgreSQL instead of PGLite
export POSTGRES_URL="postgresql://localhost:5432/eliza"

# You can also set other environment variables here if needed
# export OPENAI_API_KEY="your-key-here"
# export ANTHROPIC_API_KEY="your-key-here"

# Start the agent
bun run start 