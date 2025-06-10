# Commands Structure Documentation

## Overview

The `packages/cli/src/commands/` directory contains the command-line interface implementation for ElizaOS. Each command is organized as a self-contained module with a consistent structure pattern.

## Directory Structure

```
src/commands/
├── agent/          # Agent lifecycle management
├── create/         # Project/plugin/agent creation
├── dev/            # Development mode with auto-restart
├── env/            # Environment configuration
├── monorepo/       # Monorepo setup and management
├── plugins/        # Plugin management (install, remove, list, etc.)
├── publish/        # Publishing to registries (NPM, GitHub)
├── shared/         # Shared utilities and types
├── start/          # Production startup
├── tee/            # Trusted Execution Environment
├── test/           # Testing commands
└── update/         # Update and upgrade functionality
```

## Command Structure Pattern

Each command follows a consistent organizational pattern:

### Core Files
- **`index.ts`** - Main command definition and CLI setup using Commander.js
- **`types.ts`** - TypeScript interfaces and type definitions for the command
- **`actions/`** - Directory containing the actual command implementations
- **`utils/`** - Directory containing helper functions and utilities

### Example Structure (using `agent` command):
```
agent/
├── index.ts                 # Command definition and CLI interface
├── types.ts                 # Type definitions
├── actions/
│   ├── index.ts            # Action exports
│   ├── crud.ts             # CRUD operations
│   └── lifecycle.ts        # Start/stop operations
└── utils/
    ├── index.ts            # Utility exports
    ├── display.ts          # Display formatting
    └── validation.ts       # Input validation
```

## Command Categories

### 1. Project Lifecycle Commands

#### `create/` - Project Creation
- **Purpose**: Generate new projects, plugins, agents, or TEE projects
- **Key Features**: Interactive prompts, template selection, validation
- **Actions**: `createProject`, `createPlugin`, `createAgent`, `createTEEProject`

#### `start/` - Production Startup
- **Purpose**: Start agents and services in production mode
- **Key Features**: Configuration management, dependency resolution
- **Actions**: `agent-start.ts`, `server-start.ts`

#### `dev/` - Development Mode
- **Purpose**: Development server with auto-restart and hot reload
- **Key Features**: File watching, auto-rebuild, detailed logging
- **Actions**: `dev-server.ts`

### 2. Agent Management Commands

#### `agent/` - Agent Lifecycle
- **Purpose**: Manage ElizaOS agents (CRUD operations)
- **Key Features**: Remote agent support, JSON configuration
- **Subcommands**: `list`, `get`, `start`, `stop`, `remove`, `set`
- **Actions**: Full CRUD operations with lifecycle management

### 3. Plugin Management Commands

#### `plugins/` - Plugin Management
- **Purpose**: Install, remove, list, and generate plugins
- **Key Features**: Registry integration, version management, AI-powered generation
- **Subcommands**: `list`, `add`, `remove`, `upgrade`, `generate`
- **Actions**: Package management with migration support

### 4. Development & Testing Commands

#### `test/` - Testing Framework
- **Purpose**: Run component tests, E2E tests, and full test suites
- **Key Features**: Plugin testing, port management, project validation
- **Actions**: `component-tests.ts`, `e2e-tests.ts`, `run-all-tests.ts`

#### `update/` - Update Management
- **Purpose**: Update CLI, dependencies, and project configurations
- **Key Features**: Version checking, environment updates
- **Actions**: `cli-update.ts`, `dependency-update.ts`

### 5. Publishing & Distribution Commands

#### `publish/` - Publishing
- **Purpose**: Publish to NPM, GitHub, and custom registries
- **Key Features**: Authentication, metadata management, version validation
- **Actions**: `npm-publish.ts`, `github-publish.ts`, `registry-publish.ts`

### 6. Environment & Configuration Commands

#### `env/` - Environment Configuration
- **Purpose**: Manage environment variables and configuration
- **Key Features**: Secure configuration management

#### `monorepo/` - Monorepo Management
- **Purpose**: Clone and setup monorepo development environment
- **Key Features**: Repository cloning, setup instructions
- **Actions**: `clone.ts`

#### `tee/` - Trusted Execution Environment
- **Purpose**: TEE-specific functionality and Phala Network integration
- **Key Features**: Secure computing environment setup

### 7. Shared Infrastructure

#### `shared/` - Common Utilities
- **Purpose**: Shared types, utilities, and URL handling
- **Key Components**: 
  - `types.ts` - Common interfaces (`ApiResponse`, `AgentBasic`)
  - `url-utils.ts` - URL construction and validation
  - `index.ts` - Centralized exports

## Command Implementation Patterns

### 1. Commander.js Integration
All commands use Commander.js for CLI parsing:
```typescript
export const commandName = new Command()
  .name('command-name')
  .description('Command description')
  .option('-o, --option', 'Option description')
  .action(async (options) => {
    // Command implementation
  });
```

### 2. Error Handling
Consistent error handling using shared utilities:
```typescript
import { handleError } from '@/src/utils';

try {
  await commandAction(options);
} catch (error) {
  handleError(error);
  process.exit(1);
}
```

### 3. Type Safety
Each command defines comprehensive TypeScript interfaces:
```typescript
export interface CommandOptions {
  option1?: string;
  option2?: boolean;
  // ... other options
}
```

### 4. Validation
Input validation is handled in dedicated utility functions:
```typescript
export const validateOptions = (options: any): CommandOptions => {
  // Validation logic
  return validatedOptions;
};
```

## Key Design Principles

1. **Modularity**: Each command is self-contained with clear boundaries
2. **Consistency**: All commands follow the same structural pattern
3. **Type Safety**: Comprehensive TypeScript coverage for all interfaces
4. **Error Handling**: Centralized error management and user-friendly messages
5. **Extensibility**: Easy to add new commands following existing patterns
6. **Separation of Concerns**: Clear separation between CLI interface, business logic, and utilities

## Usage Examples

### Agent Management
```bash
elizaos agent list                    # List all agents
elizaos agent start -n "MyAgent"     # Start specific agent
elizaos agent get -n "MyAgent" -j    # Get agent config as JSON
```

### Project Creation
```bash
elizaos create my-project             # Create new project
elizaos create --type plugin my-plugin # Create plugin
elizaos create --type agent my-agent  # Create agent
```

### Plugin Management
```bash
elizaos plugins list                  # List available plugins
elizaos plugins add plugin-name       # Install plugin
elizaos plugins remove plugin-name    # Remove plugin
```

This structure provides a scalable and maintainable foundation for the ElizaOS CLI, with clear patterns for adding new commands and functionality.