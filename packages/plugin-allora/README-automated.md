# @elizaos/plugin-allora Documentation

## Overview
### Purpose
The @elizaos/plugin-allora serves as a sophisticated interface for integrating dynamic context and real-time information into agent interactions via the Allora API. It facilitates the provision of topics to enrich conversational intelligence, allowing agents to access, process, and convey nuanced information efficiently.

### Key Features
Fetches topics dynamically from the Allora API using the TopicsProvider class.,Supports inference operations to acquire insights from Allora Network using the getInferenceAction variable.,Enables flexible configuration of topics via the InferenceFields interface which accommodates null defaults.,Ensures seamless integration with the agent runtime for enhanced contextual formatting.

## Installation
## Installation and Integration Instructions for @elizaos/plugin-allora

### 1. Adding the Plugin to Your ElizaOS Project:
- Add the following to your agent/package.json dependencies:
  ```json
  {
    "dependencies": {
      "@elizaos/plugin-allora": "workspace:*"
    }
  }
  ```
- Run the following commands in the terminal:
  1. `cd agent/` - navigate to the agent directory
  2. `pnpm install` - install the new dependency
  3. `pnpm build` - build the project with the new plugin

### 2. Importing and Using the Plugin:
- Import the plugin using:
  ```typescript
  import { alloraPlugin } from "@elizaos/plugin-allora";
  ```
- Add the plugin to the AgentRuntime plugins array.

### 3. Integration Example:
```typescript
import { alloraPlugin } from "@elizaos/plugin-allora";

return new AgentRuntime({
    // other configuration...
    plugins: [
        alloraPlugin,
        // other plugins...
    ],
});
```

### 4. Verification Steps:
- Ensure you see ["✓ Registering action: GET_INFERENCE"] in the console to verify successful integration.

### Important Notes:
- Make sure to have the plugin dependencies listed in the package.json file.
- This plugin is designed as a workspace package and needs to be added to the agent/package.json before building the project.

## Configuration
## Configuration Documentation

### Required Environment Variables
- This code does not require any Environment Variables

## Features

### Actions
### GET_INFERENCE
Get inference from Allora Network

#### Properties
- Name: GET_INFERENCE
- Similes:
  - GET_ALLORA_INFERENCE
  - GET_TOPIC_INFERENCE
  - ALLORA_INFERENCE
  - TOPIC_INFERENCE

#### Handler
The handler for GET_INFERENCE action retrieves inference data from the Allora Network based on a specific topic ID. It makes a request to the Allora API, fetches the inference data, and returns it to the user.

#### Examples
- User: "What is the predicted ETH price in 5 minutes?"
- Agent: "I'll get the inference now..." (Action: GET_INFERENCE)
- Agent: "Inference provided by Allora Network on topic ETH 5min Prediction (ID: 13): 3393.364326646801085508"

- User: "What is the predicted price of gold in 24 hours?"
- Agent: "I'll get the inference now..." (Action: GET_INFERENCE)
- Agent: "There is no active Allora Network topic that matches your request."



### Providers
### TopicsProvider
This provider is responsible for retrieving and formatting Allora Network topics.

#### Methods
The `get()` method in the TopicsProvider class is used to fetch all the Allora topics and format them into a string to be added to the prompt context. It retrieves the topics either from the cache or the Allora API based on whether they are already cached. If not cached, it makes a call to the Allora API to retrieve the topics and then caches them for future use. The method returns the formatted string of Allora topics.



### Evaluators
No evaluators documentation available.

## Usage Examples
### providers/topics.ts

### Common Use Cases
1. Fetching all Allora topics and displaying them in a chatbot interface:
```typescript
const topicsProvider = new TopicsProvider();
const allTopics = await topicsProvider.getAlloraTopics(runtime);

// Display topics in chatbot interface
// Example: for topic in allTopics, show topic.name
```

2. Checking for updated topics and refreshing the cache:
```typescript
const topicsProvider = new TopicsProvider();
const updatedTopics = await topicsProvider.get(runtime, _message, _state);

// Check for any changes in topics and refresh cache if necessary
```

### Best Practices
- Ensure to handle any errors that may occur during topic retrieval.
- Implement caching mechanisms to reduce unnecessary API calls and improve performance.

### actions/getInference.ts

### Common Use Cases
1. Get inference details by topic ID:
```typescript
getInference({ topicId: 123, topicName: null });
```

2. Get all inferences for a specific topic name:
```typescript
getInference({ topicId: null, topicName: "Technology" });
```

### Best Practices
- Ensure to handle cases where the topic ID or topic name is null to avoid unexpected behavior.
- Use TypeScript to define the type of parameters passed to the `getInference` function for better type safety.

## FAQ
### Q: My action is registered, but the agent is not calling it
Ensure that the action's name clearly aligns with the task, and provide a detailed description of the conditions that should trigger the action.

### Q: Can the getInferenceAction perform complex reasoning tasks?
Enhancing the complexity involves extending its handler to integrate with more sophisticated reasoning engines or APIs.

### Q: How can I extend the TopicsProvider to include more data points?
The TopicsProvider can be extended by modifying its implementation to fetch additional data points from the Allora API. Ensure the API provides the required information and adjust the interface accordingly.

### Q: How do I format conversation templates with dynamic topics?
Integrate the TopicsProvider within your agent runtime to supply dynamic topics. Use these topics in your templates to format conversations based on real-time available data.

### Q: Can I integrate the TopicsProvider with other APIs?
Yes, while the TopicsProvider is designed for the Allora API, you can modify its implementation to fetch information from additional or alternative APIs to meet your integration needs.

### Q: How can I configure the default values in InferenceFields?
InferenceFields allows configuration by directly setting the topicId and topicName properties to non-null default values or by implementing logic to populate them when null.

## Development

### TODO Items
No TODO items found.

## Troubleshooting Guide
### Topics are not updating dynamically within agent interactions
- Cause: API connectivity issues or misconfiguration within the TopicsProvider
- Solution: Verify API endpoint configurations and check network status to ensure connectivity. Review the implementation of the TopicsProvider for any logical errors.

### Inference action returns incomplete results
- Cause: The query may not be fully aligned with the expected format or the underlying data source may lack required information.
- Solution: Ensure queries are properly formatted and check the data availability within the Allora Network.

### Debugging Tips
- Enable detailed logging within the TopicsProvider and getInferenceAction to trace data flow.
- Use unit tests to verify each component and interface independently.
- Check API request and response formats to ensure they align with expected structures.
- Review any agent interaction templates to ensure proper dynamic data placeholders are utilized.