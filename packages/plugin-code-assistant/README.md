# Code Assistant Plugin

This plugin provides code assistance functionality for Shaiw, alter ego of Shaw, split into two main components:

## Actions

### Code Assistant (codeAssistant.ts)

- Handles general code-related queries
- Performs vector search on documentation
- Delegates GitHub-specific queries to GitHub Action

### GitHub Assistant (githubActions.ts)

- Performs vector search on documentation from github docs site
- Handles all GitHub-related queries
- Manages GitHub API interactions
- Processes PRs and Issues
- Includes timeout and retry logic

## Installation

1. Adjust the `shaiw.character.json` in `characters` folder to your liking

2. update .env with your:

- ANTHROPIC_API_KEY
- GITHUB_TOKEN
- DISCORD_APPLICATION_ID
- DISCORD_API_TOKEN

3. Standard install and build:

```
pnpm clean && pnpm install && pnpm build
```

4. Run the plugin:

```
pnpm start --characters characters/shaiw.character.json
```

5. Run the plugin (with new database)

```
pnpm cleanstart --characters characters/shaiw.character.json
```

6. Run the plugin (with new database and in debug mode)

```
pnpm cleanstart:debug --characters characters/shaiw.character.json
```

## Usage

The plugin automatically routes queries to the appropriate action handler:

1. GitHub-related queries are handled by githubAction
2. General code queries are handled by codeAssistantAction and default runtime for processing
3. All responses are saved to memory for future reference

## Error Handling

- Includes timeout protection
- Maximum retry attempts for LLM
- Fallback to knowledge search when GitHub data is unavailable

## Services

- Responds to user queries
- Handles user requests for code assistance
- Handles user requests for documentation from github docs site
- Has a slight sense of humor
- Has been trained on Shaw's recent videos and interviews
- On load, crawls the github docs site and store the results in a vector database

## Considerations

- The plugin was built with sqlite, for production, switch to a more robust database like postgres
- Requires above environment variables to be set in .env

## Todos

- Look into using Claude to search the github issues and pull requests, dynamically, but not sure if it's worth it, cost wise.
- Help user create a github issue or pull request and use client-github to create it for them, after gathering all the information from the user.
- Sleep

## Author

[harperaa](https://github.com/harperaa)
