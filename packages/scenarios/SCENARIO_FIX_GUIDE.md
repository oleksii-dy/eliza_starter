# ElizaOS Scenario System Fix Guide

## Overview

The ElizaOS scenario system consists of two main types of scenarios:

1. **Plugin Scenarios** - Scenarios embedded within plugins using the `PluginScenario` interface
2. **Standalone Scenarios** - Scenarios defined in the `@elizaos/scenarios` package

## Current Issues and Fixes

### 1. Scenario Loading Issues

**Problem**: CLI not properly loading scenarios from `@elizaos/scenarios` package

**Fix Applied**: Updated `packages/cli/src/commands/scenario/index.ts` to:

- Add `--source` option to specify scenario source (plugin/standalone/all)
- Dynamically import scenarios from `@elizaos/scenarios`
- Support both plugin and standalone scenario execution

### 2. Database Setup Issues

**Problem**: SQL plugin database type needs to be set before any imports

**Fix Applied**: Set database type to PGLite at the start of scenario commands:

```typescript
const sqlModule = await import('@elizaos/plugin-sql');
sqlModule.setDatabaseType('pglite');
```

### 3. Message Processing Issues

**Problem**: Scenario runner not properly triggering agent responses

**Fix Applied**: Updated `packages/cli/src/scenario-runner/index.ts` to:

- Use message manager directly if available
- Fallback to event system for message handling
- Properly wait for agent responses with timeout

## Running Scenarios

### Basic Commands

```bash
# Build scenarios package first
pnpm --filter @elizaos/scenarios build

# Run all scenarios
pnpm elizaos scenario run

# Run only plugin scenarios
pnpm elizaos scenario run --source plugin

# Run only standalone scenarios
pnpm elizaos scenario run --source standalone

# Run scenarios with filter
pnpm elizaos scenario run --filter payment

# Run with verbose output
pnpm elizaos scenario run --verbose

# Run specific scenario by ID
pnpm elizaos scenario run --scenario <scenario-id>
```

### Test All Scenarios

Use the comprehensive test script:

```bash
tsx packages/cli/scripts/test-all-scenarios.ts
```

This will:

- Build the scenarios package
- Run all scenario categories
- Generate a detailed report
- Save results to `scenario-test-report.json`

## Scenario Structure

### Standalone Scenario Example

```typescript
const scenario: Scenario = {
  id: 'unique-id',
  name: 'Scenario Name',
  description: 'What this scenario tests',
  category: 'category-name',
  tags: ['tag1', 'tag2'],

  actors: [
    {
      id: 'actor-id',
      name: 'Actor Name',
      role: 'subject', // or 'assistant'
      plugins: ['@elizaos/plugin-name'],
      script: {
        steps: [
          {
            type: 'message',
            content: 'Hello!',
          },
          {
            type: 'wait',
            waitTime: 2000,
          },
        ],
      },
    },
  ],

  verification: {
    rules: [
      {
        id: 'rule-id',
        type: 'llm',
        description: 'What to verify',
        config: {
          criteria: 'The agent should...',
          expectedValue: 'Expected outcome',
        },
      },
    ],
  },
};
```

### Plugin Scenario Example

```typescript
const pluginScenario: PluginScenario = {
  id: 'plugin-scenario-id',
  name: 'Plugin Scenario',
  description: 'Tests plugin functionality',
  characters: [
    {
      id: 'char-id',
      name: 'Character Name',
      role: 'subject',
      plugins: ['plugin-name'],
    },
  ],
  script: {
    steps: [
      {
        id: 'step-1',
        type: 'message',
        fromCharacter: 'char-id',
        content: 'Test message',
      },
    ],
  },
  verification: {
    rules: [
      {
        id: 'verify-1',
        description: 'Verify something',
      },
    ],
  },
};
```

## Common Fixes

### 1. Environment Variables

Ensure required environment variables are set:

```bash
# .env file
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
```

### 2. Plugin Dependencies

Make sure all required plugins are installed:

```bash
pnpm install
pnpm build
```

### 3. Memory/Database Issues

If scenarios fail with database errors:

- Ensure PGLite is properly initialized
- Check that the test database directory is writable
- Clear test database if corrupted: `rm -rf .scenario-test-db`

### 4. Message Processing

If agents don't respond:

- Ensure bootstrap plugin is loaded
- Check that message handling plugins are initialized
- Verify the agent has appropriate LLM configuration

## Adding New Scenarios

### 1. Create Scenario File

Add to appropriate directory:

- Core scenarios: `packages/scenarios/src/`
- Plugin tests: `packages/scenarios/src/plugin-tests/`
- Rolodex: `packages/scenarios/src/rolodex/`

### 2. Export Scenario

Update the appropriate index file:

- `packages/scenarios/src/index.ts` for core scenarios
- `packages/scenarios/src/plugin-tests/index.ts` for plugin tests

### 3. Test Scenario

```bash
pnpm --filter @elizaos/scenarios build
pnpm elizaos scenario run --filter <your-scenario-name>
```

## Debugging Tips

1. **Use Verbose Mode**: Add `--verbose` to see detailed logs
2. **Check Transcripts**: Scenario results include full message transcripts
3. **Verify Plugin Loading**: Check that required plugins are loaded
4. **Environment Validation**: Use `pnpm elizaos scenario validate`
5. **Isolated Testing**: Test scenarios individually before bulk runs

## Next Steps

1. Fix remaining scenario failures by:

   - Ensuring all required plugins are available
   - Updating scenario definitions for API changes
   - Adding proper error handling

2. Improve scenario system:

   - Add parallel execution support
   - Implement better verification rules
   - Add performance benchmarking

3. Expand test coverage:
   - Add scenarios for new plugins
   - Test edge cases and error conditions
   - Add integration scenarios

## Troubleshooting

### "Module not found" Errors

- Run `pnpm build` in the root directory
- Ensure all packages are properly linked

### "Database type not set" Errors

- Make sure PGLite setup happens before any imports
- Check that @elizaos/plugin-sql exports setDatabaseType

### Agent Not Responding

- Verify LLM API keys are set
- Check that message handling plugins are loaded
- Ensure proper room/world setup in scenario

### Verification Failures

- Review verification criteria
- Check that expected behaviors match current implementation
- Update scenarios for API changes
