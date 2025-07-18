#!/bin/bash

set -e

echo "Testing NEAR Smart Contracts..."
echo "=============================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build contracts first
echo -e "\n${YELLOW}Building contracts...${NC}"
node build.js

# Test escrow contract
echo -e "\n${YELLOW}Testing Escrow Contract${NC}"
echo "----------------------"
cd escrow-js
npm test
cd ..

# Test messaging contract  
echo -e "\n${YELLOW}Testing Messaging Contract${NC}"
echo "-------------------------"
cd messaging-js
npm test
cd ..

echo -e "\n${GREEN}✅ All tests passed!${NC}" 