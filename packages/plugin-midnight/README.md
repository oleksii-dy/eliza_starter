# @elizaos/plugin-midnight

A comprehensive ElizaOS plugin that integrates with Midnight Network to provide secure, privacy-preserving agent communication and payment systems using zero-knowledge proofs.

## 🌟 Features

### 🔐 Zero-Knowledge Privacy

- **Secure Messaging**: End-to-end encrypted communication between agents with ZK proofs for authenticity
- **Private Payments**: Confidential payment transactions with amount and recipient privacy
- **Agent Discovery**: Find other agents while preserving privacy preferences

### 💬 Multi-Agent Communication

- **Direct Messaging**: One-to-one secure communication between agents
- **Chat Rooms**: Create and join secure group chats with ZK-protected membership
- **Message Verification**: Cryptographic proof validation for message integrity

### 💰 Secure Payment System

- **Payment Requests**: Create invoices with escrow protection
- **Instant Transfers**: Send payments with zero-knowledge privacy
- **Reputation Integration**: Build trust through verified transaction history

### 🔍 Agent Discovery

- **Network Exploration**: Discover agents by capabilities and services
- **Reputation System**: Transparent reputation scoring with privacy protection
- **Service Registry**: Advertise and find specialized agent services

## 🚀 Installation

```bash
# Install the plugin
bun add @elizaos/plugin-midnight

# Install required dependencies
bun add @midnight-ntwrk/compact-runtime @midnight-ntwrk/dapp-connector-api @midnight-ntwrk/wallet
```

## ⚙️ Configuration

Set up your environment variables:

```env
# Required Configuration
MIDNIGHT_NETWORK_URL=https://rpc.midnight.network
MIDNIGHT_INDEXER_URL=https://indexer.midnight.network
MIDNIGHT_WALLET_MNEMONIC=your_wallet_mnemonic_phrase_here
MIDNIGHT_PROOF_SERVER_URL=https://proof.midnight.network

# Optional Configuration
MIDNIGHT_NETWORK_ID=mainnet
MIDNIGHT_ZK_CONFIG_URL=https://zk-config.midnight.network
```

## 📝 Usage

### Basic Setup

```typescript
import { midnightPlugin } from '@elizaos/plugin-midnight';

export const character = {
  name: 'SecureAgent',
  plugins: [midnightPlugin],
  bio: ['I am a privacy-focused agent using Midnight Network for secure communications'],
  settings: {
    secrets: {
      MIDNIGHT_WALLET_MNEMONIC: process.env.MIDNIGHT_WALLET_MNEMONIC,
    },
  },
};
```

### Secure Messaging Examples

```bash
# Send a private message
"Send a secure message to Agent_Alice saying 'Hello, this is confidential'"

# Create a chat room
"Create a private chat room called 'Project Alpha' with Bob, Charlie, and Diana"

# Join existing room
"Join chat room at contract address 0x1234567890abcdef..."
```

### Payment System Examples

```bash
# Send payment
"Send 100 MIDNIGHT to Agent_Bob for the consulting work"

# Request payment
"Request payment of 50 MIDNIGHT from Alice for data analysis service"

# Check balance
"What's my current wallet balance?"
```

### Agent Discovery Examples

```bash
# Discover agents
"Find agents with messaging capabilities"

# Browse online agents
"Show me all online agents on the network"

# Search by service
"Find agents that offer payment processing services"
```

## 🔧 API Reference

### Actions

| Action                | Description                          | Example                                     |
| --------------------- | ------------------------------------ | ------------------------------------------- |
| `SEND_SECURE_MESSAGE` | Send encrypted message with ZK proof | "Secure message to Alice: 'Meeting at 3pm'" |
| `CREATE_CHAT_ROOM`    | Deploy new messaging contract        | "Create room 'Dev Team' with Alice, Bob"    |
| `JOIN_CHAT_ROOM`      | Join existing room by contract       | "Join room 0x1234..."                       |
| `SEND_PAYMENT`        | Transfer tokens with privacy         | "Pay 100 MIDNIGHT to Charlie"               |
| `REQUEST_PAYMENT`     | Create payment request with escrow   | "Invoice Bob for 75 tokens"                 |
| `DISCOVER_AGENTS`     | Find agents by capabilities          | "Find messaging agents"                     |

## 🧪 Testing

The plugin includes comprehensive E2E tests that demonstrate real Midnight Network usage:

```bash
# Run all tests
elizaos test

# Run specific test
elizaos test --pattern "Midnight Network"
```

### Test Coverage

- ✅ Network service initialization
- ✅ Wallet information and balance retrieval
- ✅ ZK proof generation and verification
- ✅ Smart contract deployment
- ✅ Secure inter-agent messaging
- ✅ Payment system integration
- ✅ Agent discovery functionality
- ✅ Multi-agent chat room simulation
- ✅ Real network payment transactions

## 🔒 Security Features

### Zero-Knowledge Proofs

All sensitive operations use ZK proofs to ensure:

- **Message Authenticity**: Verify sender without revealing content
- **Payment Privacy**: Confirm transactions without exposing amounts
- **Identity Protection**: Prove capabilities without revealing details

### Encrypted Communication

- End-to-end encryption for all messages
- Forward secrecy for chat room communications
- Secure key exchange using Midnight Network protocols

### Smart Contract Security

- Immutable contract deployment on Midnight Network
- Escrow protection for payment transactions
- Multi-signature support for high-value operations

---

**Built with ❤️ for the ElizaOS ecosystem and Midnight Network community**
