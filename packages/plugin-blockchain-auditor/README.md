# @elizaos/plugin-blockchain-auditor

An ElizaOS plugin that equips agents with capabilities to perform security audits on blockchain smart contracts using external tools like Foundry Forge and Slither.

## Overview

This plugin provides a `ToolExecutionService` for running command-line auditing tools and defines specific actions that agents can use to initiate different types of analyses (e.g., running tests, static analysis).

**SECURITY WARNING:** The current `ToolExecutionService` is a Proof of Concept and **DOES NOT IMPLEMENT SANDBOXING** for command execution. Running arbitrary tools or commands in an untrusted environment is highly insecure. This PoC should only be used in controlled, trusted environments for development and testing purposes. Production use requires robust sandboxing.

## Features (PoC)

-   **`ToolExecutionService`**: A service to execute external CLI commands.
    -   Captures `stdout`, `stderr`, and `exitCode`.
    -   Basic command allow-list (for PoC only, not a security feature).
-   **Actions**:
    -   `RUN_FORGE_TEST`: Executes `forge test` for a Foundry project.
        -   Supports specifying project path, test pattern, fuzz runs, and verbosity.
    -   `RUN_SLITHER_ANALYSIS`: Executes `slither` for static analysis of Solidity code.
        -   Supports specifying target path and output format (defaults to `json-human-compact`).

## Configuration

### Plugin Initialization
The plugin can be configured with paths to tool executables if they are not in the system `PATH`. This is done via environment variables or direct config during plugin initialization.

-   `FORGE_PATH`: Path to `forge` executable (defaults to "forge").
-   `SLITHER_PATH`: Path to `slither` executable (defaults to "slither").

Example in character file:
```json
{
  "plugins": [
    {
      "name": "@elizaos/plugin-blockchain-auditor",
      "config": {
        "FORGE_PATH": "/custom/path/to/forge",
        "SLITHER_PATH": "/custom/path/to/slither"
      }
    }
    // ... other plugins
  ]
}
```
Or set environment variables: `FORGE_PATH=/custom/path/to/forge`

### Action Inputs
Each action has its own input schema defined using Zod. Refer to `src/index.ts` for details.

-   **`RUN_FORGE_TEST` options:**
    -   `projectPath` (string, required): Root path of the Foundry project.
    -   `testPattern` (string, optional): Glob pattern for specific tests.
    -   `fuzzRuns` (number, optional): Number of fuzz runs.
    -   `verbosity` (enum, optional): Forge verbosity level (e.g., "vvv").
-   **`RUN_SLITHER_ANALYSIS` options:**
    -   `targetPath` (string, required): Path to project root or Solidity file(s).
    -   `outputFormat` (enum, optional): Slither output format (defaults to "json-human-compact").


## Usage

An agent (e.g., a `BlockchainAuditorAgent`) would use these actions, typically prompted by its LLM, to perform audit steps.

**Example LLM output to trigger `RUN_FORGE_TEST`:**
```json
{
  "action": "RUN_FORGE_TEST",
  "options": {
    "projectPath": "/path/to/foundry-project",
    "verbosity": "vvv"
  }
}
```

**Example LLM output to trigger `RUN_SLITHER_ANALYSIS`:**
```json
{
  "action": "RUN_SLITHER_ANALYSIS",
  "options": {
    "targetPath": "/path/to/foundry-project/src/MyContract.sol"
  }
}
```
The results (stdout, stderr, exit code) are returned in the `data` field of the callback from the action handler. These can then be processed further, potentially by the LLM using an `INTERPRET_TOOL_OUTPUT` action (to be implemented).

## Development

### Build
```bash
bun run build
```

### Test
```bash
bun test
```
Unit tests are in `src/__tests__`. These mock `child_process` to avoid actual command execution during tests.

## Important Security Note
The `ToolExecutionService` in this PoC directly uses `child_process.spawn`. **This is not secure for handling untrusted inputs or running in untrusted environments.** A production-ready version of this plugin would require:
-   Strict validation and sanitization of all inputs.
-   Execution of tools within a heavily restricted sandbox (e.g., Docker containers, gVisor, Firecracker).
-   Careful management of file system access.
-   Consideration of resource limits (CPU, memory, time) for tool execution.

---

*This plugin is part of the ElizaOS project.*
