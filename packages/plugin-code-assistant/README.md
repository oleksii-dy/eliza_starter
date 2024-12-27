# Code Assistant Plugin

This plugin provides code assistance functionality for Eliza, split into two main components:

## Actions

### Code Assistant (codeAssistant.ts)

- Handles general code-related queries
- Performs vector search on documentation
- Delegates GitHub-specific queries to GitHub Action

### GitHub Assistant (githubActions.ts)

- Handles all GitHub-related queries
- Manages GitHub API interactions
- Processes PRs and Issues
- Includes timeout and retry logic

## Usage

The plugin automatically routes queries to the appropriate handler:

1. GitHub-related queries are handled by githubAction
2. General code queries are handled by codeAssistantAction
3. All responses are saved to memory for future reference

## Error Handling

- Includes timeout protection
- Maximum retry attempts for LLM
- Fallback to knowledge search when GitHub data is unavailable
