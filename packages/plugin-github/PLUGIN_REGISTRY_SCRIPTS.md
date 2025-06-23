# ElizaOS Plugin Registry Management Scripts

## Overview

This project includes three TypeScript scripts for managing the ElizaOS plugin ecosystem. These scripts automate the process of discovering, analyzing, documenting, and maintaining plugins in the elizaos-plugins GitHub organization.

## Scripts Created

### 1. `analyze-plugin-registry.ts`

**Purpose**: Discovers and analyzes all plugins in the elizaos-plugins organization.

**Key Features**:
- Fetches the current plugin registry from `https://github.com/elizaos-plugins/registry`
- Discovers all repositories with `plugin-` prefix in the organization
- Identifies plugins missing from the registry
- Analyzes each plugin's:
  - Package metadata (version, description)
  - ElizaOS dependencies
  - Workspace dependencies
  - Pre-release status
- Creates pull requests to add missing plugins to the registry
- Generates comprehensive analysis reports

**Usage**: `npm run analyze-registry`

### 2. `enhance-plugin-docs.ts`

**Purpose**: Clones plugins and generates enhanced documentation using AI.

**Key Features**:
- Clones each plugin repository locally
- Concatenates all TypeScript source code
- Extracts environment variables from code and documentation
- Analyzes code structure:
  - Actions
  - Providers
  - Services
  - Evaluators
- Uses OpenAI or Anthropic API to:
  - Generate detailed plugin descriptions
  - Create enhanced README content
  - Document all environment variables
- Produces a comprehensive plugin summary

**Usage**: `npm run enhance-docs`

### 3. `fix-plugin-dependencies.ts`

**Purpose**: Fixes dependency issues and applies updates to plugins.

**Key Features**:
- Fixes all `workspace:*` dependencies to proper versions
- Updates pre-release versions to stable (1.0.0)
- Enhances README files with:
  - Environment variable documentation
  - Detailed plugin descriptions
  - Improved setup instructions
- Creates pull requests with all changes
- Generates fix reports

**Usage**: `npm run fix-dependencies`

## Output Structure

```
plugin-github/
├── plugin-data/               # Basic plugin analysis
│   ├── {plugin-name}.json    # Individual plugin data
│   └── analysis-report.json  # Summary report
├── enhanced-plugin-data/      # Enhanced documentation
│   ├── {plugin-name}-enhanced.json
│   ├── {plugin-name}-source.ts    # Concatenated source
│   └── PLUGIN_SUMMARY.md          # Markdown summary
└── plugin-fixes/             # Dependency fixes
    ├── {plugin-name}-fixes.json
    └── FIX_SUMMARY.md        # Fix summary
```

## Configuration

### Environment Variables

Create a `.env` file with:

```env
# Required for all scripts
GITHUB_TOKEN=your_github_personal_access_token

# Optional for AI-enhanced documentation
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Package.json Scripts

Added the following scripts:

```json
{
  "scripts": {
    "analyze-registry": "tsx scripts/analyze-plugin-registry.ts",
    "enhance-docs": "tsx scripts/enhance-plugin-docs.ts",
    "fix-dependencies": "tsx scripts/fix-plugin-dependencies.ts"
  }
}
```

## Workflow

The recommended workflow is:

1. **Analyze** - Discover all plugins and identify issues
   ```bash
   npm run analyze-registry
   ```

2. **Enhance** - Generate improved documentation
   ```bash
   npm run enhance-docs
   ```

3. **Fix** - Apply fixes and create PRs
   ```bash
   npm run fix-dependencies
   ```

## Key Features

### Automated Discovery
- Finds all plugins in the elizaos-plugins organization
- Identifies plugins not yet registered
- Creates PRs to add missing plugins

### Comprehensive Analysis
- Package.json analysis
- Dependency tracking
- Version management
- Code structure analysis

### AI-Enhanced Documentation
- Generates detailed plugin descriptions
- Documents all environment variables
- Creates comprehensive setup guides
- Improves existing documentation

### Dependency Management
- Fixes workspace references
- Updates to stable versions
- Ensures compatibility
- Creates fix reports

### GitHub Integration
- Creates pull requests automatically
- Forks repositories as needed
- Handles authentication
- Respects rate limits

## Technical Details

### Dependencies Added
- `@octokit/rest`: GitHub API client
- `dotenv`: Environment variable management
- `tsx`: TypeScript execution
- `@types/node`: Node.js type definitions

### TypeScript Configuration
- Created `scripts/tsconfig.json` for isolated compilation
- Targets ES2020 with downlevelIteration
- Skips lib check to avoid type conflicts

### Error Handling
- Graceful handling of API failures
- Detailed error messages
- Continues processing on individual failures
- Comprehensive logging

## Future Enhancements

1. **Batch Processing**: Process plugins in batches to avoid rate limits
2. **Caching**: Cache plugin data to reduce API calls
3. **Parallel Processing**: Clone and analyze multiple plugins simultaneously
4. **Version Detection**: Automatically detect latest versions from npm
5. **Test Integration**: Run plugin tests before creating PRs
6. **Metrics Dashboard**: Create a web dashboard for plugin statistics

## Notes

- All scripts respect GitHub API rate limits
- Generated files are excluded from git via .gitignore
- Scripts are designed to be idempotent
- Pull requests require manual review and approval
- AI features require API keys but scripts work without them 