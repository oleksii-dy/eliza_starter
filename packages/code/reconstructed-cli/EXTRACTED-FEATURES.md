# Extracted Features from Original Claude CLI

This document summarizes the key features and patterns extracted from the original 70k+ line bundled JavaScript file.

## 1. System Architecture

### Core Components Extracted:

```
src/
├── autonomous/    # CLAUDE.md system, memory, learning
├── tools/        # Tool execution with permission system
├── prompts/      # Exact prompts from original
├── cli/
│   ├── index.ts   # Basic commands
│   └── enhanced.ts # Advanced autonomous features
```

## 2. Exact Patterns Recreated

### A. Tool System (from original patterns)

```typescript
// Tool use ID generation
toolUseID: `toolu_${timestamp}_${random}`

// Tool states tracking
erroredToolUseIDs: Set<string>
inProgressToolUseIDs: Set<string>
resolvedToolUseIDs: Set<string>

// Tool render methods
renderToolUseMessage()
renderToolUseProgressMessage()
renderToolUseRejectedMessage()
renderToolUseErrorMessage()
renderToolUseQueuedMessage()
```

### B. Permission Messages (verbatim)

```typescript
`Autocoder requested permissions to use ${toolName}, but you haven't granted it yet.`
`Autocoder requested permissions to read from ${path}, but you haven't granted it yet.`
`Autocoder requested permissions to write to ${path}, but you haven't granted it yet.`
`Autocoder wants to fetch content from ${hostname}`
```

### C. System Prompts (exact)

```typescript
// Main prompt
`You are ${appName}, Anthropic's official CLI for Autocoder.`

// Agent prompt
`You are an agent for ${appName}, Anthropic's official CLI for Autocoder. Given the user's message, you should use the tools available to complete the task. Do what has been asked; nothing more, nothing less. When you complete the task simply respond with a detailed summary of what you've done.`
```

### D. CLAUDE.md Init Prompt (complete)

```
Please analyze this codebase and create a CLAUDE.md file, which will be given to future instances of Autocoder to operate in this repository.

What to add:
1. Commands that will be commonly used, such as how to build, lint, and run tests...
2. High-level code architecture and structure...

[Full prompt preserved exactly as in original]
```

## 3. Tool State Indicators

```typescript
'tool-input'  → '⚒'
'tool-use'    → '⚒'
'responding'  → '↓'
'thinking'    → '↓'
'requesting'  → '↑'
```

## 4. Plan Approval System

```typescript
"Here is Autocoder's plan:"
- Approve
- Modify  
- Cancel

"User approved Autocoder's plan:"
"User rejected Autocoder's plan:"
"No, and tell Autocoder what to do differently"
```

## 5. Features Implemented

✅ **CLAUDE.md System**
- `/init` command with exact prompt
- Project and user level files
- Auto-discovery of .cursor/rules, .github/copilot-instructions.md

✅ **Tool Calling Framework**
- Tool use IDs matching original pattern
- State tracking (errored, inProgress, resolved)
- Permission system with scopes
- Event-driven architecture

✅ **Prompts & Messages**
- Exact system prompts
- Permission request messages
- Tool state indicators
- Plan approval flow

✅ **Memory & Learning**
- `/memorize` command
- Timestamped entries
- Project vs user scope

## 6. Enhanced Command

```bash
$ node dist/cli.js enhanced

# Features:
- Loads CLAUDE.md automatically
- Shows tool state indicators
- Permission prompts for tools
- Enhanced metrics tracking
```

## 7. Key Differences from Simple CLI

| Feature | Simple CLI | Enhanced CLI |
|---------|-----------|--------------|
| Context | None | CLAUDE.md loaded |
| Tools | None | Full tool system |
| Permissions | None | Granular control |
| Memory | Session only | Persistent |
| Prompts | Basic | Exact from original |

## 8. Architecture Insights

The original CLI was built with:
- React/Ink for terminal UI
- Event-driven tool execution
- Streaming SSE for responses  
- Multi-file permission tracking
- Sophisticated prompt engineering

## 9. Future Roadmap

Based on the extraction, we could add:
- Full SSE streaming
- React/Ink UI components
- MCP server integration
- IDE plugin communication
- Advanced planning loops

This extraction preserves the core autonomous agent capabilities that made the original CLI special! 