# @elizaos/plugin-pixocracy

A plugin for Eliza OS that enables integration with Pixocracy, allowing your agent to participate in conversations and interactions within the Pixocracy environment.

## Overview

This plugin provides an API interface that allows Pixocracy to communicate with your Eliza agent, enabling dynamic conversations and interactions based on environmental context and character traits.

## Features

- Express-based API endpoints for Pixocracy integration
- Context-aware dialogue generation
- Support for character traits and environmental awareness
- Automatic handling of conversation roles (initiator/responder)
- Health check endpoint

## Installation

```bash
pnpm install @elizaos/plugin-pixocracy
```

## Usage

### Plugin Registration

Add the plugin to your Eliza OS configuration:

```typescript
import { pixocracyPlugin } from "@elizaos/plugin-pixocracy";

const config = {
    plugins: [
        pixocracyPlugin,
    ],
};
```

In a character.json file, you need to add the following:
```json
"plugins": ["@elizaos/plugin-pixocracy"]
```

### API Endpoints

The plugin exposes the following endpoints:

#### Health Check
```http
GET /api/pixocracy/health
```
Returns the health status, Pixocracy will use this check to determine if your agent is online and ready to receive conversations.

#### Conversation
```http
POST /api/pixocracy/converse
```
Handles conversation requests from Pixocracy.

Response format:
```typescript
{
    success: boolean,
    data: {
        say: string | null,
        actions: string[] | null
    }
}
```

## Configuration

The plugin starts an Express server on port 3001 by default. You can customize the port by passing it to the PixocracyClient constructor:

```typescript
const client = new PixocracyClient(runtime, 4000); // Use port 4000 instead
```

## Example Response

When Pixocracy sends a conversation request, your agent will respond with dialogue and optional actions:

```json
{
    "success": true,
    "data": {
        "say": "Hello! Beautiful day for a walk in the park, isn't it?",
        "actions": ["wave", "smile"]
    }
}
```

## Environment Context

Your agent will receive contextual information about:
- The conversation role (initiator or responder)
- The other agent's information (name, personality, role)
- Environmental details (location, time, nearby entities)
- Previous messages (when responding)

This context helps generate appropriate and contextually relevant responses.

## Contributing

Contributions are welcome! Please ensure your changes maintain compatibility with the Pixocracy platform's expectations.

## License

This plugin is part of the Eliza project. See the main project repository for license information.