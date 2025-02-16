---
sidebar_position: 6
---

# ⚡ Actions

Actions define how agents respond to and interact with messages. They enable agents to perform tasks beyond simple message responses by integrating with external systems and modifying behavior.

## Overview

1. Structure:

An Action consists of:

- `name`: Unique identifier 
- `similes`: Alternative names/triggers
- `description`: Purpose and usage explanation
- `validate`: Function to check if action is appropriate
- `handler`: Core implementation logic
- `examples`: Sample usage patterns
- `suppressInitialMessage`: Optional flag to suppress initial response


2. Validation:

- Checks if the action can be executed
- Consider conversation state
- Validate required 

---

## Implementation

```typescript
interface Action {
    name: string;
    similes: string[];
    description: string;
    examples: ActionExample[][];
    handler: Handler;
    validate: Validator;
    suppressInitialMessage?: boolean;
}
```

Source: https://github.com/elizaOS/eliza/blob/main/packages/core/src/types.ts


### Basic Action Template

```typescript
const customAction: Action = {
    name: "CUSTOM_ACTION",
    similes: ["ALTERNATE_NAME", "OTHER_TRIGGER"],
    description: "Detailed description of when and how to use this action",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Validation logic
        return true;
    },
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        // Implementation logic
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Trigger message" },
            },
            {
                user: "{{user2}}",
                content: { text: "Response", action: "CUSTOM_ACTION" },
            },
        ],
    ],
};
```

#### Character File Example

Actions can be used in character files as well. Here's an example from: https://github.com/elizaOS/characters/blob/main/sbf.character.json

```json
    "messageExamples": [
        [
            {
                "user": "{{user1}}",
                "content": {
                    "text": "Can you help transfer some SOL?"
                }
            },
            {
                "user": "SBF",
                "content": {
                    "text": "yeah yeah for sure, sending SOL is pretty straightforward. just need the recipient and amount. everything else is basically fine, trust me.",
                    "action": "SEND_SOL"
                }
            }
        ],
```

---

## Example Implementations

Actions can be found across various plugins in the Eliza ecosystem, with a comprehensive collection available at https://github.com/elizaos-plugins. Here are some notable examples:

### Blockchain and Token Actions
- **Transfer**: Move tokens across different blockchain networks (AVAIL, MultiversX)
- **READ_CONTRACT**: Read blockchain contract states
- **WRITE_CONTRACT**: Modify blockchain contract states
- **ERC20_TRANSFER**: Transfer ERC20 tokens
- **GET_QUOTE_0X**: Retrieve token swap quotes
- **EXECUTE_SWAP_0X**: Execute token swaps

### Cryptographic and Security Actions
- **ECDSA_SIGN**: Perform ECDSA digital signatures
- **LIT_ACTION**: Deploy decentralized JavaScript functions
- **SUBMIT_DATA**: Submit data to decentralized storage networks

### AI and Agent Management Actions
- **LAUNCH_AGENT**: Create and deploy new agents
- **GET_AI_IMAGE**: Analyze images for AI generation
- **DEPIN_PROJECTS**: Interact with and analyze decentralized infrastructure projects

### Specialized Plugin Actions
- **CREATE_RESOURCE**: Manage generic resources
- **AUTHENTICATE**: Blockchain and web3 authentication
- **STAKING**: Manage staking operations
- **BRIDGE_OPERATIONS**: Cross-chain token bridging


Here's a comprehensive example of an image generation action:

```typescript
import { Action, IAgentRuntime, Memory, State } from "@elizaos/core";

// Example image generation action
const generateImageAction: Action = {
    name: "GENERATE_IMAGE", 
    similes: ["CREATE_IMAGE", "MAKE_IMAGE", "DRAW"],
    description: "Generates an image based on the user's description",
    suppressInitialMessage: true, // Suppress initial response since we'll generate our own

    // Validate if this action should be used
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = message.content.text.toLowerCase();
        // Check if message contains image generation triggers
        return (
            text.includes("generate") ||
            text.includes("create") ||
            text.includes("draw") ||
            text.includes("make an image")
        );
    },

    // Handle the action execution
    handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        try {
            // Get image service
            const imageService = runtime.getService(ServiceType.IMAGE_GENERATION);
            
            // Generate image
            const imageUrl = await imageService.generateImage(message.content.text);

            // Create response with generated image
            await runtime.messageManager.createMemory({
                id: generateId(),
                content: {
                    text: "Here's the image I generated:",
                    attachments: [{
                        type: "image",
                        url: imageUrl
                    }]
                },
                userId: runtime.agentId,
                roomId: message.roomId,
            });

            return true;
        } catch (error) {
            console.error("Image generation failed:", error);
            return false;
        }
    },

    // Example usage patterns
    examples: [
        [
            {
                user: "{{user1}}",
                content: { 
                    text: "Can you generate an image of a sunset?" 
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll create that image for you",
                    action: "GENERATE_IMAGE"
                }
            }
        ]
    ]
};
```

### Basic Conversation Actions

You can find these samples in the plugin-bootstrap package: https://github.com/elizaOS/eliza/tree/main/packages/plugin-bootstrap/src/actions

#### CONTINUE

For continuing conversations:

```typescript
const continueAction: Action = {
    name: "CONTINUE",
    similes: ["ELABORATE", "GO_ON"],
    description: "Continues the conversation when appropriate",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Check if message warrants continuation
        const text = message.content.text.toLowerCase();
        return (
            text.includes("tell me more") ||
            text.includes("what else") ||
            text.includes("continue") ||
            text.endsWith("?")
        );
    },

    handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        // Get recent conversation context
        const recentMessages = await runtime.messageManager.getMemories({
            roomId: message.roomId,
            count: 5
        });

        // Generate contextual response
        const response = await runtime.generateResponse(
            message,
            recentMessages,
            state
        );

        // Store response
        await runtime.messageManager.createMemory({
            id: generateId(),
            content: response,
            userId: runtime.agentId,
            roomId: message.roomId
        });

        return true;
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Tell me more about that" }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll continue explaining...",
                    action: "CONTINUE"
                }
            }
        ]
    ]
};
```

#### IGNORE 

For ending conversations:

```typescript
const ignoreAction: Action = {
    name: "IGNORE",
    similes: ["STOP_TALKING", "END_CONVERSATION"],
    description: "Stops responding when conversation is complete or irrelevant",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = message.content.text.toLowerCase();
        return (
            text.includes("goodbye") ||
            text.includes("bye") ||
            text.includes("thanks") ||
            text.length < 2
        );
    },

    handler: async (runtime: IAgentRuntime, message: Memory) => {
        // No response needed
        return true;
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Thanks, goodbye!" }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "",
                    action: "IGNORE"
                }
            }
        ]
    ]
};
```

---

## FAQ

### What are Actions in Eliza?
Actions are core building blocks that define how agents interact with messages and perform tasks beyond simple text responses.

### How do Actions work?
Actions consist of a name, description, validation function, and handler function that determine when and how an agent can perform a specific task.

### What can Actions do?
Actions enable agents to interact with external systems, modify behavior, process complex workflows, and extend capabilities beyond conversational responses.

### What are some example Actions?
Common actions include CONTINUE (extend dialogue), IGNORE (end conversation), GENERATE_IMAGE (create images), TRANSFER (move tokens), and READ_CONTRACT (retrieve blockchain data).

### How do I create a custom Action?
Define an action with a unique name, validation function to check eligibility, handler function to implement the logic, and provide usage examples.

### What makes a good Action?
A good action has a clear, single purpose, robust input validation, comprehensive error handling, and provides meaningful interactions.

### Can Actions be chained together?
Yes, actions can be composed and chained to create complex workflows and multi-step interactions.

### How are Actions different from tools?
Actions are more comprehensive, ensuring the entire process happens, while tools are typically more focused on specific, discrete operations.

### Where are Actions defined?
Actions can be defined in character files, plugins, or directly in agent configurations.

## Further Reading

- [characterfile](./characterfile.md)
- [providers](./providers.md)
- [Advanced Actions](../advanced/advanced-actions.md)