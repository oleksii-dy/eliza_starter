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

## Important Security Note & Future Sandboxing Strategies
The `ToolExecutionService` in this PoC directly uses `child_process.spawn` without robust sandboxing. **This is highly insecure for handling untrusted inputs (e.g., smart contracts from arbitrary sources) or running in untrusted environments.** Executing external tools based on potentially malicious inputs can lead to arbitrary code execution on the host system, unauthorized file system access, unintended network activity, or resource exhaustion attacks.

**A production-ready version of this plugin requires a robust sandboxing mechanism. Recommended strategies include:**

1.  **Docker Containers (Preferred):**
    *   **How:** Execute audit tools within isolated Docker containers. Each task could spin up a container with the necessary tools (Forge, Slither, etc.) pre-installed. The target smart contract code would be mounted into the container as a volume.
    *   **Pros:** Strong isolation (filesystem, network, process), consistent and reproducible environments, good dependency management.
    *   **Cons:** Requires Docker daemon access, performance overhead for container startup/shutdown, management of Docker images.
    *   The `ToolExecutionService` would need to be refactored to orchestrate Docker commands (e.g., `docker run`, `docker exec`, `docker cp`).

2.  **OS-Level Sandboxing (e.g., `firejail` on Linux):**
    *   **How:** Wrap tool execution with a utility like `firejail`, using specific security profiles for each tool to restrict its capabilities (syscalls, file access, network).
    *   **Pros:** Lighter weight than Docker if tools are on the host. Fine-grained control.
    *   **Cons:** OS-specific (primarily Linux), complex profile creation and maintenance.

3.  **MicroVMs (e.g., AWS Firecracker):**
    *   **How:** For even stronger isolation, each audit task could run within a minimal, fast-booting MicroVM.
    *   **Pros:** Excellent isolation.
    *   **Cons:** Higher implementation complexity for managing MicroVM lifecycle.

4.  **TEE (Trusted Execution Environments):**
    *   **How:** For tasks requiring the highest level of assurance, critical parts of the audit or tool execution could potentially run within a TEE.
    *   **Pros:** Hardware-enforced security.
    *   **Cons:** Very complex, depends on hardware support and tool compatibility. More of a long-term research direction for this plugin.

**Interim Security Enhancements (Still not sufficient for untrusted code):**
*   **Strict Command Whitelisting:** Only allow execution of known, vetted tool commands (e.g., `forge`, `slither`).
*   **Input Sanitization:** Rigorously validate and sanitize all paths and arguments passed to tools.
*   **Resource Limiting:** Implement strict timeouts (already in PoC) and explore OS-level ways to limit CPU and memory for tool processes.
*   **Dedicated Low-Privilege User:** Run the ElizaOS agent process, or at least the `ToolExecutionService`, as a dedicated user with minimal system privileges.

**Users should not deploy this plugin in a production setting that processes untrusted smart contracts without implementing one of the robust sandboxing strategies mentioned above.**

---

*This plugin is part of the ElizaOS project.*
