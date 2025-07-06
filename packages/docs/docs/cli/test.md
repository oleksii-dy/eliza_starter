---
sidebar_position: 6
title: Test Command
description: Run and manage tests for ElizaOS projects and plugins
keywords: [testing, component tests, e2e tests, Vitest, test runner, development]
image: /img/cli.jpg
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Test Command

Run tests for Eliza agent projects and plugins.

<Tabs>
<TabItem value="overview" label="Overview & Options" default>

## Usage

```bash
elizaos test [path] [options]
```

## Arguments

| Argument | Description                                                   |
| -------- | ------------------------------------------------------------- |
| `[path]` | Optional path to the project or plugin to test (default: `.`) |

## Options

| Option              | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `-t, --type <type>` | Type of test to run: 'component', 'e2e', or 'all' (default: 'all') |
| `--port <port>`     | Server port for e2e tests                                          |
| `--name <name>`     | Filter tests by name (matches file names or test suite names)      |
| `--skip-build`      | Skip building before running tests                                 |
| `--skip-type-check` | Skip TypeScript type checking before running tests                 |

</TabItem>
<TabItem value="examples" label="Examples & Guides">

## Examples

### Basic Test Execution

```bash
# Run all tests (component and e2e) - default behavior
elizaos test

# Run only component tests
elizaos test -t component

# Run only end-to-end tests
elizaos test -t e2e

# Run tests for a specific path
elizaos test ./packages/plugin-example
```

### Test Filtering

```bash
# Filter component tests by name
elizaos test -t component --name auth

# Filter e2e tests by name
elizaos test -t e2e --name database

# Filter all tests by name
elizaos test --name plugin
```

### Advanced Options

```bash
# Run tests on custom port for e2e
elizaos test -t e2e --port 4000

# Skip building before running tests
elizaos test --skip-build

# Skip type checking for faster test runs
elizaos test --skip-type-check

# Combine options
elizaos test -t e2e --port 3001 --name integration --skip-build
```

## Test Types

### Component Tests

**Location**: `__tests__/` directory  
**Framework**: Vitest  
**Purpose**: Unit and integration testing of individual components

### End-to-End Tests

**Location**: `e2e/` directory  
**Framework**: Custom ElizaOS test runner  
**Purpose**: Runtime behavior testing with full agent context

</TabItem>
</Tabs>
