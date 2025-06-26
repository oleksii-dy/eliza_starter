# ElizaOS CLI

A command-line interface for managing ElizaOS agents, plugins, and projects.

## Installation

```bash
bun add -g @elizaos/cli
```

## Quick Start

```bash
# Create a new project
elizaos create my-agent
cd my-agent

# Start your agent
elizaos start
```

## Core Commands

- `create` - Create new projects, plugins, or agent configurations
- `start` - Start an agent with specified character file
- `plugins` - Manage plugins (add, remove, list, upgrade)
- `agent` - Agent lifecycle management (start, stop, list)
- `env` - Environment variable management
- `test` - Run test suites and scenarios
- `dev` - Development mode with auto-reload
- `publish` - Publish plugins or agents to registries

## Testing

```bash
npm run test                    # Run all tests
npm run test:unit              # Run unit tests  
npm run test:scenarios         # Run scenario tests (autocoder + github-todo workflow)
npm run test:cli               # Run CLI command tests
```

## Development

```bash
npm run build                  # Build the project
npm run lint                   # Lint and format code
npm run typecheck             # Run TypeScript checks
npm run dev                   # Development mode
```

## Examples

### Basic Agent Setup
```bash
elizaos create my-bot
cd my-bot
elizaos plugins add @elizaos/plugin-twitter
elizaos start --character ./characters/bot.json
```

### Plugin Development
```bash
elizaos create my-plugin --type plugin
cd my-plugin
npm test
elizaos publish
```

## Help

```bash
elizaos help
elizaos <command> --help
```