# @elizaos/plugin-anyone Documentation

## Overview
### Purpose
The @elizaos/plugin-anyone is designed to provide seamless management of integrated client services and proxy management within the context of a larger agent system. This plugin specifically focuses on facilitating connections and data flow through the Anyone Client and a robust proxy interface using the AnonSocksClient. It aims to streamline actions like starting and stopping these services, thus enhancing the agent's capability to interact with various external systems.

### Key Features
Management of Anyone Client instance,Proxy management using AnonSocksClient,Simplified start and stop actions for client and proxy services,Dynamic action validation and execution,Integration with Eliza's agent framework

## Installation
# Installation and Integration Instructions for @elizaos/plugin-anyone

## 1. Adding the Plugin to Your ElizaOS Project

1. Add the following to your agent/package.json dependencies:
   ```json
   {
     "dependencies": {
       "@elizaos/plugin-anyone": "workspace:*"
     }
   }
   ```
2. Navigate to the agent/ directory in your project.
3. Run `pnpm install` to install the new dependency.
4. Run `pnpm build` to build the project with the new plugin.

## 2. Importing and Using the Plugin

1. Import the plugin using: `import { anyonePlugin } from "@elizaos/plugin-anyone";`
2. Add the plugin to the AgentRuntime plugins array.

## 3. Integration Example

```typescript
import { anyonePlugin } from "@elizaos/plugin-anyone";

return new AgentRuntime({
    // other configuration...
    plugins: [
        anyonePlugin,
        // other plugins...
    ],
});
```

## 4. Verification Steps

Ensure successful integration by checking for ["✓ Registering action: START_ANYONE"] in the console.

Ensure that the dependencies and peer dependencies are correctly installed and updated in your project to avoid any potential issues during the installation and integration process.

## Configuration
# Configuration Documentation

### Environment Variables
No Environment Variables Found

## Features

### Actions
### START_ANYONE
Start the Anyone client and proxy service

#### Properties
- Name: START_ANYONE
- Similes: ANYONE

#### Handler
Starts the Anyone client and proxy service by initializing the services and sending a confirmation message.

#### Examples
- User: "Can you start Anyone for me?"
  - Agent: "I'll start Anyone right away"
- User: "Initialize the Anyone client please"
  - Agent: "Starting Anyone now"
- User: "I need to start using Anyone"
  - Agent: "I'll help you start Anyone"
- User: "Launch Anyone for me"
  - Agent: "I'll launch Anyone for you now"

### STOP_ANYONE
Stop the Anyone client and proxy service

#### Properties
- Name: STOP_ANYONE
- Similes: STOP_PROXY

#### Handler
The handler function stops the Anyone client and cleans up the proxy service.

#### Examples
- User: "Can you stop Anyone for me?"
  Agent: "I'll stop Anyone right away"
- User: "Please shut down Anyone"
  Agent: "Stopping Anyone now"
- User: "I need to stop using Anyone"
  Agent: "I'll help you stop Anyone"
- User: "Close Anyone for me"
  Agent: "I'll close Anyone for you now"



### Providers
No providers documentation available.

### Evaluators
No evaluators documentation available.

## Usage Examples
### services/AnyoneClientService.ts

### Common Use Cases
1. Fetching the AnyoneClient instance and using its methods:
```typescript
import { AnyoneClientService } from './services/AnyoneClientService';

const anyoneClientService = new AnyoneClientService();

const anonInstance = anyoneClientService.getInstance();
if (anonInstance) {
  // Use methods or properties of anonInstance
} else {
  console.log('Anon instance not found');
}
```

2. Stopping the current instance of AnyoneClient:
```typescript
import { AnyoneClientService } from './services/AnyoneClientService';

const anyoneClientService = new AnyoneClientService();

anyoneClientService.stop().then(() => {
  console.log('AnyoneClient instance stopped successfully');
}).catch((error) => {
  console.error('Error stopping anyoneClient instance:', error);
});
```

### Best Practices
- Always check if the instance of AnyoneClient exists before attempting to use its methods to avoid runtime errors.
- Handle promise rejections appropriately when calling methods like `initialize` or `stop` to ensure proper error handling.

### services/AnyoneProxyService.ts

### Common Use Cases
1. Using the AnyoneProxyService to initialize a proxy for making requests:
```typescript
const proxyService = AnyoneProxyService.getInstance();
proxyService.initialize().then(() => {
    // Proxy is now initialized, make requests using the proxy
});
```

2. Restoring original axios configuration and bindings after using the proxy:
```typescript
const proxyService = AnyoneProxyService.getInstance();
// Use the proxy for requests
proxyService.cleanup();
// Original axios configuration and bindings are restored
```

### Best Practices
- Ensure to call `initialize()` before making any requests using the proxy to ensure that the proxy is properly set up.
- Remember to call `cleanup()` when done using the proxy to restore original axios configuration and bindings.

### actions/startAnyone.ts

### Common Use Cases
1. Start a new task or process for any user who triggers a specific action within an application. For example, starting a new workflow process when a user adds a new item to a shopping cart.

```typescript
import { startAnyone } from './actions/startAnyone';

const user = 'JohnDoe';
const action = 'add-to-cart';

startAnyone(user, action);
```

2. Send a notification or email to multiple users when a specific event occurs. For example, notifying all team members when a new task is assigned in a project management tool.

```typescript
import { startAnyone } from './actions/startAnyone';

const users = ['Alice', 'Bob', 'Eve'];
const action = 'new-task-assigned';

users.forEach(user => {
  startAnyone(user, action);
});
```

### Best Practices
- Ensure that the `startAnyone` function is only called for necessary actions and users, as triggering irrelevant processes can lead to unnecessary resource consumption.
- Use proper error handling mechanisms in the `startAnyone` function to gracefully handle any issues that may arise during the execution of the action.

### actions/stopAnyone.ts

### Common Use Cases
1. Stop any user from performing a certain action.
```typescript
import { stopAnyone } from 'actions/stopAnyone';

const isUserAdmin = false;

if (!isUserAdmin) {
  stopAnyone('User does not have admin privileges');
}
```

2. Prevent unauthorized users from accessing restricted features.
```typescript
import { stopAnyone } from 'actions/stopAnyone';

const isLoggedIn = false;

if (!isLoggedIn) {
  stopAnyone('User is not logged in');
}
```

### Best Practices
- Ensure to provide a clear and concise message when calling the `stopAnyone` function to inform users why the action was stopped.
- Use the `stopAnyone` function sparingly and only for critical actions that require immediate termination to avoid confusing users.

## FAQ
### Q: What is the primary function of the AnyoneClientService?
The AnyoneClientService manages the lifecycle and operations of the AnyoneClient instance, ensuring it integrates smoothly with other systems and services.

### Q: How does the AnyoneProxyService enhance network communications?
AnyoneProxyService uses the AnonSocksClient to create a reliable proxy interface, allowing secure and efficient data exchange between agent systems and external networks.

### Q: Can actions like START_ANYONE be customized?
Yes, actions can be tailored by defining specific validation and handling logic in their respective functions, allowing customization according to your project's requirements.

### Q: Is it possible to extend the functionality of these services?
Yes, extending the services can be achieved by sub-classing existing classes or modifying the handler functions to introduce new behavior or integrate additional services.

### Q: How do I start the Anyone client and proxy service?
You can initiate the start process by calling the handler function within the startAnyone action, ensuring prior validation of the action context using its validate function.

### Q: My action is registered, but the agent is not calling it
Ensure that action's name clearly aligns with the task and ensure you give a detailed description of the conditions that should trigger the action.

## Development

### TODO Items
No TODO items found.

## Troubleshooting Guide
### Proxy service fails to start
- Cause: Possible misconfiguration of the AnonSocksClient settings
- Solution: Review the proxy configuration settings and ensure they are correctly defined according to your network requirements.

### Action validation failing
- Cause: Errors in validation logic or inappropriate conditions
- Solution: Inspect the validate function of the action to ensure logical correctness and adjust conditions suitably.

### Debugging Tips
- Enable detailed logging for proxy and client actions to track operation flow.
- Use console output to debug step-by-step processing within action handlers.
- Validate input parameters and configuration settings before running services.