#!/bin/sh

# Node.js version check
REQUIRED_NODE_VERSION=22
CURRENT_NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')

# Compare Node versions
if [ "$(expr "$CURRENT_NODE_VERSION" \< "$REQUIRED_NODE_VERSION")" -eq 1 ]; then
    echo "\033[1;31mError: Node.js version must be $REQUIRED_NODE_VERSION or higher. Current version is $CURRENT_NODE_VERSION.\033[0m"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm >/dev/null 2>&1; then
    echo "\033[1;31mError: pnpm is not installed. Please install pnpm before running the script.\033[0m"
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")"/.. || exit 1

# Start project
echo "starting agent"
if ! pnpm start --character='./characters/openai-test.character.json'; then
    echo "\033[1;31mFailed to start project.\033[0m"
    exit 1
fi
