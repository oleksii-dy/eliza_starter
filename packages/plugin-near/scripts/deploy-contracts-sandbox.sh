#!/bin/bash

# NEAR Smart Contract Deployment Script - Local Sandbox
# This script deploys the escrow and messaging contracts to local sandbox

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}NEAR Smart Contract Deployment - Local Sandbox${NC}"
echo "=============================================="

# Check if near-sandbox is running
if ! pgrep -x "near-sandbox" > /dev/null; then
    echo -e "${RED}Error: near-sandbox is not running${NC}"
    echo "Please start it with: near-sandbox --home ~/.near-sandbox run"
    exit 1
fi

# Set sandbox environment
export NEAR_ENV=sandbox
export NODE_ENV=sandbox

# Create test account
TEST_ACCOUNT="test.near"
ESCROW_ACCOUNT="escrow.test.near"
MESSAGING_ACCOUNT="messaging.test.near"

# Create log file
LOG_FILE="deployment-sandbox-$(date +%Y%m%d-%H%M%S).log"
echo "Sandbox deployment started at $(date)" > $LOG_FILE

# Function to log and execute
log_exec() {
    echo -e "${YELLOW}$1${NC}"
    echo "$ $2" >> $LOG_FILE
    eval $2 2>&1 | tee -a $LOG_FILE
}

# Step 1: Create test account if it doesn't exist
echo -e "\n${GREEN}Step 1: Setting up test account${NC}"
if ! near state $TEST_ACCOUNT > /dev/null 2>&1; then
    log_exec "Creating $TEST_ACCOUNT..." \
        "near create-account $TEST_ACCOUNT --initialBalance 100"
fi

# Step 2: Create escrow subaccount
echo -e "\n${GREEN}Step 2: Creating escrow subaccount${NC}"
if near state $ESCROW_ACCOUNT > /dev/null 2>&1; then
    echo -e "${YELLOW}Escrow account already exists, deleting and recreating...${NC}"
    near delete-account $ESCROW_ACCOUNT $TEST_ACCOUNT --force || true
fi
log_exec "Creating $ESCROW_ACCOUNT..." \
    "near create-account $ESCROW_ACCOUNT --masterAccount $TEST_ACCOUNT --initialBalance 5"

# Step 3: Deploy escrow contract
echo -e "\n${GREEN}Step 3: Deploying escrow contract${NC}"
log_exec "Deploying to $ESCROW_ACCOUNT..." \
    "near deploy $ESCROW_ACCOUNT wasm/escrow.wasm"

# Step 4: Initialize escrow contract
echo -e "\n${GREEN}Step 4: Initializing escrow contract${NC}"
log_exec "Initializing..." \
    "near call $ESCROW_ACCOUNT init '{\"owner\": \"$TEST_ACCOUNT\"}' --accountId $TEST_ACCOUNT"

# Step 5: Create messaging subaccount
echo -e "\n${GREEN}Step 5: Creating messaging subaccount${NC}"
if near state $MESSAGING_ACCOUNT > /dev/null 2>&1; then
    echo -e "${YELLOW}Messaging account already exists, deleting and recreating...${NC}"
    near delete-account $MESSAGING_ACCOUNT $TEST_ACCOUNT --force || true
fi
log_exec "Creating $MESSAGING_ACCOUNT..." \
    "near create-account $MESSAGING_ACCOUNT --masterAccount $TEST_ACCOUNT --initialBalance 5"

# Step 6: Deploy messaging contract
echo -e "\n${GREEN}Step 6: Deploying messaging contract${NC}"
log_exec "Deploying to $MESSAGING_ACCOUNT..." \
    "near deploy $MESSAGING_ACCOUNT wasm/messaging.wasm"

# Step 7: Initialize messaging contract
echo -e "\n${GREEN}Step 7: Initializing messaging contract${NC}"
log_exec "Initializing..." \
    "near call $MESSAGING_ACCOUNT init '{\"owner\": \"$TEST_ACCOUNT\"}' --accountId $TEST_ACCOUNT"

# Step 8: Verify deployments
echo -e "\n${GREEN}Step 8: Verifying deployments${NC}"

echo -e "${YELLOW}Testing escrow contract...${NC}"
near view $ESCROW_ACCOUNT get_stats '{}' 2>&1 | tee -a $LOG_FILE || echo -e "${RED}Escrow verification failed${NC}"

echo -e "${YELLOW}Testing messaging contract...${NC}"
near view $MESSAGING_ACCOUNT get_stats '{}' 2>&1 | tee -a $LOG_FILE || echo -e "${RED}Messaging verification failed${NC}"

# Save contract addresses
echo -e "\n${GREEN}Saving contract addresses to .env.sandbox${NC}"
cat > .env.sandbox << EOF
# NEAR Smart Contract Addresses - Sandbox
# Generated on $(date)
NEAR_ENV=sandbox
NEAR_ESCROW_CONTRACT=$ESCROW_ACCOUNT
NEAR_MESSAGING_CONTRACT=$MESSAGING_ACCOUNT
EOF

echo -e "\n${GREEN}====== Sandbox Deployment Complete ======${NC}"
echo -e "Escrow Contract: ${GREEN}$ESCROW_ACCOUNT${NC}"
echo -e "Messaging Contract: ${GREEN}$MESSAGING_ACCOUNT${NC}"
echo -e "Log file: $LOG_FILE"
echo -e "\n${YELLOW}Sandbox environment configuration saved to .env.sandbox${NC}" 