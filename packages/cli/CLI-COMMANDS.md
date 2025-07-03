# ElizaOS CLI Commands

This document outlines the available CLI commands for ElizaOS.

## Core Commands

### `elizaos create`
Create a new ElizaOS project, plugin, agent, or TEE project.

Usage:
```bash
elizaos create [name] [options]
```

### `elizaos test`
Run tests for the current project or a specified plugin.

Usage:
```bash
elizaos test [path] [options]
```

### `elizaos start`
Start the Eliza agent server.

Usage:
```bash
elizaos start [options]
```

### `elizaos plugins`
Manage ElizaOS plugins.

Usage:
```bash
elizaos plugins [command]
```

### `elizaos agent`
Manage ElizaOS agents.

Usage:
```bash
elizaos agent [command]
```

### `elizaos monorepo`
Clone ElizaOS monorepo from a specific branch.

Usage:
```bash
elizaos monorepo [options]
```

## Options

- `-v, --version` - Display version number
- `-h, --help` - Display help information
- `--no-emoji` - Disable emoji output
- `--no-auto-install` - Disable automatic Bun installation