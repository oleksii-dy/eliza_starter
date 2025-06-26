# Claude CLI Reverse Engineering Summary

## What We Discovered

### Core Architecture

1. **Streaming System**
   - Uses Server-Sent Events (SSE) for real-time streaming
   - Message types: `message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_stop`
   - Tool use IDs follow pattern: `toolu_${timestamp}_${random}`

2. **Tool System**
   - Core tools: Bash, Edit, MultiEdit, Read, Write, NotebookEdit, List, FetchURL
   - Permission system with states: pending, approved, rejected, executing, completed, error
   - Tool filtering with patterns like "Bash(git:*)"
   - Permission modes: auto, ask, deny

3. **Message Format**
   ```typescript
   interface Message {
     role: 'user' | 'assistant';
     content: string | ContentBlock[];
   }
   
   interface ContentBlock {
     type: 'text' | 'tool_use' | 'tool_result';
     id?: string;
     name?: string;
     input?: any;
   }
   ```

4. **Transport Types**
   - stdio, sse, sse-ide, ws-ide, http
   - Original used `beta.messages.create` API calls

## What We Implemented

### 1. Tool Definitions (`src/core/tool-definitions.ts`)
- Complete tool schemas matching original format
- Tool filtering with pattern matching
- Support for allowed/disallowed tool lists

### 2. Streaming Client (`src/core/streaming.ts`)
- Event-based streaming with proper SSE event handling
- Tool state management and permission flow
- Message accumulation and content block handling
- Extensible tool execution framework

### 3. Autonomous CLI (`src/cli/autonomous.ts`)
- Full interactive loop with streaming responses
- Tool permission UI matching original
- Command-line options for tool control
- Real tool execution (Bash, Read, Write, Edit, etc.)

## Key Patterns From Original

1. **Prompts**
   - Main: "You are ${appName}, Anthropic's official CLI for Autocoder."
   - Agent mode included full tool instructions

2. **CLAUDE.md System**
   - `/init` command creates documentation
   - Multiple locations checked: `./CLAUDE.md`, `~/.claude/CLAUDE.md`, `ULTRACLAUDE.md`
   - Auto-memorization features

3. **Permission UI**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Autocoder requested permissions to use ${toolName}
   Input: {...}
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Allow? (y/n):
   ```

4. **Token Tracking**
   - input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens
   - Cost calculation and session metrics

## What's Still Missing

1. **API Integration**
   - Actual Anthropic API calls
   - Proper authentication handling
   - Real SSE streaming from API

2. **MCP (Model Context Protocol)**
   - MCP server configuration
   - External tool integration

3. **Advanced Features**
   - Plan approval system
   - Session persistence/resume
   - Auto-updates
   - Telemetry

## How to Use the Reconstructed CLI

```bash
# Build the project
npm run build

# Start autonomous mode with all tools
node dist/cli.js autonomous --permission-mode auto

# Start with specific tools only
node dist/cli.js autonomous --allowed-tools "Read,Write,Edit"

# Start with tool restrictions
node dist/cli.js autonomous --disallowed-tools "Bash"

# Regular chat mode
node dist/cli.js chat

# Single completion
node dist/cli.js complete "Hello, Claude"
```

## Architecture Diagram

```
┌─────────────────────┐
│   CLI Entry Point   │
│    (src/cli.ts)     │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼───┐    ┌───▼──────────┐
│ Chat  │    │  Autonomous  │
│ Mode  │    │     Mode     │
└───────┘    └───┬──────────┘
                 │
         ┌───────▼────────┐
         │StreamingClient │
         │  (SSE-based)   │
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │ Tool Execution │
         │   Framework    │
         └────────────────┘
```

## Conclusion

We successfully extracted and reconstructed the core autonomous agent functionality from the 70k+ line bundled JavaScript. The implementation captures:

- Real-time streaming with tool execution
- Permission system matching the original UI
- Proper tool definitions and filtering
- Event-driven architecture for extensibility

While we don't have the actual API integration, the framework is ready to be connected to the real Anthropic API endpoints. The patterns and architecture have been preserved, making it straightforward to complete the implementation with proper API credentials and endpoints. 