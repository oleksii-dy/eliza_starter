# EVM Client for Eliza

A WebSocket-based EVM event listener that integrates with Eliza agents, allowing them to monitor and discuss blockchain events through natural language conversation.

## Overview

The EVM Client connects to the blockchain via WebSocket, monitors specified events, formats them for agent understanding, and enables natural conversation about them through different interfaces (currently implemented for console, expandable to Discord etc.).

## Setup Guide

### 1. Configure Event Monitoring (config.json)

- Set your WebSocket endpoint (rpcUrl)
- Specify contracts to monitor:
 - Contract address
 - Event topics to watch
 - Event ABI definition
 - Event descriptions (for documentation)

Example provided shows monitoring of Uniswap V3 USDC/DAI swaps.

### 2. Configure Event Handling (messages.ts)

Three main components need to be configured:

#### a. Event Formatters
Create formatters for each event type you want to monitor. These format raw event data into readable text.
- Implement the EventFormatter interface
- Handle specific parameters for your events
- Example provided shows USDC/DAI swap amount formatting

#### b. Event Content Creation
Modify createEventContent to structure how event data appears in memory.
- Format text field as desired
- Structure event information
- Set metadata for system use

#### c. Response Template
Configure how the agent understands and responds to events.
- Set context elements (bio, lore, etc.)
- Structure event information presentation
- Define response instructions

### 3. Client Setup
Currently configured for Direct client (console). Modify room management in MessageManager for different clients.

## Current Implementation Example

The provided implementation monitors USDC/DAI swaps on Uniswap V3, formats amounts with proper decimals, and enables agent conversation about the swaps.

## Extending

- Add new event types by updating config.json and creating corresponding formatters
- Implement different client interfaces by modifying room management
- Customize event formatting and agent responses by adjusting templates