# Claude CLI - Reconstructed

This is a reconstructed version of a CLI application for interacting with Anthropic's Claude AI, extracted and demangled from a bundled JavaScript file.

## Overview

This project was reverse-engineered from a 70k+ line bundled CLI application. The reconstruction process involved:

1. Analyzing the bundle structure using AST parsing
2. Identifying and separating library code from business logic
3. Demangling minified variable and function names
4. Organizing code into a proper TypeScript project structure
5. Adding type definitions and proper dependencies

## Features

Based on the extracted code, this CLI includes:

- **OAuth 2.0 Authentication** with PKCE flow
- **Anthropic API Integration** with streaming support
- **Interactive Terminal UI** built with React/Ink
- **Session Management** with persistent state
- **Markdown Rendering** capabilities
- **Command Autocomplete** and file suggestions
- **MCP (Model Context Protocol)** support

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd claude-cli-reconstructed

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

## Usage

```bash
# Run directly
node dist/cli.js

# Or if linked globally
claude-cli

# Commands
claude-cli chat                    # Start interactive chat
claude-cli complete "prompt"       # Get a single completion
claude-cli auth                    # Authenticate with Claude
```

## Environment Variables

Create a `.env` file with:

```env
ANTHROPIC_API_KEY=your-api-key-here
ANTHROPIC_BASE_URL=https://api.anthropic.com (optional)
```

## Project Structure

```
src/
├── auth/          # Authentication and API client
│   └── index.ts   # OAuth flows, API wrappers
├── cli/           # CLI command handling
│   └── index.ts   # Command parsing, execution
├── session/       # Session management
│   └── index.ts   # State persistence
├── utils/         # Utilities
│   └── markdown.ts # Markdown processing
├── types/         # TypeScript definitions
│   └── index.ts   # Type interfaces
├── index.ts       # Main library entry
└── cli.ts         # CLI executable entry
```

## Development

```bash
# Run in development mode
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Clean build
npm run clean && npm run build
```

## Reconstruction Notes

### What Was Recovered

- Core business logic for OAuth authentication
- API client implementation with streaming
- Session and state management
- CLI command structure
- Terminal UI components

### What Needs Work

- Many variable names are still minified
- Some type definitions need refinement
- Error handling may need improvement
- Some bundled dependencies couldn't be identified
- Unit tests need to be written

### Name Mappings Applied

The demangling process applied these mappings:
- `h31` → `handleAuthentication`
- `R8` → `AnthropicClient`
- `Sw2` → `MarkdownRenderer`
- And many more (see `demangle-code.cjs`)

## Known Issues

1. Some functions still have minified names
2. Type safety is limited due to reconstruction
3. Some imports may be missing or incorrect
4. Error messages might not be user-friendly

## Contributing

This is a reconstructed project, so contributions to improve the code quality, add missing types, or fix issues are welcome!

## License

This reconstruction is provided as-is for educational purposes. The original code's license terms apply.

## Disclaimer

This is a reverse-engineered reconstruction and may not function exactly as the original. Use at your own risk. 