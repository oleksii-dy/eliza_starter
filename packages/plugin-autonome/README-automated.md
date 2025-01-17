# @elizaos/plugin-autonome Documentation

## Overview
### Purpose
The @elizaos/plugin-autonome package provides a robust framework that empowers autonomous agents to effectively interact with various external systems and contexts. It is designed to enhance the functionality of ElizaOS agents by integrating core components like Providers, Actions, and Evaluators. Providers inject real-time, dynamic data into agent interactions, enabling access to important information streams. Actions define agent responses and interactions, bridging the gap between internal logic and external operations. Evaluators help in assessing and extracting valuable information from conversations, ensuring the agents maintain a rich and evolving understanding over time.

### Key Features
Integration of dynamic context and real-time data via Providers,Action-based interaction with external systems,Evaluation of conversations to build memory and extract insights,Scale actions using similes for similar commands,Support for launching agents with custom configurations

## Installation
## Installation and Integration Instructions for @elizaos/plugin-autonome

### 1. Add the plugin to your ElizaOS project:
- Add the following to your agent/package.json dependencies:
  ```json
  {
    "dependencies": {
      "@elizaos/plugin-autonome": "workspace:*"
    }
  }
  ```
- To install the new dependency:
  1. cd into the agent/ directory
  2. Run `pnpm install`
  3. Run `pnpm build`

### 2. Importing and Using the Plugin:
- Import the plugin using:
  ```typescript
  import { autonomePlugin } from "@elizaos/plugin-autonome";
  ```
- Add it to the AgentRuntime plugins array.

### 3. Integration Example:
```typescript
import { autonomePlugin } from "@elizaos/plugin-autonome";

return new AgentRuntime({
    // other configuration...
    plugins: [
        autonomePlugin,
        // other plugins...
    ],
});
```

### 4. Verification Steps:
- Ensure you see ["✓ Registering action: LAUNCH_AGENT"] in the console after integration.

Make sure to follow these steps carefully for successful installation and integration of the @elizaos/plugin-autonome plugin.

## Configuration
# Configuration Documentation

## Required Environment Variables
1. **AUTONOME_JWT_TOKEN**: Used to store the Autonome JWT token.
2. **AUTONOME_RPC**: Used for Autonome RPC communication.

## Sample .env File
```plaintext
AUTONOME_JWT_TOKEN=your_jwt_token_here
AUTONOME_RPC=your_rpc_value_here
```

Configuration should be done in the .env file. Make sure to add the .env file to .gitignore to avoid committing sensitive information to the repository.

## Features

### Actions
### LAUNCH_AGENT
Launch an Eliza agent

#### Properties
- Name: LAUNCH_AGENT
- Similes: CREATE_AGENT, DEPLOY_AGENT, DEPLOY_ELIZA, DEPLOY_BOT

#### Handler
The handler function for LAUNCH_AGENT validates the message, composes launch context, generates launch content, makes a POST request to launch the agent using Autonome RPC, and handles success or error responses.

#### Examples
- User: "Launch an agent, name is xiaohuo"
- Agent: "I'll launch the agent now..."
- Agent: "Successfully launch agent, id is ba2e8369-e256-4a0d-9f90-9c64e306dc9f"



### Providers
No providers documentation available.

### Evaluators
No evaluators documentation available.

## Usage Examples
### actions/launchAgent.ts

### Common Use Cases
1. Using the `isLaunchAgentContent` function to check if a given content is of type `LaunchAgentContent` before further processing.

```typescript
import { isLaunchAgentContent } from './actions/launchAgent';

const content = { 
  title: "Sample Launch Agent", 
  description: "This is a sample launch agent content." 
};

if(isLaunchAgentContent(content)) {
  // Process the content as LaunchAgentContent
} else {
  console.log("The content is not of type LaunchAgentContent");
}
```

2. Implementing a function that creates a new launch agent content with specific properties.

```typescript
import { LaunchAgentContent } from './actions/launchAgent';

function createLaunchAgentContent(title: string, description: string): LaunchAgentContent {
  return { title, description };
}

const newLaunchAgentContent = createLaunchAgentContent("New Launch Agent", "This is a new launch agent content.");
console.log(newLaunchAgentContent);
```

### Best Practices
- It is recommended to always use the `isLaunchAgentContent` function to validate content before processing to prevent unexpected errors.
- When creating new launch agent content, adhere to the structure defined in `LaunchAgentContent` interface to maintain consistency in the application.

## FAQ
### Q: Can the plugin support integration with third-party systems?
Yes, the @elizaos/plugin-autonome can be configured to integrate with various third-party systems through its Providers, which are designed to fetch and inject data from external sources directly into agent interactions.

### Q: How can I extend or add new actions to the plugin?
To extend the plugin with new actions, you need to define an Action with a unique name, provide similes for the action, describe the purpose, implement a validation function to check applicability, and write a handler function to execute the action's logic.

### Q: How do Evaluators manage conversation data?
Evaluators in the plugin autonomously extract insights, facts, and build long-term memory from conversations. They help maintain context during interactions and track progress towards preset goals, ensuring the agent's responses evolve over time.

### Q: Can I customize the way data is presented by providers?
Yes, Providers allow for customization in data formatting to align with conversation templates. This ensures that the data is presented cohesively within dialogues, maintaining a consistent flow of information.

### Q: My action is registered, but the agent is not calling it.
Ensure that action's name clearly aligns with the task, and ensure you give a detailed description of the conditions that should trigger the action.

### Q: What is the purpose of the isLaunchAgentContent function?
The isLaunchAgentContent function checks whether a given piece of content conforms to the LaunchAgentContent interface, ensuring type safety and correctness when dealing with launch agent configurations.

## Development

### TODO Items
No TODO items found.

## Troubleshooting Guide
### Provider fails to fetch accurate data
- Cause: Misconfiguration or network issues
- Solution: Verify that the Provider configuration is correct and that there are no network connectivity problems. Ensure the API endpoints are reachable and responses are properly formatted.

### Actions not triggering correctly
- Cause: Incorrect action name or missing description
- Solution: Ensure action names are unique and clearly defined. Check that the action descriptions accurately describe trigger conditions and are integrated into the agent flow correctly.

### Debugging Tips
- Use logging extensively to track the flow of data through Providers and Actions.
- Ensure agent runtime is being updated with the latest Evaluators for consistent assessment behavior.
- Double-check network configurations for Providers to ensure they can access external data sources.
