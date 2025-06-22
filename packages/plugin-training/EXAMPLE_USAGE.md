# ElizaOS Training System - Example Usage

This document provides practical examples of how to use the comprehensive training system.

## Quick Setup Example

### 1. Character Configuration

```typescript
// character.json or character.ts
{
  "name": "TrainingBot",
  "bio": ["AI agent for training ElizaOS models"],
  "system": "You are an expert at training and fine-tuning ElizaOS models.",
  "plugins": [
    "@elizaos/plugin-training/comprehensive"
  ]
}
```

### 2. Environment Configuration

```bash
# .env file
OPENAI_API_KEY=sk-your-openai-key-here
TOGETHER_API_KEY=your-together-ai-key-here
GITHUB_TOKEN=ghp_your-github-token-here  # Optional but recommended

# Auto-coder integration
ELIZAOS_FINETUNED_MODEL=ft-your-model-id  # Set after training
REASONING_PROXY_ENABLED=true
REASONING_TEMPERATURE=0.1
REASONING_MAX_TOKENS=4000
```

### 3. Start ElizaOS

```bash
elizaos start --character ./character.json
```

## Complete Training Workflow

### Step 1: Generate Training Data

**Simple Generation:**
```
User: Generate training data for ElizaOS
```

**Advanced Generation:**
```
User: Generate training data with workspace ./my-workspace output ./my-output max scenarios 1000 include tests temperature 0.7 cleanup
```

**Expected Output:**
```
🚀 Starting comprehensive training data generation for ElizaOS...

Configuration:
- Workspace: ./my-workspace
- Output: ./my-output
- Max scenarios per plugin: 100
- Max scenarios for core: 1000
- Include complex files: true

This will:
1. Clone ElizaOS core repository
2. Discover and clone all plugin repositories
3. Extract and analyze all code files
4. Generate realistic user scenarios
5. Create detailed thinking processes
6. Export training data in Together.ai format

📊 Progress Update: Repository Cloning
20/100 (20%)
Cloning ElizaOS repositories...

📊 Progress Update: File Extraction
40/100 (40%)
Extracting and analyzing files...

📊 Progress Update: Core Scenarios
60/100 (60%)
Generating core framework scenarios...

📊 Progress Update: Plugin Scenarios
80/100 (80%)
Generating plugin scenarios...

🎉 Training data generation completed successfully!

📊 Generation Summary:
• Total Scenarios: 1,247
  - Core Framework: 523
  - Plugins: 681
  - Documentation: 43

• Token Count: 2.8M tokens
• Processing Time: 14m 52s

📁 Output files:
- ./my-output/together-ai-training.jsonl
- ./my-output/training-scenarios.json
- ./my-output/generation-statistics.json
```

### Step 2: Train Your Model

**Basic Training:**
```
User: Train a model using the generated training data
```

**Advanced Training:**
```
User: Fine-tune model meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo with suffix elizaos-reasoning learning rate 0.00001 epochs 3 batch size 1
```

**Expected Output:**
```
🚂 Starting Together.ai model training...

Configuration:
- Model: meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
- Training file: ./training-output/together-ai-training.jsonl
- Model suffix: elizaos-reasoning
- Learning rate: 0.00001
- Epochs: 3

🔍 Validating training data format...

✅ Training data validation passed!
- 1,247 training examples
- Average tokens: 2,283
- Total size: 8.4MB

📤 Uploading training data to Together.ai...

✅ Training data uploaded successfully!
- File ID: file-abc123xyz
- Purpose: fine-tune
- Size: 8.4MB

🚀 Starting fine-tuning job...

🎯 Fine-tuning job created successfully!

Job Details:
- Job ID: ft-abc123xyz
- Model: meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
- Status: running
- Created: 2024-01-15 10:30:00

Training Configuration:
- Learning Rate: 0.00001
- Epochs: 3
- Batch Size: 1

Next Steps:
1. Monitor training progress
2. Wait for completion (typically 2-6 hours)
3. Test the fine-tuned model
4. Configure auto-coder to use the new model

💡 You can check progress with: "Check training status for job ft-abc123xyz"
```

### Step 3: Monitor Training

**Check Specific Job:**
```
User: Check training status for job ft-abc123xyz
```

**Check All Jobs:**
```
User: What is the progress of my model training?
```

**Expected Output (In Progress):**
```
⏳ Training Job Status

Job ID: ft-abc123xyz
Model: meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
Status: RUNNING
Created: 2024-01-15 10:30:00
Updated: 2024-01-15 12:45:00

Progress: Training in progress...
Training Progress: 450/1200 steps (38%)
Estimated Completion: 2024-01-15 16:20:00

⏳ Training in Progress
Your model is being fine-tuned. This typically takes 2-6 hours depending on dataset size.

Training Configuration:
• Learning Rate: 0.00001
• Epochs: 3
• Batch Size: 1
```

**Expected Output (Completed):**
```
✅ Training Job Status

Job ID: ft-abc123xyz
Model: meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
Status: COMPLETED
Created: 2024-01-15 10:30:00
Finished: 2024-01-15 16:15:00
Fine-tuned Model: ft-abc123xyz:elizaos-reasoning:2024-01-15

🎉 Training Complete!
Your model is ready to use. You can now:
1. Test the model with API calls
2. Configure auto-coder to use this model
3. Update your reasoning service configuration

Model ID: ft-abc123xyz:elizaos-reasoning:2024-01-15
```

### Step 4: Configure Auto-Coder

**Basic Configuration:**
```
User: Configure auto-coder to use my trained model
```

**Advanced Configuration:**
```
User: Setup auto-coder with model ft-abc123xyz:elizaos-reasoning:2024-01-15 temperature 0.1 max tokens 4000 fallback gemini-pro
```

**Expected Output:**
```
⚙️ Configuring auto-coder integration...

Configuration:
- Model: ft-abc123xyz:elizaos-reasoning:2024-01-15
- Enabled: true
- Temperature: 0.1
- Max Tokens: 4000
- Fallback: gemini-pro

Checking available models...

🧪 Testing auto-coder configuration...

✅ Auto-coder configured successfully!

Configuration Summary:
- Model: ft-abc123xyz:elizaos-reasoning:2024-01-15
- Status: 🟢 Together.ai Active
- Response Time: 1,234ms
- Available Models: 3

What's Enabled:
✅ Together.ai model integration
✅ ElizaOS-specific code generation
✅ Advanced reasoning capabilities
✅ Pattern-aware development
✅ Automatic fallback to Gemini
✅ Real-time model switching
✅ Performance monitoring

Next Steps:
1. Auto-coder will now use your trained model for ElizaOS development
2. Test with: "Generate an ElizaOS action for [functionality]"
3. Monitor performance with: "Check auto-coder status"
4. Fallback to Gemini is automatic if Together.ai is unavailable

💡 Pro Tip: Your trained model excels at ElizaOS patterns, plugin architecture, and code generation with proper thinking processes!
```

## Testing Your Trained Model

### Test Code Generation

```
User: Generate an ElizaOS action that sends Discord messages when mentioned
```

**Expected Output with Trained Model:**
```
<thinking>
The user wants to create an ElizaOS action that sends Discord messages when the agent is mentioned. This requires integrating with Discord's API and following ElizaOS action patterns.

I need to:
1. Create an action with proper validation to check if this is a Discord mention
2. Implement a handler that uses Discord service to send messages
3. Include proper error handling and response formatting
4. Add realistic examples for the LLM to understand usage patterns

For ElizaOS actions, I need:
- Name and similes for recognition
- Validation function to check if action applies  
- Handler function to execute the action
- Examples showing typical interactions

I'll use the Discord service that should be available through the runtime, and format the response according to ElizaOS conventions.
</thinking>

<file path="src/actions/discord-mention-reply.ts" language="typescript" purpose="ElizaOS action">
import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';

export const discordMentionReplyAction: Action = {
  name: 'DISCORD_MENTION_REPLY',
  similes: ['RESPOND_TO_MENTION', 'REPLY_TO_DISCORD_MENTION'],
  description: 'Responds to Discord mentions with contextual messages',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // Check if this is a Discord message with a mention
    return message.content.source === 'discord' && 
           message.content.text?.includes(`<@${runtime.agentId}>`);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      const discordService = runtime.getService('discord');
      if (!discordService) {
        throw new Error('Discord service not available');
      }

      // Extract mention context
      const mentionText = message.content.text?.replace(`<@${runtime.agentId}>`, '').trim();
      
      // Generate contextual response
      const response = `Thanks for mentioning me! I see you said: "${mentionText}". How can I help you?`;

      // Send Discord message
      await discordService.sendMessage(message.roomId, {
        text: response,
        inReplyTo: message.id
      });

      await callback?.({
        text: response,
        thought: 'Responded to Discord mention successfully',
        actions: ['DISCORD_MENTION_REPLY']
      });

      return {
        text: 'Discord mention response sent',
        success: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await callback?.({
        text: `Failed to respond to Discord mention: ${errorMessage}`,
        thought: 'Discord mention response failed',
        actions: ['DISCORD_MENTION_REPLY']
      });

      throw error;
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: '<@agent_id> can you help me with something?',
          source: 'discord'
        }
      },
      {
        name: 'Agent',
        content: {
          text: 'Thanks for mentioning me! I see you said: "can you help me with something?". How can I help you?',
          thought: 'User mentioned me in Discord, providing helpful response',
          actions: ['DISCORD_MENTION_REPLY']
        }
      }
    ]
  ]
};
</file>
```

### Compare with Base Model

**Same request to base model (Gemini fallback):**
```
// Basic Discord action without ElizaOS-specific patterns
export const basicDiscordAction = {
  name: 'SEND_DISCORD_MESSAGE',
  handler: async (runtime, message) => {
    const discord = require('discord.js');
    // Generic implementation without ElizaOS conventions
  }
};
```

**Notice the differences:**
- ✅ Trained model uses proper ElizaOS patterns and imports
- ✅ Includes detailed thinking process
- ✅ Follows ElizaOS action structure exactly
- ✅ Uses runtime services correctly
- ✅ Includes proper error handling and callbacks
- ✅ Has realistic examples with proper format

## Troubleshooting Examples

### Issue: Training Data Generation Fails

**Error:**
```
❌ Training data generation failed: Failed to clone repository: Authentication failed
```

**Solution:**
```bash
# Set GitHub token
export GITHUB_TOKEN=ghp_your_token_here

# Or add to .env file
echo "GITHUB_TOKEN=ghp_your_token_here" >> .env
```

### Issue: Model Training Fails

**Error:**
```
❌ Model training failed: File upload failed: 413 Request Entity Too Large
```

**Solution:**
```
User: Generate training data with max scenarios 500 exclude complex
```

### Issue: Auto-Coder Not Working

**Error:**
```
⚠️ Auto-coder configured but testing failed: API error: 401 Unauthorized
```

**Solution:**
```bash
# Check Together.ai API key
echo $TOGETHER_API_KEY

# Or reconfigure
User: Configure auto-coder with fallback only
```

## Advanced Usage Patterns

### Batch Processing

```typescript
// Process multiple training runs
const configs = [
  { maxScenarios: 500, complexity: 'simple' },
  { maxScenarios: 300, complexity: 'medium' },  
  { maxScenarios: 200, complexity: 'complex' }
];

for (const config of configs) {
  await runtime.processMessage({
    content: { 
      text: `Generate training data max scenarios ${config.maxScenarios} ${config.complexity} only output ./training-${config.complexity}` 
    }
  });
}
```

### Model A/B Testing

```typescript
// Test different models
const models = [
  'ft-model-v1:elizaos:2024-01-15',
  'ft-model-v2:elizaos:2024-01-16'
];

for (const model of models) {
  await runtime.processMessage({
    content: { 
      text: `Configure auto-coder with model ${model} temperature 0.1` 
    }
  });
  
  // Test the model
  await runtime.processMessage({
    content: { 
      text: 'Generate an ElizaOS provider for weather data' 
    }
  });
}
```

### Monitoring and Analytics

```typescript
// Regular status checks
setInterval(async () => {
  await runtime.processMessage({
    content: { text: 'Check training status' }
  });
}, 30 * 60 * 1000); // Every 30 minutes
```

## Integration Examples

### With Existing ElizaOS Projects

```typescript
// Add to existing character
import { comprehensiveTrainingPlugin } from '@elizaos/plugin-training/comprehensive';

const myCharacter = {
  name: "MyAgent",
  plugins: [
    '@elizaos/plugin-discord',
    '@elizaos/plugin-twitter', 
    comprehensiveTrainingPlugin, // Add training capabilities
    // ... other plugins
  ]
};
```

### Custom Training Scenarios

```typescript
// Extend with custom scenario generation
import { ScenarioGenerator } from '@elizaos/plugin-training/comprehensive';

class CustomScenarioGenerator extends ScenarioGenerator {
  async generateCustomScenarios(files, domain) {
    // Custom logic for domain-specific scenarios
    return scenarios;
  }
}
```

This comprehensive example demonstrates the full workflow from setup to advanced usage of the ElizaOS training system. The trained models show significant improvement in ElizaOS-specific code generation, pattern awareness, and reasoning capabilities.