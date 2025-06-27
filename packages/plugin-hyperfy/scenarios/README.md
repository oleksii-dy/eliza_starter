# Hyperfy Plugin Scenario Tests

This directory contains scenario tests for the Hyperfy plugin, demonstrating various agent capabilities in 3D virtual worlds.

## Overview

Scenario tests are real-world simulations that test agent behaviors in actual Hyperfy environments. They verify that agents can:

- Navigate 3D worlds
- Build and modify objects
- Interact socially with emotes
- Use items and objects
- Operate autonomously with the OODA loop

## Available Scenarios

### 1. Basic Agent Scenarios (`hyperfy-agent-scenarios.ts`)

#### Movement Test

- Tests agent navigation and pathfinding
- Verifies GOTO_ENTITY and WALK_RANDOMLY actions
- Ensures agents can perceive their environment

#### Building Test

- Tests world modification capabilities
- Verifies object duplication, translation, and importing
- Ensures agents can create persistent changes

#### Social Interaction Test

- Tests communication and emotes
- Verifies agent expressions and ambient speech
- Ensures natural social behaviors

#### Item Interaction Test

- Tests object manipulation
- Verifies USE_ITEM and UNUSE_ITEM actions
- Ensures agents can interact with world objects

#### Autonomy Integration Test

- Tests plugin-autonomy integration
- Verifies OODA loop functionality
- Ensures goal-directed behavior

### 2. Autonomous Multi-Agent Exploration (`hyperfy-autonomous-exploration.ts`)

The flagship scenario that demonstrates 10 autonomous agents exploring a Hyperfy world simultaneously.

#### Features

- **10 Unique Agent Personalities**:

  - Explorer-Alpha: Systematic explorer and leader
  - Explorer-Beta: Social agent seeking interactions
  - Explorer-Gamma: Builder marking discoveries
  - Explorer-Delta: Speed explorer covering distance
  - Explorer-Epsilon: Methodical detail observer
  - Explorer-Zeta: Vertical explorer seeking heights
  - Explorer-Eta: Collector gathering items
  - Explorer-Theta: Performer using emotes
  - Explorer-Iota: Boundary tester finding limits
  - Explorer-Kappa: Observer documenting behaviors

- **Autonomous Behaviors**: Each agent uses the OODA loop (Observe, Orient, Decide, Act) to make independent decisions

- **Performance Testing**: Verifies system stability with 10 concurrent agents

- **Optional Observation**: Can open a Puppeteer window to watch agents in real-time

## Running Scenarios

### Quick Start (Autonomous Exploration)

```bash
# Full setup: Clone/start Hyperfy + run scenario
npm run scenario:explore

# With visual observation window
npm run scenario:explore:observe

# Quick run (assumes Hyperfy is already running)
npm run scenario:explore:quick
```

### Manual Scenario Execution

```bash
# Run all Hyperfy scenarios
elizaos scenario run scenarios/hyperfy-agent-scenarios.ts

# Run specific scenario
elizaos scenario run scenarios/hyperfy-autonomous-exploration.ts

# Run with environment variables
ENABLE_OBSERVATION_WINDOW=true elizaos scenario run scenarios/hyperfy-autonomous-exploration.ts
```

### Prerequisites

1. **Hyperfy Server**: The autonomous exploration requires a running Hyperfy instance

   ```bash
   cd hyperfy
   npm install
   npm run dev
   ```

2. **Required Plugins**:

   - `@elizaos/plugin-hyperfy` (this plugin)
   - `@elizaos/plugin-autonomy` (for autonomous behaviors)

3. **Environment**: Ensure your `.env` file has necessary API keys

## Scenario Structure

Each scenario includes:

1. **Actors**: Agent definitions with roles, personalities, and plugins
2. **Setup**: Environment configuration and goals
3. **Execution**: Runtime parameters and duration
4. **Verification**: LLM-based success criteria

## Debugging

### View Logs

Scenarios output detailed logs including:

- Agent connections
- Action executions
- Movement tracking
- Interaction events

### Smaller Tests

Use the 3-agent version for faster debugging:

```bash
elizaos scenario run scenarios/hyperfy-autonomous-exploration.ts --filter "3 Agents"
```

### Visual Observation

Enable Puppeteer window to watch agents:

```bash
ENABLE_OBSERVATION_WINDOW=true npm run scenario:explore
```

## Success Metrics

The autonomous exploration scenario tracks:

- **Connection Success**: All agents connect to world
- **Movement Distance**: Total distance traveled by each agent
- **Action Variety**: Different types of actions performed
- **Interaction Count**: Agent-to-agent interactions
- **System Stability**: No crashes or disconnections

## Extending Scenarios

To create new scenarios:

1. Copy an existing scenario as a template
2. Define unique actors with specific behaviors
3. Set appropriate goals and verification rules
4. Add to exports in `hyperfy-agent-scenarios.ts`

## Troubleshooting

### Hyperfy Not Starting

- Ensure Node.js 22.11.0+ is installed
- Check if port 3000/3001 is available
- Verify Hyperfy dependencies are installed

### Agents Not Connecting

- Check WebSocket URL (default: ws://localhost:3001/ws)
- Ensure Hyperfy server is fully started (30s startup time)
- Verify network connectivity

### Performance Issues

- Reduce agent count for testing
- Check system resources (CPU/Memory)
- Use `--skip-setup` if Hyperfy is already running

## Contributing

When adding new scenarios:

1. Test with both small (3 agents) and full (10 agents) configurations
2. Ensure verification rules are comprehensive
3. Document unique behaviors and requirements
4. Add appropriate npm scripts for easy execution
