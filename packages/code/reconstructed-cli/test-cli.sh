#!/bin/bash

# Test script for Claude CLI

echo "Testing Claude CLI..."
echo

# Test help
echo "1. Testing --help flag:"
node dist/cli.js --help > /dev/null && echo "✅ Help command works" || echo "❌ Help command failed"

# Test version
echo "2. Testing --version flag:"
VERSION=$(node dist/cli.js --version)
[[ "$VERSION" == "1.0.0" ]] && echo "✅ Version command works ($VERSION)" || echo "❌ Version command failed"

# Test auth command
echo "3. Testing auth command:"
node dist/cli.js auth > /dev/null && echo "✅ Auth command works" || echo "❌ Auth command failed"

# Test parameter validation
echo "4. Testing parameter validation:"
node dist/cli.js --temperature 2.5 complete "test" 2>&1 | grep -q "Temperature must be between 0 and 1" && echo "✅ Temperature validation works" || echo "❌ Temperature validation failed"
node dist/cli.js --max-tokens -5 complete "test" 2>&1 | grep -q "Max tokens must be a positive integer" && echo "✅ Max tokens validation works" || echo "❌ Max tokens validation failed"

# Test API key validation
echo "5. Testing API key validation:"
node dist/cli.js --api-key invalid complete "test" 2>&1 | grep -q "Invalid API key format" && echo "✅ API key validation works" || echo "❌ API key validation failed"

# Test streaming mode
echo "6. Testing streaming mode:"
node dist/cli.js --api-key sk-test123456789012345678901234567890123456789 --stream complete "test" 2>&1 | grep -q "mock streaming response" && echo "✅ Streaming mode works" || echo "❌ Streaming mode failed"

# Test chat mode
echo "7. Testing chat mode:"
echo "exit" | node dist/cli.js --api-key sk-test123456789012345678901234567890123456789 chat 2>&1 | grep -q "Starting Claude CLI chat session" && echo "✅ Chat mode works" || echo "❌ Chat mode failed"

# Test session creation
echo "8. Testing session management:"
[[ -d ~/.claude-cli/sessions ]] && echo "✅ Session directory created" || echo "❌ Session directory not created"

# Test autonomous features
echo "9. Testing autonomous agent features:"
# Clean up any existing CLAUDE.md first
rm -f CLAUDE.md
node dist/cli.js init > /dev/null 2>&1 && [[ -f CLAUDE.md ]] && echo "✅ Init command creates CLAUDE.md" || echo "❌ Init command failed"
node dist/cli.js memorize "Test memory" > /dev/null 2>&1 && grep -q "Test memory" CLAUDE.md && echo "✅ Memorize command works" || echo "❌ Memorize command failed"
rm -f CLAUDE.md  # Clean up

echo
echo "Testing complete!" 