# @elizaos/plugin-0g Documentation

## Overview
### Purpose
The @elizaos/plugin-0g serves as an integral component in the Eliza ecosystem, providing critical functionality for handling upload content via the 0G protocol. It is designed to seamlessly integrate with the agent runtime, allowing agents to perform complex tasks involving file uploads while ensuring compatibility and dynamic information exchange with other modules. This plugin specifically targets scenarios where file uploading is crucial, enabling agents to manage, validate, and execute upload actions effectively.

### Key Features
Support for the 0G protocol to handle data uploads,Integration with the Eliza agent runtime,Validation and handling of file upload actions,Dynamic content checks to ensure proper content uploads,Support for diverse example usage patterns for uploading content

## Installation
## Installation and Integration Instructions for @elizaos/plugin-0g

### 1. Adding the plugin to your ElizaOS project:
- Add the following to your agent/package.json dependencies:
  ```json
  {
    "dependencies": {
      "@elizaos/plugin-0g": "workspace:*"
    }
  }
  ```
- cd into the agent/ directory
- Run `pnpm install` to install the new dependency
- Run `pnpm build` to build the project with the new plugin

### 2. Importing and using the plugin:
- Import the plugin using: `import { zgPlugin } from "@elizaos/plugin-0g";`
- Add it to the AgentRuntime plugins array in your code

### 3. Integration example:
```typescript
import { zgPlugin } from "@elizaos/plugin-0g";

return new AgentRuntime({
    // other configuration...
    plugins: [
        zgPlugin,
        // other plugins...
    ],
});
```

### 4. Verification steps:
Ensure you see ["✓ Registering action: ZG_UPLOAD"] in the console to verify successful integration.
  

## Configuration
# Configuration Documentation

### Required Environment Variables:
1. **ZEROG_INDEXER_RPC**: Used to specify the URL for the ZeroG Indexer RPC.
2. **ZEROG_EVM_RPC**: Used to specify the URL for the ZeroG EVM RPC.
3. **ZEROG_PRIVATE_KEY**: Used to specify the private key for ZeroG operations.
4. **ZEROG_FLOW_ADDRESS**: Used to specify the flow address for ZeroG transactions.

### Example .env File:
```env
ZEROG_INDEXER_RPC=https://example-indexer-rpc.com
ZEROG_EVM_RPC=https://example-evm-rpc.com
ZEROG_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
ZEROG_FLOW_ADDRESS=YOUR_FLOW_ADDRESS_HERE
```

### Note:
Make sure to configure the above environment variables in the .env file. Additionally, ensure that the .env file is added to the .gitignore file to avoid committing sensitive information to the repository.

## Features

### Actions
### ZG_UPLOAD
Store data using 0G protocol

#### Properties
- Name: ZG_UPLOAD
- Similes: 
  - UPLOAD_FILE_TO_ZG
  - STORE_FILE_ON_ZG
  - SAVE_FILE_TO_ZG
  - UPLOAD_TO_ZERO_GRAVITY
  - STORE_ON_ZERO_GRAVITY
  - SHARE_FILE_ON_ZG
  - PUBLISH_FILE_TO_ZG

#### Handler
The handler function for ZG_UPLOAD action stores data using the 0G protocol. It validates the required settings, composes the upload context, generates the upload content, validates the content, and then uploads the file to the Zero Gravity protocol.

#### Examples
- User: "Agent", Content: { text: "upload my resume.pdf file", action: "ZG_UPLOAD" }
- User: "Agent", Content: { text: "can you help me upload this document.docx?", action: "ZG_UPLOAD" }
- User: "Agent", Content: { text: "I need to upload an image file image.png", action: "ZG_UPLOAD" }



### Providers
No providers documentation available.

### Evaluators
No evaluators documentation available.

## Usage Examples
### actions/upload.ts

### Common Use Cases
1. **Upload Files**: Use the code to check if a given content object is an UploadContent object, and if it is, perform actions such as uploading the file to a server.

```typescript
import { isUploadContent } from './actions/upload';

const content = {
  filePath: '/path/to/file.txt'
};

if (isUploadContent(content)) {
  // Perform file upload logic
  console.log('Uploading file:', content.filePath);
} else {
  console.log('Content is not for upload');
}
```

2. **Content Validation**: Use the code to validate if a given content object is an UploadContent object before processing it further.

```typescript
import { isUploadContent } from './actions/upload';

const content = {
  filePath: '/path/to/invalid/file.exe'
};

if (isUploadContent(content)) {
  // Process the upload content
} else {
  console.log('Invalid content for upload');
}
```

### Best Practices
- **Consistent Validation**: Always use the `isUploadContent` function to ensure that the content object being processed is intended for upload.
- **Error Handling**: Properly handle cases where the content is not an UploadContent object to prevent unexpected behavior in the application.

## FAQ
### Q: What is the purpose of the zgUpload action?
The zgUpload action is designed to facilitate data upload operations using the 0G protocol. It includes a well-defined structure with properties such as name, similes, description, validate, and handler, making it versatile and robust for executing upload tasks.

### Q: My action is registered, but the agent is not calling it.
Ensure that the action's name clearly aligns with the task, and ensure you provide a detailed description of the conditions that should trigger the action. Additionally, verify that the action is correctly integrated and recognized by the agent runtime.

### Q: How can I extend the functionality of the zgUpload action?
To extend the zgUpload action, you can modify its handler or validate functions to include additional checks or transformations according to your specific needs. Make sure any extensions maintain compatibility with the overall agent runtime and other interacting modules.

### Q: Can the isUploadContent function handle all types of content?
The isUploadContent function is specifically tailored to identify if a given content object is an UploadContent object. If the content matches the UploadContent interface, it will return true. Ensure that the content to be checked adheres to the expected structure defined by UploadContent.

### Q: How do I ensure that my upload content is formatted correctly?
Ensure that your upload content adheres to the UploadContent interface requirements, particularly the filePath property. Implementing rigorous validation checks via the validate function in the zgUpload action can also help in maintaining correct formatting.

### Q: What are the key components required for integrating providers with an agent?
Integrating providers with an agent involves ensuring that the provider can supply dynamic contextual information, integrate with the agent runtime, format information for conversation templates, and maintain consistent data access to serve the agent's objectives effectively.

## Development

### TODO Items
No TODO items found.

## Troubleshooting Guide
### The upload action does not execute correctly.
- Cause: Possible misalignment in the action's validation criteria or incorrect handler implementation.
- Solution: Review the validation logic and handler functionality to ensure they align with the intended uploading tasks and 0G protocol requirements.

### UploadContent objects are not being recognized.
- Cause: Content may not conform to the specified UploadContent interface.
- Solution: Check that content objects include the filePath property and any other required attributes. Adjust the isUploadContent function accordingly to improve content recognition.

### Debugging Tips
- Log detailed information for each step during the uploading process to identify where things might go wrong.
- Use unit tests to validate the behavior of the isUploadContent function and zgUpload action components.
- Check action registration and ensure alignment with similes and descriptions to improve triggering accuracy.
