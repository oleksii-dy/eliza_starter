#!/bin/bash

# Navigate to the plugin-sql package
cd packages/plugin-sql

# Build the migration script
echo "Building migration script..."
bun run tsup src/migrate.ts --format esm

# Run the migration
echo "Running migrations..."
node dist/migrate.js

# Return to the root directory
cd ../.. 