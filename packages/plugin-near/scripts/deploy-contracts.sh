#!/bin/bash

# NEAR Smart Contract Deployment Script
# This script deploys the escrow and messaging contracts to NEAR testnet

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}NEAR Smart Contract Deployment${NC}"
echo "================================"

# Check if NEAR_ADDRESS is set
if [ -z "$NEAR_ADDRESS" ]; then
    echo -e "${RED}Error: NEAR_ADDRESS not set${NC}"
    echo "Please run: export NEAR_ADDRESS=your-account.testnet"
    exit 1
fi

# Check if logged in to NEAR CLI
echo -e "${YELLOW}Checking NEAR CLI authentication...${NC}"
if ! near state $NEAR_ADDRESS --accountId $NEAR_ADDRESS > /dev/null 2>&1; then
    echo -e "${RED}Error: Not logged in to NEAR CLI${NC}"
    echo "Please run: near login"
    echo "Or import your account with: near add-key $NEAR_ADDRESS <public_key>"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated as $NEAR_ADDRESS${NC}"

# Set contract accounts
ESCROW_ACCOUNT="escrow.$NEAR_ADDRESS"
MESSAGING_ACCOUNT="messaging.$NEAR_ADDRESS"

# Get current balance
BALANCE=$(near state $NEAR_ADDRESS --accountId $NEAR_ADDRESS | grep -o "formattedAmount: '[0-9.]*'" | cut -d"'" -f2)
echo -e "${GREEN}Current balance: $BALANCE NEAR${NC}"

# Create log file
LOG_FILE="deployment-$(date +%Y%m%d-%H%M%S).log"
echo "Deployment started at $(date)" > $LOG_FILE

# Function to log and execute
log_exec() {
    echo -e "${YELLOW}$1${NC}"
    echo "$ $2" >> $LOG_FILE
    eval $2 2>&1 | tee -a $LOG_FILE
}

# Step 1: Create escrow subaccount
echo -e "\n${GREEN}Step 1: Creating escrow subaccount${NC}"
if near state $ESCROW_ACCOUNT --accountId $ESCROW_ACCOUNT > /dev/null 2>&1; then
    echo -e "${YELLOW}Escrow account already exists${NC}"
else
    log_exec "Creating $ESCROW_ACCOUNT..." \
        "near create-account $ESCROW_ACCOUNT --masterAccount $NEAR_ADDRESS --initialBalance 0.5"
fi

# Step 2: Deploy escrow contract
echo -e "\n${GREEN}Step 2: Deploying escrow contract${NC}"
log_exec "Deploying to $ESCROW_ACCOUNT..." \
    "near deploy $ESCROW_ACCOUNT wasm/escrow.wasm"

# Step 3: Initialize escrow contract
echo -e "\n${GREEN}Step 3: Initializing escrow contract${NC}"
log_exec "Initializing..." \
    "near call $ESCROW_ACCOUNT init '{\"owner\": \"$NEAR_ADDRESS\"}' --accountId $NEAR_ADDRESS"

# Step 4: Create messaging subaccount
echo -e "\n${GREEN}Step 4: Creating messaging subaccount${NC}"
if near state $MESSAGING_ACCOUNT --accountId $MESSAGING_ACCOUNT > /dev/null 2>&1; then
    echo -e "${YELLOW}Messaging account already exists${NC}"
else
    log_exec "Creating $MESSAGING_ACCOUNT..." \
        "near create-account $MESSAGING_ACCOUNT --masterAccount $NEAR_ADDRESS --initialBalance 1"
fi

# Step 5: Deploy messaging contract
echo -e "\n${GREEN}Step 5: Deploying messaging contract${NC}"
log_exec "Deploying to $MESSAGING_ACCOUNT..." \
    "near deploy $MESSAGING_ACCOUNT wasm/messaging.wasm"

# Step 6: Initialize messaging contract
echo -e "\n${GREEN}Step 6: Initializing messaging contract${NC}"
log_exec "Initializing..." \
    "near call $MESSAGING_ACCOUNT init '{\"owner\": \"$NEAR_ADDRESS\"}' --accountId $NEAR_ADDRESS"

# Step 7: Verify deployments
echo -e "\n${GREEN}Step 7: Verifying deployments${NC}"

echo -e "${YELLOW}Testing escrow contract...${NC}"
near view $ESCROW_ACCOUNT get_stats '{}' 2>&1 | tee -a $LOG_FILE || echo -e "${RED}Escrow verification failed${NC}"

echo -e "${YELLOW}Testing messaging contract...${NC}"
near view $MESSAGING_ACCOUNT get_stats '{}' 2>&1 | tee -a $LOG_FILE || echo -e "${RED}Messaging verification failed${NC}"

# Save contract addresses
echo -e "\n${GREEN}Saving contract addresses to .env.contracts${NC}"
cat > .env.contracts << EOF
# NEAR Smart Contract Addresses
# Generated on $(date)
NEAR_ESCROW_CONTRACT=$ESCROW_ACCOUNT
NEAR_MESSAGING_CONTRACT=$MESSAGING_ACCOUNT
EOF

# Final balance
FINAL_BALANCE=$(near state $NEAR_ADDRESS --accountId $NEAR_ADDRESS | grep -o "formattedAmount: '[0-9.]*'" | cut -d"'" -f2)

echo -e "\n${GREEN}====== Deployment Complete ======${NC}"
echo -e "Escrow Contract: ${GREEN}$ESCROW_ACCOUNT${NC}"
echo -e "Messaging Contract: ${GREEN}$MESSAGING_ACCOUNT${NC}"
echo -e "Initial Balance: $BALANCE NEAR"
echo -e "Final Balance: $FINAL_BALANCE NEAR"
echo -e "Log file: $LOG_FILE"
echo -e "\n${YELLOW}Add the following to your .env file:${NC}"
cat .env.contracts

# Update deployment log
echo -e "\n## Deployment Results - $(date)" >> ../DEPLOYMENT_LOG.md
echo "- Initial Balance: $BALANCE NEAR" >> ../DEPLOYMENT_LOG.md
echo "- Final Balance: $FINAL_BALANCE NEAR" >> ../DEPLOYMENT_LOG.md
echo "- Escrow Contract: $ESCROW_ACCOUNT" >> ../DEPLOYMENT_LOG.md
echo "- Messaging Contract: $MESSAGING_ACCOUNT" >> ../DEPLOYMENT_LOG.md
echo "- Log File: scripts/$LOG_FILE" >> ../DEPLOYMENT_LOG.md 