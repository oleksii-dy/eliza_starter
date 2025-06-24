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
This scratchpad will evolve as the project progresses.Tool output for `create_file_with_block`:
