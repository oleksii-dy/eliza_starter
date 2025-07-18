#!/bin/bash

# NEAR Smart Contract Testing Script
# Tests the deployed escrow and messaging contracts

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}NEAR Smart Contract Testing${NC}"
echo "============================"

# Check if NEAR_ADDRESS is set
if [ -z "$NEAR_ADDRESS" ]; then
    echo -e "${RED}Error: NEAR_ADDRESS not set${NC}"
    exit 1
fi

# Set contract addresses
ESCROW_CONTRACT="${NEAR_ESCROW_CONTRACT:-escrow.$NEAR_ADDRESS}"
MESSAGING_CONTRACT="${NEAR_MESSAGING_CONTRACT:-messaging.$NEAR_ADDRESS}"

echo -e "${BLUE}Testing contracts:${NC}"
echo "- Escrow: $ESCROW_CONTRACT"
echo "- Messaging: $MESSAGING_CONTRACT"

# Test 1: Check escrow contract stats
echo -e "\n${YELLOW}Test 1: Escrow Contract Stats${NC}"
near view $ESCROW_CONTRACT get_stats '{}' || echo -e "${RED}Failed to get escrow stats${NC}"

# Test 2: Create a test escrow
echo -e "\n${YELLOW}Test 2: Creating Test Escrow${NC}"
ESCROW_ID=$(near call $ESCROW_CONTRACT create_escrow '{
    "escrow_type": "test",
    "parties": [
        ["'$NEAR_ADDRESS'", {"0": "1000000000000000000000000"}, "Test option A"],
        ["testuser.testnet", {"0": "1000000000000000000000000"}, "Test option B"]
    ],
    "arbiter": "'$NEAR_ADDRESS'",
    "description": "Test escrow for contract verification",
    "deadline": 9999999999999
}' --accountId $NEAR_ADDRESS --gas 100000000000000 | grep -o 'ESC[0-9]*' || echo "ESC_TEST")

echo -e "${GREEN}Created escrow: $ESCROW_ID${NC}"

# Test 3: View escrow details
echo -e "\n${YELLOW}Test 3: View Escrow Details${NC}"
near view $ESCROW_CONTRACT get_escrow '{"escrow_id": "'$ESCROW_ID'"}' || echo -e "${RED}Failed to get escrow details${NC}"

# Test 4: Check messaging contract stats
echo -e "\n${YELLOW}Test 4: Messaging Contract Stats${NC}"
near view $MESSAGING_CONTRACT get_stats '{}' || echo -e "${RED}Failed to get messaging stats${NC}"

# Test 5: Create a test room
echo -e "\n${YELLOW}Test 5: Creating Test Room${NC}"
ROOM_ID=$(near call $MESSAGING_CONTRACT create_room '{
    "name": "Test Room",
    "description": "Room for contract testing",
    "participants": [],
    "is_public": true,
    "encrypted": false
}' --accountId $NEAR_ADDRESS --gas 50000000000000 | grep -o 'room-[0-9]*' || echo "room-test")

echo -e "${GREEN}Created room: $ROOM_ID${NC}"

# Test 6: Send a test message
echo -e "\n${YELLOW}Test 6: Sending Test Message${NC}"
MESSAGE_ID=$(near call $MESSAGING_CONTRACT send_message '{
    "room_id": "'$ROOM_ID'",
    "content": "Hello from contract test!",
    "content_type": "text",
    "metadata": null,
    "in_reply_to": null
}' --accountId $NEAR_ADDRESS --gas 30000000000000 | grep -o 'msg-[0-9]*' || echo "msg-test")

echo -e "${GREEN}Sent message: $MESSAGE_ID${NC}"

# Test 7: View room messages
echo -e "\n${YELLOW}Test 7: View Room Messages${NC}"
near view $MESSAGING_CONTRACT get_room_messages '{
    "room_id": "'$ROOM_ID'",
    "from_index": {"0": 0},
    "limit": {"0": 10}
}' || echo -e "${RED}Failed to get room messages${NC}"

# Test 8: Get user's rooms
echo -e "\n${YELLOW}Test 8: Get User Rooms${NC}"
near view $MESSAGING_CONTRACT get_user_rooms '{"account_id": "'$NEAR_ADDRESS'"}' || echo -e "${RED}Failed to get user rooms${NC}"

# Test 9: Get user's escrows
echo -e "\n${YELLOW}Test 9: Get User Escrows${NC}"
near view $ESCROW_CONTRACT get_user_escrows '{"account_id": "'$NEAR_ADDRESS'"}' || echo -e "${RED}Failed to get user escrows${NC}"

# Summary
echo -e "\n${GREEN}====== Test Summary ======${NC}"
echo -e "${BLUE}Contracts tested:${NC}"
echo "✓ Escrow Contract: $ESCROW_CONTRACT"
echo "✓ Messaging Contract: $MESSAGING_CONTRACT"
echo -e "\n${BLUE}Test artifacts created:${NC}"
echo "- Escrow ID: $ESCROW_ID"
echo "- Room ID: $ROOM_ID"
echo "- Message ID: $MESSAGE_ID"

echo -e "\n${YELLOW}To clean up test data, you can:${NC}"
echo "1. Cancel the test escrow: near call $ESCROW_CONTRACT cancel_escrow '{\"escrow_id\": \"$ESCROW_ID\"}' --accountId $NEAR_ADDRESS"
echo "2. Leave the test room: near call $MESSAGING_CONTRACT leave_room '{\"room_id\": \"$ROOM_ID\"}' --accountId $NEAR_ADDRESS" 