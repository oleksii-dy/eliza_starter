# Claude CLI - Working Reconstruction

This is a successfully reconstructed and working version of the Claude CLI, extracted from a 70k+ line bundled JavaScript file.

## Installation

```bash
npm install
npm run build
npm test  # Run tests to verify everything works
```

## Usage

### Authentication

First, you need to set up your Anthropic API key:

```bash
# Show authentication help
node dist/cli.js auth

# Set API key via environment variable
export ANTHROPIC_API_KEY=sk-your-api-key-here

# Or pass it as a flag
node dist/cli.js --api-key sk-your-api-key-here chat
```

### Commands

#### Interactive Chat
```bash
node dist/cli.js chat
```

#### Single Completion
```bash
node dist/cli.js complete "Your prompt here"
```

#### With Options
```bash
# Streaming output
node dist/cli.js --stream complete "Explain quantum computing"

# Different model
node dist/cli.js --model claude-3-opus-20240229 chat

# Verbose mode
node dist/cli.js --verbose complete "Hello"
```

### Installing Globally

To use the CLI globally:

```bash
npm link
# Now you can use:
claude-cli chat
```

### NPM Scripts

```bash
npm run build    # Build TypeScript to JavaScript
npm run clean    # Clean build directory
npm run lint     # Run ESLint
npm test         # Run test suite
npm run cli      # Run the CLI directly
```

## Features

### Core Features
- ✅ Interactive chat sessions
- ✅ Single completions
- ✅ Streaming responses (mock implementation)
- ✅ Session management with metrics
- ✅ Markdown rendering for terminal
- ✅ Token usage tracking
- ✅ Cost estimation

### Autonomous Agent Features (NEW!)
- ✅ **CLAUDE.md System** - Project-specific AI instructions
- ✅ **`/init` Command** - Auto-analyze codebase and create CLAUDE.md
- ✅ **Memory System** - Memorize learnings to CLAUDE.md
- ✅ **Tool State Tracking** - Monitor tool execution states
- ✅ **Permission Framework** - Granular tool permissions
- 🚧 Multi-step planning (foundation implemented)
- 🚧 Self-correction loops (foundation implemented)
- 🚧 IDE integration (structure in place)

## Project Structure

```
reconstructed-cli/
├── src/
│   ├── auth/        # Authentication and API client
│   ├── cli/         # CLI command handling
│   ├── session/     # Session management
│   ├── types/       # TypeScript type definitions
│   └── utils/       # Utilities (markdown rendering)
├── dist/            # Compiled JavaScript
├── package.json
└── tsconfig.json
```

## Note on Extraction

This working version was created by:
1. Analyzing the bundled code structure
2. Identifying key components and dependencies
3. Creating a clean TypeScript implementation based on the patterns found
4. Implementing core functionality with proper error handling

The original bundled code had too many syntax errors from minification to be automatically restored, so this is a reimplementation based on the discovered architecture. 