# CLI.js Bundle Extraction Guide

## Overview

Successfully extracted business logic from a 70k+ line bundled CLI application. The bundle appears to be a sophisticated CLI tool with authentication, session management, markdown processing, and AI API integration capabilities.

## Extraction Results

### Statistics
- **Total Lines**: 70,361
- **Classes Found**: 185
- **Functions Found**: 1,941
- **Constants Found**: 5,297
- **Authentication Components**: 146
- **CLI Components**: 103

### Key Libraries Detected
1. **Zod** (627 occurrences) - Schema validation
2. **React** (214 occurrences) - UI components
3. **Commander/Yargs** - CLI argument parsing
4. **Chalk** - Terminal styling
5. **Axios** - HTTP client
6. **Lodash** - Utility functions

### Business Logic Patterns
- **Configuration Management**: 510 occurrences
- **Business Logic**: 499 occurrences
- **Database Operations**: 331 occurrences
- **API Calls**: 257 occurrences
- **Authentication**: 167 occurrences

## Extracted Components

### 1. Authentication (`auth.ts`)
Contains OAuth implementations, API client wrappers, and session management:
- OAuth flow handlers
- Token management
- Anthropic API client implementation
- Authentication listeners

### 2. CLI Logic (`cli.ts`)
Command parsing and execution:
- Command handlers
- Shell execution
- Terminal interface management
- Input/output handling

### 3. Session Management (`session.ts`)
State persistence and user session handling:
- Session storage
- State management
- Configuration persistence

### 4. Markdown Processing (`markdown.ts`)
Markdown parsing and rendering capabilities

## How to Use the Extracted Code

### Step 1: Navigate to the Extracted Directory
```bash
cd smart-extracted
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Review and Refine

1. **Check Name Mappings**: Review `name-mapping.json` for suggested variable renames:
   ```json
   {
     "functions": {
       "h31": "handleAuthentication",
       "zg": "formatOutput",
       "xa0": "executeShellCommand"
     }
   }
   ```

2. **Update Types**: The `types.ts` file needs manual refinement. Update the auto-generated interfaces with proper types.

3. **Apply Renames**: Use the name mappings to rename minified variables in the extracted files.

### Step 4: Build the Project
```bash
npm run build
```

## Key Findings

### 1. API Integration
The application integrates with the Anthropic API (Claude) and includes:
- Streaming response handling
- Token counting
- Rate limiting
- Error handling with retries

### 2. Authentication System
- OAuth 2.0 implementation with PKCE
- Local server for auth code capture
- Token refresh logic
- Multiple auth provider support

### 3. CLI Framework
- Command parsing with autocomplete
- File path suggestions
- MCP (Model Context Protocol) support
- Terminal UI with React components

### 4. Session Management
- Persistent session storage
- Configuration management
- User preferences

## Next Steps

1. **Manual Cleanup Required**:
   - Apply intelligent variable renaming using the mapping file
   - Fix TypeScript types
   - Remove duplicate code blocks
   - Organize imports properly

2. **Reconstruct Package Structure**:
   ```
   src/
   ├── auth/
   │   ├── oauth.ts
   │   ├── api-client.ts
   │   └── session.ts
   ├── cli/
   │   ├── commands.ts
   │   ├── parser.ts
   │   └── executor.ts
   ├── utils/
   │   ├── markdown.ts
   │   └── helpers.ts
   └── index.ts
   ```

3. **Add Missing Dependencies**:
   The extracted `package.json` includes detected dependencies, but you may need to add:
   - Type definitions (@types/*)
   - Missing peer dependencies
   - Development tools

4. **Testing**:
   - Create unit tests for core functions
   - Test authentication flows
   - Verify CLI command execution

## Tools Created

1. **quick-analyze.js** - Fast pattern-based analysis
2. **analyze-bundle.js** - AST-based analysis (requires fixing)
3. **extract-business-logic.js** - AST extraction with fallback
4. **smart-extractor.js** - Pattern-based extraction with categorization

## Limitations

1. **Minified Code**: Variable names are minified and need manual demangling
2. **Missing Context**: Some business logic context is lost in bundling
3. **Type Information**: TypeScript types are lost and need reconstruction
4. **Dependencies**: Some bundled dependencies couldn't be identified

## Recommendations

1. Start with the authentication module as it's the most self-contained
2. Use the name mapping suggestions but verify correctness
3. Add comprehensive logging to understand execution flow
4. Consider using the original source if available for comparison
5. Focus on extracting core business logic rather than bundled libraries

## Summary

The extraction successfully separated ~70k lines of bundled code into categorized components. While the code requires significant manual cleanup, the core business logic has been preserved and organized into logical modules. The application appears to be a sophisticated CLI tool for interacting with AI models, likely Anthropic's Claude, with robust authentication, session management, and terminal UI capabilities. 