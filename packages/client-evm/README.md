# EVM Client for Eliza

A blockchain event monitoring client that integrates with Eliza agents, allowing them to watch and discuss EVM blockchain events through Discord in natural language.

## Overview

The EVM Client:

- Connects to EVM-compatible blockchains via WebSocket
- Monitors specified smart contract events
- Formats blockchain data for agent understanding
- Enables natural language discussion through Discord
- Stores event history in agent's memory

## Setup Guide

1. Installation

npm install @ai16z/client-evm

2. Configuration

Modify the config.json file with your settings:

- rpcUrl: WebSocket endpoint for your blockchain node
- discordChannelId: Where the agent will post event updates
- contracts: Array of contracts to monitor with topic0 hashes, ABIs, event descriptions, etc.

3. Usage

import { EVMClientInterface } from '@ai16z/client-evm';

// In your agent setup:
await EVMClientInterface.start(runtime);

## Working Example: USDC/DAI Swap Monitor

The client comes with a complete implementation monitoring USDC/DAI swaps on Uniswap V3

1. Event Monitoring:

- Watches Uniswap V3 Arbitrum USDC/DAI pool
- Detects swap events
- Decodes transaction data

2. Data Formatting:

- Handles token decimals (6 for USDC, 18 for DAI)
- Formats amounts to human-readable numbers
- Structures swap information

3. Agent Integration:

- Stores events in agent memory
- Generates natural language responses
- Posts updates to Discord

## Customization

1. Event Formatters

Create formatters in implementations/ for your events.

2. Response Templates

Customize how your agent talks about events.

3. Message Management

The client is configured for Discord. The message handler in 'messages.ts' can be modified for other platforms.

## Technical Details

- Uses ethers.js for blockchain interaction
- WebSocket connection with auto-reconnection
- Event decoding using contract ABIs
- Memory storage for event history
- Natural language processing through Eliza framework