# @elizaos/plugin-blockchain-auditor

An ElizaOS plugin that equips agents with capabilities to perform security audits on blockchain smart contracts using external tools like Foundry Forge and Slither, executed within Docker containers for sandboxing.

## Overview

This plugin provides a `ToolExecutionService` that orchestrates Docker containers to run command-line auditing tools. This approach offers a layer of isolation when dealing with potentially untrusted smart contract code. The plugin defines actions that agents can use to initiate different types of analyses (e.g., running tests, static analysis).

**Note on Docker Requirement:** This plugin requires Docker to be installed and accessible on the host system where the ElizaOS agent is running.

## Features

-   **Dockerized `ToolExecutionService`**:
    -   Executes specified tools (e.g., `forge`, `slither`) inside Docker containers.
    -   Manages temporary host workspaces that are volume-mounted into containers.
    -   Supports providing contract code directly as a string to be written to a file in the workspace.
    -   Captures `stdout`, `stderr`, and `exitCode` from the Docker container's execution.
    -   Cleans up temporary workspaces and containers (`--rm` flag used).
-   **Actions**:
    -   `RUN_FORGE_TEST`: Executes `forge test` within a Docker container.
        -   Mounts the specified host `projectPath` into the container.
        -   Supports test patterns, fuzz runs, verbosity, and specifying a custom Docker image.
    -   `RUN_SLITHER_ANALYSIS`: Executes `slither` within a Docker container.
        -   Can take a host `targetPath` (project or file) to mount, or direct `contractContent` as a string.
        -   Supports custom Slither arguments and specifying a Docker image.
        -   Defaults to `json-human-compact` output.
    -   `RUN_HARDHAT_TASK`: Executes a specified Hardhat task (e.g., `test`, `compile`, `coverage`) within a Docker container.
        -   Mounts the specified host `projectPath` (Hardhat project root) into the container.
        -   Supports specifying the task name, additional arguments for the task, and a custom Docker image.

## Configuration

### Plugin Initialization (`plugin-blockchain-auditor/src/environment.ts`)
The plugin can be configured with default paths for tool executables (these are the commands run *inside* Docker) and default Docker image names. These can be set via environment variables or direct config during plugin initialization.

-   `FORGE_PATH`: Command for forge inside Docker (defaults to "forge").
-   `SLITHER_PATH`: Command for slither inside Docker (defaults to "slither").
-   `HARDHAT_PATH`: Command for Hardhat inside Docker (defaults to "npx hardhat").
-   `DEFAULT_FOUNDRY_DOCKER_IMAGE`: Docker image for Foundry (e.g., `ghcr.io/foundry-rs/foundry:latest`).
-   `DEFAULT_SLITHER_DOCKER_IMAGE`: Docker image for Slither (e.g., `ghcr.io/crytic/slither:latest`).
-   `DEFAULT_HARDHAT_DOCKER_IMAGE`: Docker image for Hardhat (e.g., a Node.js image like `node:18-slim`).

**Example in character file:**
```json
{
  "plugins": [
    {
      "name": "@elizaos/plugin-blockchain-auditor",
      "config": {
        "DEFAULT_FOUNDRY_DOCKER_IMAGE": "mycustom/foundry-image:v1.2",
        "DEFAULT_SLITHER_DOCKER_IMAGE": "mycustom/slither-image:v0.9"
      }
    }
    // ... other plugins
  ]
}
```
Or set corresponding environment variables (e.g., `DEFAULT_FOUNDRY_DOCKER_IMAGE="mycustom/foundry-image:v1.2"`).

### Action Inputs
Each action has its own input schema (defined in `src/index.ts` using Zod).

-   **`RUN_FORGE_TEST` options:**
    -   `projectPath` (string, required): Host path to the Foundry project root. This directory is mounted.
    -   `testPattern` (string, optional): Glob pattern for specific tests (relative to project root inside container).
    -   `fuzzRuns` (number, optional): Number of fuzz runs.
    -   `verbosity` (enum, optional): Forge verbosity level (e.g., "vvv").
    -   `dockerImageName` (string, optional): Overrides the default Foundry Docker image.
-   **`RUN_SLITHER_ANALYSIS` options:**
    -   `targetPath` (string, required if `contractContent` not provided): Host path to the project root or specific file. This path (or its parent) is mounted.
    -   `contractContent` (string, optional): Direct Solidity code as a string.
    -   `contractFilename` (string, optional, required if `contractContent` is used): Filename for the `contractContent` (e.g., "MyContract.sol").
    -   `slitherArgs` (array of strings, optional): Additional arguments for the `slither` command.
    -   `dockerImageName` (string, optional): Overrides the default Slither Docker image.
-   **`RUN_HARDHAT_TASK` options:**
    -   `projectPath` (string, required): Host path to the Hardhat project root. This directory is mounted.
    -   `taskName` (string, required): The Hardhat task to run (e.g., "test", "compile", "coverage").
    -   `taskArgs` (array of strings, optional): Additional arguments for the specific Hardhat task.
    -   `dockerImageName` (string, optional): Overrides the default Hardhat Docker image (typically a Node.js image).


## Usage

An agent (e.g., a `BlockchainAuditorAgent`) uses these actions to perform audit steps. The `projectPath` and `targetPath` provided to actions refer to paths **on the host system** where the agent is running. The service mounts these into the Docker container.

**Example: `RUN_FORGE_TEST`**
```json
{
  "action": "RUN_FORGE_TEST",
  "options": {
    "projectPath": "/home/user/my_foundry_project",
    "verbosity": "vvv"
  }
}
```
This will mount `/home/user/my_foundry_project` into the Docker container (e.g., at `/app/workspace`) and run `forge test -vvv` inside the container, with `/app/workspace` as the working directory.

**Example: `RUN_SLITHER_ANALYSIS` with a file path**
```json
{
  "action": "RUN_SLITHER_ANALYSIS",
  "options": {
    "targetPath": "/home/user/my_foundry_project/src/MyContract.sol"
  }
}
```
This mounts `/home/user/my_foundry_project/src` to `/app/workspace` in the container and runs `slither /app/workspace/MyContract.sol --json-human-compact`.

**Example: `RUN_SLITHER_ANALYSIS` with direct contract content**
```json
{
  "action": "RUN_SLITHER_ANALYSIS",
  "options": {
    "contractContent": "pragma solidity ^0.8.0; contract C { ... }",
    "contractFilename": "TempContract.sol",
    "targetPath": "/home/user/my_project_context_if_any" // Optional: for project context if solidity string needs it
  }
}
```
This writes `contractContent` to `TempContract.sol` in a temporary host workspace, mounts that workspace, and runs `slither /app/workspace/TempContract.sol --json-human-compact` inside the container.

**Example: `RUN_HARDHAT_TASK`**
```json
{
  "action": "RUN_HARDHAT_TASK",
  "options": {
    "projectPath": "/home/user/my_hardhat_project",
    "taskName": "test",
    "taskArgs": ["--network", "localhost"]
  }
}
```
This mounts `/home/user/my_hardhat_project` into the Docker container and runs `npx hardhat test --network localhost` (assuming `HARDHAT_PATH` is "npx hardhat") inside the container, with `/app/workspace` (the mount point of `projectPath`) as the working directory.

The results (`stdout`, `stderr`, `exitCode`) are returned in the `data` field of the action's callback.

## Development

### Build
```bash
bun run build
```

### Test
```bash
bun test
```
Unit tests in `src/__tests__` mock `child_process.spawn` to verify correct `docker` command construction, not actual Docker execution.

## Important Security Note
Using Docker provides a significant improvement in sandboxing over direct `child_process` execution on the host. However, security is multi-layered:
-   **Docker Daemon Security:** Ensure the Docker daemon itself is secured and the agent process has appropriate (but not excessive) permissions to interact with it.
-   **Docker Image Trust:** Use official or well-vetted Docker images for audit tools to avoid malicious images. Default images are provided as examples and should be verified.
-   **Resource Limits for Containers:** While not implemented in this PoC's `ToolExecutionService`, `docker run` supports flags for limiting CPU, memory (`--cpus`, `--memory`), and execution time. These should be added for robust protection against resource exhaustion from within the container.
-   **Network Policies:** By default, containers might have network access. The service could be enhanced to run containers with `--network=none` unless a task specifically requires network access (e.g., to fetch dependencies, though this is better handled during Docker image build). The current PoC does not explicitly disable networking.
-   **Volume Mounts:** Be mindful that `rw` mounts allow the container to write back to the host workspace. This is often necessary for reports but should be understood. Read-only mounts (`ro`) can be used if tools only need to read.

Even with Docker, always be cautious when processing code or projects from untrusted sources.

---

*This plugin is part of the ElizaOS project.*
