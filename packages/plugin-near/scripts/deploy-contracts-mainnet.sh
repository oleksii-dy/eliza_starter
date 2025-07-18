#!/bin/bash

# NEAR Smart Contract Deployment Script - MAINNET
# This script deploys the escrow and messaging contracts to NEAR mainnet
# WARNING: This deploys to mainnet and will cost real NEAR tokens!

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}╔════════════════════════════════════════╗${NC}"
echo -e "${RED}║     MAINNET DEPLOYMENT WARNING         ║${NC}"
echo -e "${RED}║                                        ║${NC}"
echo -e "${RED}║  This will deploy to NEAR mainnet      ║${NC}"
echo -e "${RED}║  and will cost real NEAR tokens!       ║${NC}"
echo -e "${RED}╚════════════════════════════════════════╝${NC}"
echo ""

# Confirmation prompt
read -p "Are you SURE you want to deploy to mainnet? Type 'DEPLOY TO MAINNET' to confirm: " CONFIRM
if [ "$CONFIRM" != "DEPLOY TO MAINNET" ]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Check if NEAR_ADDRESS is set
if [ -z "$NEAR_ADDRESS" ]; then
    echo -e "${RED}Error: NEAR_ADDRESS not set${NC}"
    echo "Please run: export NEAR_ADDRESS=your-account.near"
    exit 1
fi

# Ensure we're on mainnet
export NEAR_ENV=mainnet

# Check if logged in to NEAR CLI
echo -e "${YELLOW}Checking NEAR CLI authentication...${NC}"
if ! near state $NEAR_ADDRESS --networkId mainnet > /dev/null 2>&1; then
    echo -e "${RED}Error: Not logged in to NEAR CLI on mainnet${NC}"
    echo "Please run: NEAR_ENV=mainnet near login"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated as $NEAR_ADDRESS on mainnet${NC}"

# Set contract accounts
ESCROW_ACCOUNT="escrow.$NEAR_ADDRESS"
MESSAGING_ACCOUNT="messaging.$NEAR_ADDRESS"

# Get current balance
BALANCE=$(near state $NEAR_ADDRESS --networkId mainnet | grep -o "formattedAmount: '[0-9.]*'" | cut -d"'" -f2)
echo -e "${GREEN}Current balance: $BALANCE NEAR${NC}"

# Check minimum balance (recommend at least 10 NEAR for deployment)
BALANCE_NUM=$(echo $BALANCE | cut -d' ' -f1)
if (( $(echo "$BALANCE_NUM < 10" | bc -l) )); then
    echo -e "${RED}Warning: Low balance detected. Recommend at least 10 NEAR for deployment.${NC}"
    read -p "Continue anyway? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# Create log file
LOG_FILE="deployment-mainnet-$(date +%Y%m%d-%H%M%S).log"
echo "Mainnet deployment started at $(date)" > $LOG_FILE

# Function to log and execute
log_exec() {
    echo -e "${YELLOW}$1${NC}"
    echo "$ $2" >> $LOG_FILE
    eval $2 2>&1 | tee -a $LOG_FILE
}

# Final safety check
echo -e "\n${BLUE}Deployment Plan:${NC}"
echo -e "- Escrow Contract: ${ESCROW_ACCOUNT}"
echo -e "- Messaging Contract: ${MESSAGING_ACCOUNT}"
echo -e "- Estimated cost: ~2.5 NEAR"
echo ""
read -p "Proceed with mainnet deployment? (y/N): " FINAL_CONFIRM
if [ "$FINAL_CONFIRM" != "y" ]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Step 1: Create escrow subaccount
echo -e "\n${GREEN}Step 1: Creating escrow subaccount${NC}"
if near state $ESCROW_ACCOUNT --networkId mainnet > /dev/null 2>&1; then
    echo -e "${YELLOW}Escrow account already exists${NC}"
    read -p "Redeploy contract? (y/N): " REDEPLOY
    if [ "$REDEPLOY" != "y" ]; then
        echo "Skipping escrow deployment"
    fi
else
    log_exec "Creating $ESCROW_ACCOUNT..." \
        "near create-account $ESCROW_ACCOUNT --masterAccount $NEAR_ADDRESS --initialBalance 0.5 --networkId mainnet"
fi

# Step 2: Deploy escrow contract
if [ "$REDEPLOY" = "y" ] || [ -z "$REDEPLOY" ]; then
    echo -e "\n${GREEN}Step 2: Deploying escrow contract${NC}"
    log_exec "Deploying to $ESCROW_ACCOUNT..." \
        "near deploy $ESCROW_ACCOUNT wasm/escrow.wasm --networkId mainnet"
    
    # Step 3: Initialize escrow contract
    echo -e "\n${GREEN}Step 3: Initializing escrow contract${NC}"
    log_exec "Initializing..." \
        "near call $ESCROW_ACCOUNT init '{\"owner\": \"$NEAR_ADDRESS\"}' --accountId $NEAR_ADDRESS --networkId mainnet"
fi

# Step 4: Create messaging subaccount
echo -e "\n${GREEN}Step 4: Creating messaging subaccount${NC}"
if near state $MESSAGING_ACCOUNT --networkId mainnet > /dev/null 2>&1; then
    echo -e "${YELLOW}Messaging account already exists${NC}"
    read -p "Redeploy contract? (y/N): " REDEPLOY_MSG
    if [ "$REDEPLOY_MSG" != "y" ]; then
        echo "Skipping messaging deployment"
    fi
else
    log_exec "Creating $MESSAGING_ACCOUNT..." \
        "near create-account $MESSAGING_ACCOUNT --masterAccount $NEAR_ADDRESS --initialBalance 1 --networkId mainnet"
fi

# Step 5: Deploy messaging contract
if [ "$REDEPLOY_MSG" = "y" ] || [ -z "$REDEPLOY_MSG" ]; then
    echo -e "\n${GREEN}Step 5: Deploying messaging contract${NC}"
    log_exec "Deploying to $MESSAGING_ACCOUNT..." \
        "near deploy $MESSAGING_ACCOUNT wasm/messaging.wasm --networkId mainnet"
    
    # Step 6: Initialize messaging contract
    echo -e "\n${GREEN}Step 6: Initializing messaging contract${NC}"
    log_exec "Initializing..." \
        "near call $MESSAGING_ACCOUNT init '{\"owner\": \"$NEAR_ADDRESS\"}' --accountId $NEAR_ADDRESS --networkId mainnet"
fi

# Step 7: Verify deployments
echo -e "\n${GREEN}Step 7: Verifying deployments${NC}"

echo -e "${YELLOW}Testing escrow contract...${NC}"
near view $ESCROW_ACCOUNT get_stats '{}' --networkId mainnet 2>&1 | tee -a $LOG_FILE || echo -e "${RED}Escrow verification failed${NC}"

echo -e "${YELLOW}Testing messaging contract...${NC}"
near view $MESSAGING_ACCOUNT get_stats '{}' --networkId mainnet 2>&1 | tee -a $LOG_FILE || echo -e "${RED}Messaging verification failed${NC}"

# Save contract addresses
echo -e "\n${GREEN}Saving contract addresses to .env.mainnet${NC}"
cat > .env.mainnet << EOF
# NEAR Smart Contract Addresses - MAINNET
# Generated on $(date)
# WARNING: These are MAINNET contracts!
NEAR_ENV=mainnet
NEAR_ESCROW_CONTRACT=$ESCROW_ACCOUNT
NEAR_MESSAGING_CONTRACT=$MESSAGING_ACCOUNT
EOF

# Final balance
FINAL_BALANCE=$(near state $NEAR_ADDRESS --networkId mainnet | grep -o "formattedAmount: '[0-9.]*'" | cut -d"'" -f2)

echo -e "\n${GREEN}====== Mainnet Deployment Complete ======${NC}"
echo -e "Escrow Contract: ${GREEN}$ESCROW_ACCOUNT${NC}"
echo -e "Messaging Contract: ${GREEN}$MESSAGING_ACCOUNT${NC}"
echo -e "Initial Balance: $BALANCE NEAR"
echo -e "Final Balance: $FINAL_BALANCE NEAR"
echo -e "Log file: $LOG_FILE"
echo -e "\n${YELLOW}Mainnet configuration saved to .env.mainnet${NC}"
echo -e "${RED}Remember: These are MAINNET contracts with real value!${NC}" 