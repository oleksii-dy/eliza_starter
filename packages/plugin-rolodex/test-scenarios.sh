#!/bin/bash

echo "🧪 Running Rolodex Scenario Tests..."

# Build the plugin first
echo "📦 Building plugin..."
bun run build

# Run each scenario
echo "🏃 Running scenarios..."

# Track entities scenario
echo "Testing entity tracking..."
bun elizaos scenario run scenarios/rolodex/track-entities.yaml

# Relationship building
echo "Testing relationship extraction..."
bun elizaos scenario run scenarios/rolodex/relationships.yaml

# Search functionality
echo "Testing entity search..."
bun elizaos scenario run scenarios/rolodex/search.yaml

echo "✅ All scenario tests complete!" 