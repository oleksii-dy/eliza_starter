# Autonomous Agent Features - Example Usage

This demonstrates the autonomous agent features we've extracted and implemented from the original Claude CLI.

## 1. Initialize Project Context

```bash
# Create CLAUDE.md with project-specific instructions
$ node dist/cli.js init

🚀 Initializing CLAUDE.md for this project...

✅ CLAUDE.md created successfully!

The file contains:
- Build and test commands
- Key dependencies  
- Existing development guidelines
```

## 2. View Generated CLAUDE.md

```bash
$ cat CLAUDE.md

# CLAUDE.md

This file provides guidance to Autocoder (claude.ai/code) when working with code in this repository.

## Build Commands
- `npm run build`
- `npm run lint`

## Test Commands
- `npm test`

## Key Dependencies
- @anthropic-ai/sdk
- axios
- chalk
- commander
...
```

## 3. Add Project-Specific Knowledge

```bash
# Add learnings to project CLAUDE.md
$ node dist/cli.js memorize "Use chalk for all terminal colors, not console colors"
✅ Memorized to ./CLAUDE.md

# Add user-level knowledge
$ node dist/cli.js memorize --user "Always prefer async/await over callbacks"
✅ Memorized to ~/.claude/CLAUDE.md
```

## 4. Enhanced Chat with Context

When you run `node dist/cli.js chat`, the agent now:
- Loads project CLAUDE.md instructions
- Loads user CLAUDE.md preferences
- Uses this context for better responses

## 5. Tool Execution with Permissions

In the autonomous module, we have:

```typescript
// Tool states tracking
toolState: 'tool-input' | 'tool-use' | 'responding' | 'thinking' | 'requesting'

// Permission scopes
scope: 'temporary' | 'session' | 'permanent'

// Execute with permission check
await agent.executeTool('read_file', { path: 'src/index.ts' });
// → Requests permission
// → Tracks execution state
// → Returns results or errors
```

## 6. Future Enhancements

Based on the original CLI analysis, we could add:

### A. Multi-Step Planning
```
User: Create a new TypeScript module for data validation

Autocoder's plan:
1. Create src/validation/index.ts
2. Add zod dependency
3. Create validation schemas
4. Update exports in src/index.ts
5. Add tests

[Approve] [Modify] [Cancel]
```

### B. Self-Correction Loop
```
Error: TypeScript compilation failed

Autocoder: I see the issue. Let me fix the type error...
[Autonomous retry with correction]
```

### C. IDE Integration
```
$ node dist/cli.js --ide vscode chat
# Direct integration with VS Code for applying diffs
```

### D. Advanced Memory
```
# Auto-memorize patterns
Autocoder: I notice you always use 'pnpm' instead of 'npm'. 
Would you like me to remember this preference? [Y/n]
```

## Example Autonomous Session

```typescript
// In enhanced chat mode
const agent = getAutonomousAgent();

// Load all context
const instructions = await agent.loadInstructions();

// Execute with state tracking
agent.on('tool:state', (state) => {
  console.log(`${state.name}: ${state.state}`);
});

// Plan execution
const plan = await agent.planExecution(userRequest);
// → Shows multi-step plan
// → Asks for approval
// → Executes with rollback capability
```

## Key Differences from Simple CLI

1. **Persistent Learning** - CLAUDE.md files retain project knowledge
2. **Permission System** - Granular control over tool execution
3. **State Tracking** - Visual feedback on what the agent is doing
4. **Multi-Step Planning** - Can plan and execute complex tasks
5. **Self-Correction** - Learn from errors and retry

This makes the CLI not just a chat interface, but a true autonomous coding assistant that learns and improves over time! 