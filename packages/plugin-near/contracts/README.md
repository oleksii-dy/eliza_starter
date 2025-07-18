# NEAR Smart Contracts

This directory contains JavaScript smart contracts for the NEAR plugin, built using `near-sdk-js`.

## Contracts

### 1. Escrow Contract (`escrow-js/`)

The escrow contract manages multi-party fund distribution with the following features:

- **Create Escrow**: Lock funds for distribution to multiple parties
- **Release Escrow**: Distribute funds to all parties (owner only)
- **Cancel Escrow**: Refund locked funds to owner (owner only)
- **Conditional Escrows**: Support for optional conditions per party

#### Key Methods

```javascript
// Initialize contract with owner
init({ owner });

// Create new escrow (requires attached deposit)
create_escrow({ escrow_id, parties, total_amount });

// Release funds to parties
release_escrow({ escrow_id });

// Cancel and refund escrow
cancel_escrow({ escrow_id });

// View escrow details
get_escrow({ escrow_id });
```

### 2. Messaging Contract (`messaging-js/`)

The messaging contract provides on-chain messaging with rooms and direct messages:

- **Rooms**: Create public/private chat rooms with multiple participants
- **Direct Messages**: Send encrypted messages between accounts
- **Message Management**: Edit, delete, and search messages
- **User Controls**: Block/unblock users, join/leave rooms
- **Admin Features**: Room management and moderation

#### Key Methods

```javascript
// Room Management
create_room({ name, description, participants, is_public, encrypted });
join_room({ room_id });
leave_room({ room_id });
update_room({ room_id, name, description, is_public });

// Messaging
send_message({ room_id, content, content_type, metadata, in_reply_to });
send_direct_message({ recipient, content, content_type, metadata });
edit_message({ room_id, message_id, new_content });
delete_message({ room_id, message_id });

// Queries
get_room_messages({ room_id, from_index, limit });
get_inbox({ from_index, limit });
search_messages({ room_id, query, from_index, limit });
get_user_rooms({ account_id });

// User Management
block_user({ user_to_block });
unblock_user({ user_to_unblock });
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- NEAR CLI (optional, for testnet deployment)

### Installation

```bash
# Install dependencies for both contracts
cd escrow-js && npm install && cd ..
cd messaging-js && npm install && cd ..
```

### Building

```bash
# Build all contracts
node build.js

# Or build individually
cd escrow-js && npm run build
cd messaging-js && npm run build
```

Built contracts will be in:

- `escrow-js/build/escrow.wasm`
- `messaging-js/build/messaging.wasm`

And copied to:

- `../wasm/escrow.wasm`
- `../wasm/messaging.wasm`

### Testing

Both contracts include comprehensive test suites using `ava` and `near-workspaces`:

```bash
# Run all tests
./test-all.sh

# Or test individually
cd escrow-js && npm test
cd messaging-js && npm test
```

Tests cover:

- ✅ Contract initialization
- ✅ All core functionality
- ✅ Access control and permissions
- ✅ Error handling and edge cases
- ✅ Multi-user scenarios
- ✅ Pagination and search

## Contract Architecture

### State Management

Both contracts use JavaScript classes with NEAR SDK decorators:

```javascript
@NearBindgen({})
class ContractClass {
  constructor() {
    // Initialize state
  }

  @initialize({})
  init({ owner }) {
    // One-time initialization
  }

  @call({})
  mutative_method() {
    // Changes state
  }

  @view({})
  read_only_method() {
    // Reads state
  }
}
```

### Security Features

1. **Access Control**: Owner-only methods, participant validation
2. **Input Validation**: All inputs are validated before processing
3. **Fund Safety**: Escrow funds are locked until explicitly released
4. **Privacy**: Support for encrypted messages and private rooms

### Gas Optimization

- Efficient data structures (objects instead of arrays where possible)
- Pagination for large data sets
- Lazy deletion (mark as deleted vs removing)

## Deployment

### Local Development (Sandbox)

The plugin automatically deploys to local sandbox when using:

```javascript
// Uses near-workspaces for local deployment
const sandbox = await Worker.init();
```

### Testnet Deployment

```bash
# Deploy escrow contract
near deploy --accountId escrow.yourname.testnet --wasmFile escrow-js/build/escrow.wasm

# Initialize escrow
near call escrow.yourname.testnet init '{"owner":"yourname.testnet"}' --accountId yourname.testnet

# Deploy messaging contract
near deploy --accountId messaging.yourname.testnet --wasmFile messaging-js/build/messaging.wasm

# Initialize messaging
near call messaging.yourname.testnet init '{"owner":"yourname.testnet"}' --accountId yourname.testnet
```

## Integration with Plugin

The plugin services automatically use these contracts:

1. **SmartContractEscrowService**: Uses the escrow contract for multi-party payments
2. **OnChainMessagingService**: Uses the messaging contract for decentralized communication

Configure in your `.env`:

```env
# For local development (default)
NEAR_NETWORK=sandbox
NEAR_ESCROW_CONTRACT_ID=escrow.test.near
NEAR_MESSAGING_CONTRACT_ID=messaging.test.near

# For testnet
NEAR_NETWORK=testnet
NEAR_ESCROW_CONTRACT_ID=escrow.yourname.testnet
NEAR_MESSAGING_CONTRACT_ID=messaging.yourname.testnet
```

## Cost Information

- **Local Development**: FREE (uses sandbox)
- **Testnet**: FREE (get tokens from faucet)
- **Mainnet**: ~2-3 NEAR per contract deployment

## Troubleshooting

### Common Issues

1. **"Contract not found"**: Ensure contracts are deployed and initialized
2. **"Not enough balance"**: Each contract call requires gas (~0.01 NEAR)
3. **"Method not found"**: Make sure you're calling the correct contract

### Debug Tips

- Use `near view` for debugging view methods
- Check contract logs with `near logs`
- Run tests with verbose output: `npm test -- --verbose`

## Contributing

When modifying contracts:

1. Update the contract code
2. Add/update tests
3. Run `./test-all.sh` to ensure all tests pass
4. Update this README if adding new features

## License

See the main project LICENSE file.
