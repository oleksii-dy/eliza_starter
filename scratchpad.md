# Jules' Scratchpad for ElizaOS Enhancement Project

## Project Goal:
Improve ElizaOS by creating a team of collaborating developer agents, blockchain auditor agents, and supervisory agents, all using the DeepSeek-Chat API.

## Current Task: Step 1 - Integrate DeepSeek API as a New Model Provider Plugin

### Battle Plan for `plugin-deepseek`:
1.  **Directory Structure & Basic Files:**
    *   `packages/plugin-deepseek/`
    *   `package.json`: Based on `plugin-starter`, add `undici` or similar for HTTP. Name: `@elizaos/plugin-deepseek`.
    *   `tsconfig.json`: Adapt from `plugin-starter`.
    *   `tsup.config.ts`: Adapt from `plugin-starter`, ensure `@elizaos/core`, `zod` are external.
    *   `src/index.ts`: Main plugin definition.
    *   `src/environment.ts`: Zod schema for `DEEPSEEK_API_KEY`, `DEEPSEEK_API_URL` (optional, default).
    *   `src/deepseek-api.ts`: Logic for API calls, request/response handling, error management.
    *   `src/__tests__/index.test.ts`: Unit tests for plugin functionality, especially API interaction mocks.
    *   `README.md`: Basic plugin description.
    *   `.npmignore`: Standard.
    *   `bunfig.toml`: Standard.

2.  **`src/environment.ts`:**
    *   Define `DeepSeekConfigSchema` using Zod.
        *   `DEEPSEEK_API_KEY: z.string().min(1)`
        *   `DEEPSEEK_BASE_URL: z.string().url().optional().default("https://api.deepseek.com")`
        *   `DEEPSEEK_CHAT_MODEL: z.string().optional().default("deepseek-chat")` (or whatever the default chat model is)
    *   `validateConfig()` function.

3.  **`src/deepseek-api.ts`:**
    *   Class `DeepSeekAPI` or similar.
    *   Constructor takes validated config (API key, URL).
    *   Method `generateText(prompt: string, model: string, options: any)`:
        *   Construct request payload for DeepSeek chat completions endpoint.
        *   Use `fetch` (from `undici` or global).
        *   Handle API responses (success, errors).
        *   Parse response to extract generated text.
    *   Consider streaming support if DeepSeek API offers it.

4.  **`src/index.ts`:**
    *   Import necessary types from `@elizaos/core` (`Plugin`, `ModelType`, `GenerateTextParams`, `IAgentRuntime`, `logger`).
    *   Import `validateConfig` and `DeepSeekAPI`.
    *   Define `deepSeekPlugin: Plugin`.
        *   `name: 'deepseek'`
        *   `description: 'DeepSeek API model provider'`
        *   `init(config)`: Validate config, initialize `DeepSeekAPI` instance.
        *   `models`:
            *   `[ModelType.TEXT_SMALL]`: async handler.
            *   `[ModelType.TEXT_LARGE]`: async handler.
                *   These handlers will call the `DeepSeekAPI.generateText` method.
                *   Map `GenerateTextParams` to DeepSeek API parameters.
                *   Log interactions.
    *   Export `deepSeekPlugin`.

5.  **Testing (`src/__tests__/index.test.ts`):**
    *   Mock `fetch` or `DeepSeekAPI` methods.
    *   Test `init` function for config validation.
    *   Test `TEXT_SMALL` and `TEXT_LARGE` model handlers:
        *   Correct API calls.
        *   Response parsing.
        *   Error handling.

### Prompts (General Strategies for later, when agents use DeepSeek):

*   **Developer Agent Code Generation:**
    ```
    You are an expert software engineer. Your task is to write {language} code for the following requirement:
    {requirement_details}

    Constraints:
    - The code must be clean, efficient, and well-commented.
    - {any_specific_constraints_like_frameworks_libraries}
    - Only output the code block. Do not include any explanations or surrounding text unless explicitly asked.
    ```

*   **Blockchain Auditor - Explaining Vulnerabilities:**
    ```
    You are an expert blockchain security auditor. Given the following smart contract code and the identified vulnerability, explain the vulnerability in detail, its potential impact, and provide a clear recommendation for remediation.

    Contract Snippet:
    ```solidity
    {contract_code_snippet}
    ```

    Identified Vulnerability: {vulnerability_type} (e.g., Reentrancy on function X)

    Focus on:
    1. How the vulnerability can be exploited.
    2. The potential consequences (e.g., loss of funds, denial of service).
    3. Specific code changes to fix the vulnerability.
    ```

*   **A2A Task Delegation (Supervisory Agent to Developer Agent):**
    ```
    To: DeveloperAgent_ID_XYZ
    From: SupervisorAgent_ID_ABC
    TaskID: {unique_task_id}
    Action: IMPLEMENT_FEATURE
    Payload: {{
      "description": "Implement a new API endpoint `/users/{{user_id}}/profile` that retrieves user profile information from the database.",
      "requirements": [
        "Use Express.js framework.",
        "Database schema for users table: id (INT), name (VARCHAR), email (VARCHAR), profile_data (JSON).",
        "Return a JSON response with user's name, email, and profile_data.",
        "Handle cases where user_id is not found (return 404)."
      ],
      "expected_output_format": "A single file containing the Express.js route handler code."
    }}
    ```

---
## API Key Management
**Note:** API keys should be managed via environment variables (e.g., `DEEPSEEK_API_KEY`) and not hardcoded.
The `plugin-deepseek` is designed to read `process.env.DEEPSEEK_API_KEY`.

---
## Notes on Web3 Trading Agents & FasMCP:
*   This is a future step after core agent infrastructure is enhanced.
*   **FasMCP (Fast Modular Composable Agents):** If this is a specific framework/library, I'll need to research it. The idea of "tools, but not just tools, like babyAGI agents tools" suggests agents that can dynamically compose and use tools (other agents or functions) to achieve complex goals. This aligns with the general direction of advanced agent systems.
*   **Web3 Trading Agents:**
    *   Would require integration with blockchain data providers (e.g., The Graph, RPC nodes).
    *   Interaction with DEXs (e.g., Uniswap, Serum) via smart contract calls or SDKs.
    *   Secure private key management is paramount.
    *   Strategies could be LLM-driven (e.g., sentiment analysis from news/social media) or based on technical indicators.
    *   Risk management components would be crucial.
    *   This is a very advanced use case.

---
## A2A Communication Protocol (Version 0.1)

**Purpose:** Enable basic task delegation and information exchange between agents.

**Format:** JSON

**Core Fields:**

*   `protocol_version`: "a2a/v0.1" (string, fixed)
*   `message_id`: UUID (string, unique for each message)
*   `timestamp`: ISO 8601 datetime string (e.g., "2024-07-15T10:00:00Z")
*   `sender_agent_id`: UUID (string, ID of the sending agent)
*   `receiver_agent_id`: UUID (string, ID of the target receiving agent)
*   `conversation_id`: UUID (string, optional, to group related messages in a task or exchange)
*   `message_type`: (string, enum)
    *   `TASK_REQUEST`: Sender requests the receiver to perform a task.
    *   `TASK_RESPONSE`: Sender provides the result/status of a task.
    *   `INFO_SHARE`: Sender shares information without expecting a direct task output.
    *   `ACK`: Acknowledgement of message receipt.
*   `payload`: JSON object (content specific to `message_type`)

**Payload Examples:**

*   **For `TASK_REQUEST`:**
    ```json
    {
      "task_name": "GENERATE_CODE",
      "task_description": "Write a Python function that adds two numbers and returns the sum.",
      "parameters": {
        "language": "python",
        "function_signature": "def add(a, b):",
        "requirements": ["Must handle integers and floats."]
      },
      "expected_response_format": "code_string"
    }
    ```

*   **For `TASK_RESPONSE`:**
    ```json
    {
      "original_task_name": "GENERATE_CODE",
      "status": "SUCCESS",
      "result": "def add(a, b):\n  return a + b",
      "error_message": null
    }
    ```

*   **For `INFO_SHARE`:**
    ```json
    {
      "info_type": "NEW_VULNERABILITY_DISCOVERED",
      "details": {
        "contract_address": "0x123...",
        "vulnerability": "Reentrancy in withdraw()",
        "severity": "High"
      }
    }
    ```
---
## Blockchain Auditor Agent Design (Step 4)

**Goal:** Design agents capable of auditing smart contracts using tools like Forge, Hardhat, Python frameworks, and techniques like fuzzing, invariant testing, etc.

**Core Components:**

1.  **`plugin-blockchain-auditor`:** A new plugin to house auditor-specific logic.
    *   **Services:**
        *   `ToolExecutionService`: Securely executes CLI commands for audit tools (Forge, Hardhat, Slither, Python scripts). Needs robust sandboxing (consider TEE implications from `AGENTS.md`).
            *   Manages installation/versions of these tools if possible, or assumes they are in the agent's environment.
            *   Parses stdout/stderr and JSON/text reports from tools.
        *   `WorkspaceService`: Manages a temporary workspace for each audit task (cloning repos, setting up contract files, storing reports).
    *   **Actions:**
        *   `SETUP_AUDIT_WORKSPACE {git_repo_url, contract_files_content}`: Prepares the environment.
        *   `RUN_FORGE_TEST {target_contract, test_pattern, options: {fuzz_runs, invariant_duration}}`: Executes Forge tests.
        *   `RUN_HARDHAT_TASK {task_name, params}`: Executes Hardhat tasks (e.g., `test`, `coverage`, custom audit scripts).
        *   `RUN_PYTHON_SCRIPT {script_path_or_content, params, venv_path}`: Executes Python audit scripts.
        *   `RUN_SLITHER_ANALYSIS {target_path}`: Runs Slither static analyzer.
        *   `ANALYZE_CONTRACT_WITH_LLM {contract_code, focus_areas: ["reentrancy", "access_control"]}`: Uses DeepSeek to review code for specific patterns.
        *   `INTERPRET_TOOL_OUTPUT {tool_output_string, tool_name}`: Uses DeepSeek to understand and summarize tool reports.
        *   `GENERATE_AUDIT_REPORT {findings: [{vulnerability, severity, description, recommendation}]}`: Compiles a final report using DeepSeek.
    *   **Configuration (`environment.ts` for this plugin):**
        *   Paths to tool binaries (if not in PATH).
        *   Default options for tools.

2.  **`BlockchainAuditorAgent` Character Type (`packages/cli/src/characters/auditor.character.ts`):**
    *   **Plugins:** `@elizaos/plugin-deepseek`, `@elizaos/plugin-a2a-communication`, `@elizaos/plugin-blockchain-auditor`.
    *   **System Prompt:**
        ```
        You are an expert Smart Contract Auditor Agent. Your goal is to thoroughly analyze provided smart contracts for security vulnerabilities, code quality issues, and adherence to best practices.
        You will receive audit tasks via A2A messages. These tasks may specify a Git repository, contract files, or specific areas of concern.
        Use the available tools (Forge, Slither, Hardhat tasks, Python scripts) to conduct your analysis.
        Leverage your LLM capabilities (DeepSeek) to:
        1. Understand task requirements.
        2. Interpret outputs from static analysis tools and test runners.
        3. Identify potential vulnerabilities based on code patterns (e.g., reentrancy, access control issues, integer overflows).
        4. Generate boilerplate for fuzz tests or invariant checks if needed.
        5. Summarize findings and generate comprehensive audit reports.
        Respond with TASK_RESPONSE A2A messages containing the audit report or status updates.
        Prioritize identifying critical and high-severity vulnerabilities. Be meticulous and methodical.
        ```
    *   **Topics:** Solidity, EVM, Foundry, Hardhat, Slither, common smart contract vulnerabilities (reentrancy, oracle manipulation, etc.), gas optimization, upgrade patterns.

**Workflow for a Typical Audit Task:**

1.  **Task Reception (A2A):** AuditorAgent receives a `TASK_REQUEST` (e.g., `AUDIT_CONTRACT_REPO {repo_url}`).
2.  **Workspace Setup:** Uses `SETUP_AUDIT_WORKSPACE` action.
3.  **Initial Analysis (LLM):** May use `ANALYZE_CONTRACT_WITH_LLM` for a quick overview of complex contracts or to identify initial areas of focus.
4.  **Static Analysis:** Uses `RUN_SLITHER_ANALYSIS`. Output is parsed (possibly by LLM via `INTERPRET_TOOL_OUTPUT`).
5.  **Testing Execution:**
    *   If Foundry project: `RUN_FORGE_TEST` (standard tests, fuzz tests, invariant checks).
    *   If Hardhat project: `RUN_HARDHAT_TASK {task_name: "test"}`.
    *   Parse test results.
6.  **Targeted Checks (LLM-assisted or specific scripts):**
    *   For critical functions identified: `ANALYZE_CONTRACT_WITH_LLM {focus_areas: ["reentrancy"]}`.
    *   If custom Python audit scripts are provided/generated: `RUN_PYTHON_SCRIPT`.
7.  **Report Generation:**
    *   Collects all findings (from Slither, tests, LLM analysis).
    *   Uses `GENERATE_AUDIT_REPORT` (which internally uses LLM) to compile a structured report.
8.  **Task Response (A2A):** Sends a `TASK_RESPONSE` with the audit report.

**Tool-Specific Considerations:**

*   **Forge:**
    *   Input: `foundry.toml`, `src/`, `test/` directories.
    *   Actions: `forge build`, `forge test`, `forge test --fuzz`, `forge test --invariant`, `forge coverage`, `forge snapshot`.
    *   Output: Console output, JSON output for coverage/gas.
*   **Hardhat/Truffle (npm):**
    *   Input: `hardhat.config.js`, `contracts/`, `test/`, `package.json`.
    *   Actions: `npx hardhat compile`, `npx hardhat test`, `npx hardhat coverage`, custom Hardhat tasks.
    *   Requires `npm install` or `bun install` in the workspace.
*   **Python (Brownie/ApeWorX/web3.py with Pytest):**
    *   Input: Python project structure, `requirements.txt` or virtual environment.
    *   Actions: `python -m pytest`, `brownie test`, `ape test`.
    *   May require activating a virtual environment.
*   **Slither:**
    *   Input: Contract file path or project root.
    *   Action: `slither <target> --json <output_file.json>`.
    *   Output: JSON report is preferable for parsing.

**LLM Prompts for Auditor Agent:**

*   **Interpreting Slither Output:**
    ```
    The static analysis tool Slither produced the following JSON output for a smart contract. Identify all critical and high-severity vulnerabilities, explain them briefly, and list the affected contract and function names.
    Slither JSON:
    ```json
    {slither_json_output}
    ```
    Format your response as a list of findings.
    ```
*   **Generating Fuzz Test Ideas:**
    ```
    Given the following Solidity function signature and its code, suggest 3 diverse and meaningful parameters for fuzz testing. Explain your reasoning for each suggestion.
    Function:
    ```solidity
    {function_code_snippet}
    ```
    Focus on edge cases, typical exploit vectors, and boundary values relevant to the function's logic.
    ```

**Security & Sandboxing:**
*   The `ToolExecutionService` is the most critical point for security.
*   Executing arbitrary code (from `git clone` then `forge test`) is risky.
*   Options:
    1.  **Docker Containers:** Each audit task runs in a fresh, isolated Docker container with tools pre-installed. Agent orchestrates Docker runs.
    2.  **TEE (Trusted Execution Environment):** As mentioned in `AGENTS.md`, ElizaOS has TEE starter projects. This could be a long-term goal for high-assurance audits.
    3.  **Restricted VM/Sandbox:** Using technologies like `firecracker` or `gVisor`.
    4.  **Carefully Curated Commands:** Initially, only allow specific, parameterized commands for known tools, avoiding arbitrary shell execution.
*   For the prototype, a "trusted workspace" model might be assumed, but for production, sandboxing is non-negotiable.

This design provides a roadmap for the capabilities and structure of the Blockchain Auditor Agents. The next step in the plan (Step 5) will be to implement a small PoC based on this.
---
## Further Development: Asynchronous/Parallel Execution & Supervisory Agents (Step 6 of previous plan)

**Goal:** Outline how to enhance ElizaOS for more complex multi-agent operations, including asynchronous task handling, parallel execution, and supervisory agent capabilities.

**1. Asynchronous & Parallel Execution:**

*   **Agent Task Queues:**
    *   Each agent (Developer, Auditor) should have an internal task queue.
    *   When an A2A `TASK_REQUEST` is received by `plugin-a2a-communication`, instead of immediate processing, the task details are enqueued.
    *   The agent's main loop (or a dedicated worker/scheduler within the agent) processes tasks from this queue.
    *   This allows an agent to accept multiple tasks and work on them without blocking A2A message reception.
    *   **Implementation (Done in current plan's Step 1):** `A2AService` in `plugin-a2a-communication` now has an in-memory queue. `TASK_REQUESTS` are enqueued, and `PROCESS_A2A_TASK_EVENT` is emitted for dequeued tasks.

*   **Asynchronous Actions (Already in place):**
    *   LLM calls (`plugin-deepseek`) and tool executions (`plugin-blockchain-auditor`) are already `async`. This is good for I/O-bound operations.

*   **Parallel Task Processing by a Single Agent (Advanced):**
    *   If an agent needs to perform multiple CPU-intensive sub-tasks in parallel (e.g., a DeveloperAgent working on multiple independent code modules simultaneously), Node.js `worker_threads` could be explored. This adds complexity.
    *   For now, focus on parallel execution *across different agents*.

*   **Parallel Execution Across Multiple Agents:**
    *   **Requirement:** A robust message bus for A2A communication if agents are in different processes or on different machines. The current in-memory bus in `A2AService` is single-process only.
    *   **Enhancement to `plugin-a2a-communication`:**
        *   Make `A2AService` configurable to use different backends (e.g., Redis, RabbitMQ, NATS via another ElizaOS plugin).
        *   ElizaOS runtime would need to support deploying and managing agents as distinct processes.
    *   With a proper message bus, a Supervisory Agent can dispatch tasks to multiple Developer/Auditor agents, and they can work in parallel.

*   **A2A Protocol Enhancements for Asynchronous Tasks:**
    *   `TASK_RESPONSE` should clearly support `status: "IN_PROGRESS"` with optional `progress_details`. (Current implementation sends ACK on queue, then final TASK_RESPONSE).
    *   Agents should send periodic `IN_PROGRESS` updates for long tasks if requested by the supervisor.
    *   Introduce `CANCEL_TASK` A2A message type.

**2. Supervisory Agents:**

*   **`SupervisoryAgent` Character Type (`packages/cli/src/characters/supervisor.character.ts`) (Done in current plan's Step 2):**
    *   **Plugins:** `@elizaos/plugin-deepseek`, `@elizaos/plugin-a2a-communication`.
    *   **System Prompt (Example in `supervisor.character.ts`):** Guides decomposition, delegation, monitoring.
    *   **Internal Logic / LLM-driven Actions (Conceptual design from current plan's Step 2):**
        *   `DECOMPOSE_GOAL {goal_description}`: Uses LLM to generate a list of sub-tasks.
        *   `SELECT_AGENT {task_requirements, agent_roster}`: Selects agent for task.
        *   `CREATE_A2A_TASK_REQUEST {sub_task_details, target_agent_id}`: Formats A2A message.
        *   `TRACK_DELEGATED_TASKS`: Internal state management.
        *   `EVALUATE_TASK_RESPONSE {a2a_task_response_message}`: Assesses received results.
        *   `AGGREGATE_PROJECT_RESULTS {all_task_responses_for_conversation_id}`: Compiles final report.

*   **Workflow for Supervisor (Conceptual design from current plan's Step 2):**
    1.  Receives a high-level task.
    2.  Uses `DECOMPOSE_GOAL`.
    3.  For each sub-task: `SELECT_AGENT`, `CREATE_A2A_TASK_REQUEST`, use `SEND_A2A_MESSAGE` action, `TRACK_DELEGATED_TASKS`.
    4.  Listens for A2A messages, updates task states.
    5.  Handles failures/timeouts.
    6.  Aggregates results.
    7.  Reports outcome.

**Implementation Path (Conceptual, from previous plan's Step 6 design):**
*   **Short Term (Partially addressed by current plan's Steps 1, 3, 4):**
    *   `plugin-a2a-communication` enhanced with in-memory queue (Done).
    *   Specialist agents (Developer, Auditor) refined to process tasks from this queue (Done).
    *   `SupervisoryAgent` character created. Its "actions" like `DECOMPOSE_GOAL` are LLM prompts; output parsing and subsequent A2A calls are part of its defined behavior.
*   **Medium Term (Future work beyond current plan):**
    *   Develop a more formal `TaskService` (core or bootstrap plugin) for persistent task queues (SQL).
    *   Refine A2A protocol for richer status updates (e.g., `IN_PROGRESS` status in `TASK_RESPONSE`).
    *   Design agent roster/service discovery.
*   **Long Term (Future work beyond current plan):**
    *   External message queues for multi-process parallelism.
    *   Advanced planning/coordination algorithms for Supervisors.
---
## E2E Test Scenario: Supervisor-Developer Interaction (Step 5 of current plan)

**Goal:** Verify basic workflow: Supervisor decomposes goal, delegates to Developer via A2A (queued), Developer executes and responds.

**Agents:**
*   `SupervisoryAgent` (S, ID: `supervisor-001`), using `supervisor.character.ts`.
*   `DeveloperAgent` (D, ID: `dev-001`), using `developer.character.ts`.

**Setup:**
*   ElizaOS running S & D. Both use `@elizaos/plugin-deepseek` & `@elizaos/plugin-a2a-communication`.
*   S's `team_roster` includes D.
*   `DEEPSEEK_API_KEY` is set.

**Workflow & Assertions:**

1.  **Trigger:** Message to S: `"SupervisorAlpha, arrange creation of a Python function 'add_integers(a: int, b: int) -> int' that returns sum of two integers."`
2.  **S - Decomposes Task:**
    *   S uses DeepSeek (via its system prompt & `default_task_decomposition_prompt_template`) with the goal.
    *   **Expected Parsed Output (internal to S):** Sub-task like:
        ```json
        { "task_name": "GENERATE_ADD_INTEGERS_PY", "task_description": "Create Python function 'add_integers' (a: int, b: int) -> int, returns sum. Include docstring.", "agent_type": "DeveloperAgent", "parameters": {"language": "python", "function_name": "add_integers", "signature_hint": "a: int, b: int) -> int"}, "expected_response_format": "code_string" }
        ```
3.  **S - Delegates Task:**
    *   S selects `dev-001`.
    *   S uses `SEND_A2A_MESSAGE` action.
    *   **A2A `TASK_REQUEST` (S to D):**
        *   `sender_agent_id`: `supervisor-001`
        *   `receiver_agent_id`: `dev-001`
        *   `message_type`: `TASK_REQUEST`
        *   `payload`: Matches decomposed sub-task.
        *   `conversation_id`: New UUID (e.g., `conv-001`)
    *   **Assertion:** This message is sent (e.g., mock `A2AService.sendMessage` in test, or log check).
4.  **D - Receives & Queues Task, Sends ACK:**
    *   `dev-001`'s `A2AService` receives `TASK_REQUEST`, enqueues it.
    *   **A2A `ACK` (D to S):**
        *   `sender_agent_id`: `dev-001`
        *   `receiver_agent_id`: `supervisor-001`
        *   `message_type`: `ACK`
        *   `payload`: `{ "original_message_id": <ID of TASK_REQUEST>, "status": "TASK_QUEUED" }`
        *   `conversation_id`: `conv-001`
    *   **Assertion:** S receives this ACK (log/mock).
5.  **D - Processes Task from Queue:**
    *   `dev-001`'s `A2AService` emits `PROCESS_A2A_TASK_EVENT` with the `TASK_REQUEST`.
    *   `dev-001` (guided by its system prompt and the `PROCESS_A2A_TASK_EVENT` handler in `plugin-a2a-communication`) uses DeepSeek.
    *   **Conceptual LLM Prompt (by D):** "System Prompt... Process task: GENERATE_ADD_INTEGERS_PY... Language: python..."
    *   **Expected LLM Code Output (to D):**
        ```python
        def add_integers(a: int, b: int) -> int:
          """Adds two integers and returns their sum."""
          return a + b
        ```
6.  **D - Sends Task Response:**
    *   D uses `SEND_A2A_MESSAGE` action.
    *   **A2A `TASK_RESPONSE` (D to S):**
        *   `sender_agent_id`: `dev-001`
        *   `receiver_agent_id`: `supervisor-001`
        *   `message_type`: `TASK_RESPONSE`
        *   `payload`: `{ "original_task_name": "GENERATE_ADD_INTEGERS_PY", "status": "SUCCESS", "result": "<python_code_string>", "error_message": null }`
        *   `conversation_id`: `conv-001`
    *   **Assertion:** S receives this `TASK_RESPONSE` (log/mock).
7.  **S - Processes Response:**
    *   S's `a2a_message_received` listener gets the `TASK_RESPONSE`.
    *   S updates its internal tracking for `conv-001`.
    *   (Optional/Simplified) S uses DeepSeek to verify result: "Task was to make 'add_integers'. Code: '...'. Is this plausible? YES/NO".
    *   **Final Test Assertion:** S logs/outputs overall success for initial goal, including the code. E.g., "Project 'conv-001', task 'GENERATE_ADD_INTEGERS_PY' completed by dev-001 with result: [code]".

This E2E test design outlines the key interactions and data flows for a supervisor-developer workflow.
---
## Advanced Topics Review & Documentation (Current Plan - Step 6)

This section details further considerations for sandboxing tool execution within `plugin-blockchain-auditor` and scaling `plugin-a2a-communication` for distributed environments.

**I. Robust Sandboxing for `ToolExecutionService` (`plugin-blockchain-auditor`)**

The current PoC `ToolExecutionService` uses `child_process.spawn` directly, which is insecure for untrusted inputs (e.g., contracts from arbitrary Git repos).

**A. Risks of Current Approach:**
*   **Arbitrary Code Execution:** A malicious `foundry.toml`, `hardhat.config.js`, or even a cleverly crafted contract file could potentially execute arbitrary commands on the host system if the audit tools themselves have vulnerabilities or allow script execution through config files.
*   **File System Access:** Tools might read/write outside the intended workspace.
*   **Network Access:** Tools might make unintended outbound network calls.
*   **Resource Exhaustion:** A malicious test suite could attempt a denial-of-service attack (e.g., "zip bomb" in project files, infinite loops in tests).

**B. Recommended Sandboxing Strategies:**

1.  **Docker Containers (Preferred for Portability & Strong Isolation):**
    *   **Mechanism:**
        *   Maintain pre-built Docker images for different audit environments (e.g., one with Foundry, one with Hardhat + Slither, one with Python + Brownie).
        *   When an audit task arrives, `ToolExecutionService` would:
            a.  Create a temporary, isolated workspace directory on the host.
            b.  Pull/clone the target contracts into this workspace.
            c.  Run the appropriate Docker image, mounting the workspace directory as a volume (e.g., `/workspace` inside the container).
            d.  Execute the audit command (e.g., `forge test`) inside the container using `docker exec`.
            e.  Retrieve results (stdout, stderr, exit code, report files) from the container/mounted volume.
            f.  Clean up the container and optionally the workspace.
    *   **Pros:** Excellent isolation (filesystem, network, process), consistent environments, dependency management via Dockerfiles.
    *   **Cons:** Docker daemon dependency, performance overhead (container startup), image management.
    *   **`ToolExecutionService` Changes:** Would become a Docker orchestration client. Needs permissions to interact with Docker daemon.

2.  **OS-Level Sandboxing (e.g., `firejail` on Linux):**
    *   **Mechanism:** Wrap tool execution with `firejail --profile=<tool_profile> <command> <args>`.
        *   Requires specific profiles for each tool (Forge, Slither) defining allowed syscalls, file access (`--whitelist`, `--blacklist`), network access (`--net=none` or specific).
    *   **Pros:** Lighter weight than Docker if tools are already on the host. Fine-grained control.
    *   **Cons:** Linux-specific, profile creation and maintenance can be complex. Less portable.

3.  **MicroVMs (e.g., Firecracker):**
    *   **Mechanism:** Launch a minimal MicroVM for each audit task, execute tools inside.
    *   **Pros:** Strongest isolation, very fast boot times for MicroVMs.
    *   **Cons:** Significant infrastructure complexity to manage MicroVMs. Likely overkill unless extreme security is paramount for every task.

4.  **TEE (Trusted Execution Environments):**
    *   **Mechanism:** As noted in `AGENTS.md`, ElizaOS has TEE starter projects. Could involve running critical parts of the audit or the tools themselves inside a TEE.
    *   **Pros:** Hardware-backed security for sensitive operations.
    *   **Cons:** Complex to implement, limited by TEE capabilities and tool compatibility. A long-term research area.

**C. Immediate `ToolExecutionService` Enhancements (Pre-Full Sandboxing):**
*   **Strict Command Whitelisting:** Only allow known commands (`forge`, `slither`, `npx hardhat`, `python -m pytest`).
*   **Argument Sanitization/Validation:** Ensure arguments don't contain shell metacharacters if `shell: true` were ever used (current PoC uses `shell: false`, which is good). Validate paths.
*   **Resource Limits (via `child_process` options or OS tools like `ulimit` if wrapped in a shell script):** Set timeouts (already in PoC), potentially memory/CPU limits if possible.
*   **Dedicated User Account:** Run the ElizaOS process (or at least the tool execution parts) as a low-privilege, dedicated user with restricted file system access.

**D. Documentation Update for `plugin-blockchain-auditor/README.md`:**
*   Add a prominent, detailed "Security Considerations" section explaining the risks of the PoC and strongly recommending proper sandboxing for any real use.
*   Briefly outline the suggested sandboxing strategies (Docker as a primary recommendation).

**II. Scalable Distributed A2A Communication (`plugin-a2a-communication`)**

The current in-memory `EventEmitter` in `A2AService` limits A2A to agents within the same Node.js process.

**A. Requirements for Distributed A2A:**
*   **External Message Bus:** A system that agents in different processes/machines can connect to.
*   **Message Serialization:** JSON is suitable.
*   **Agent Addressing/Routing:** How messages find their target agent. Agent IDs must be globally unique and resolvable to a "location" or subscription topic on the bus.
*   **(Optional) Persistence & Reliability:** Delivery guarantees, dead-letter queues.

**B. Design for Pluggable Message Bus Backend:**

1.  **`IMessageBusAdapter` Interface (in `plugin-a2a-communication/src/types.ts` or a new file):**
    ```typescript
    export interface IMessageBusAdapter {
      publish(topic: string, message: A2AMessage): Promise<void>;
      subscribe(topic: string, handler: (message: A2AMessage) => void): Promise<void>; // handler processes the message
      unsubscribe(topic: string): Promise<void>;
      connect(): Promise<void>;
      disconnect(): Promise<void>;
    }
    ```

2.  **Modify `A2AService`:**
    *   Constructor takes an `IMessageBusAdapter` instance.
    *   Configuration (`plugin-a2a-communication/src/environment.ts`) would specify which adapter to load/use (e.g., `A2A_BUS_TYPE: "redis" | "in-memory"`).
    *   `sendMessage` uses `adapter.publish()`. The topic could be `a2a:agent:${receiver_agent_id}`.
    *   `subscribeToMessages` uses `adapter.subscribe()` to this agent's specific topic (e.g., `a2a:agent:${this.agentId}`). The handler remains similar (enqueueing tasks, emitting events).
    *   The global `EventEmitter` is replaced by the adapter.

3.  **Example: `RedisMessageBusAdapter`:**
    *   Uses a Redis client (e.g., `ioredis`).
    *   `publish`: Uses `redis.publish(topic, JSON.stringify(message))`.
    *   `subscribe`: Uses `redis.subscribe(topic)` and sets up a message listener that parses JSON and calls the provided handler.
    *   Requires Redis connection details in config.

**C. Agent Discovery (Brief Consideration):**
*   For a message bus to route `a2a:agent:<agent_id>`, agents need to register their ID and listen on that topic.
*   A more advanced system might involve a central Agent Registry where agents publish their ID and capabilities, and how to reach them (e.g., their specific message bus topic). This is beyond the A2A plugin itself but is a necessary component of a larger distributed agent system.

**D. Documentation Update for `plugin-a2a-communication/README.md`:**
*   Explain the limitations of the current in-memory bus.
*   Outline the design for pluggable message bus adapters and give Redis as an example.
*   Mention future considerations like agent discovery and enhanced reliability.

By documenting these advanced topics thoroughly in `scratchpad.md` and updating the relevant plugin READMEs, this step will be complete.
---
This scratchpad will evolve as the project progresses.Tool output for `create_file_with_block`:
