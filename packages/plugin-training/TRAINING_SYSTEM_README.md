# ElizaOS Comprehensive Training System

A complete training pipeline for fine-tuning DeepSeek-70B models on ElizaOS code patterns and reasoning processes.

## Overview

This system provides end-to-end training data generation and model fine-tuning capabilities:

1. **Repository Analysis**: Clones and analyzes ElizaOS core and all plugin repositories
2. **Scenario Generation**: Creates realistic user scenarios with detailed thinking processes
3. **Model Training**: Fine-tunes DeepSeek-70B on Together.ai with generated data
4. **Auto-Coder Integration**: Proxies Claude Code requests to your trained model
5. **Progress Monitoring**: Tracks training status and provides detailed analytics

## Quick Start

### 1. Installation

The training system is included in the `@elizaos/plugin-training` package. Import the comprehensive plugin:

```typescript
import { comprehensiveTrainingPlugin } from '@elizaos/plugin-training/comprehensive-training-plugin';

const agent = {
  character: myCharacter,
  plugins: [
    comprehensiveTrainingPlugin,
    // ... other plugins
  ]
};
```

### 2. Environment Setup

Required environment variables:

```bash
# Core Requirements
OPENAI_API_KEY=your_openai_key_here          # For scenario generation
TOGETHER_API_KEY=your_together_ai_key_here   # For model training

# Optional (recommended)
GITHUB_TOKEN=your_github_token_here          # For repository access
ELIZAOS_FINETUNED_MODEL=ft-model-id         # Specific model to use
REASONING_PROXY_ENABLED=true                 # Enable auto-coder proxy
```

### 3. Generate Training Data

```bash
# In your ElizaOS chat interface
"Generate training data for ElizaOS"
```

This will:
- Clone https://github.com/elizaOS/eliza
- Discover and clone all plugin repositories 
- Extract and analyze all code files
- Generate realistic user scenarios
- Create detailed thinking processes
- Export data in Together.ai JSONL format

### 4. Train Your Model

```bash
"Train a model using the generated training data"
```

This will:
- Upload your dataset to Together.ai
- Start fine-tuning DeepSeek-70B
- Provide progress monitoring
- Return a trained model ID when complete

### 5. Configure Auto-Coder

```bash
"Configure auto-coder to use my trained model"
```

This will:
- Setup the reasoning proxy service
- Configure model routing
- Enable fallback to base models
- Test the integration

## Usage Examples

### Basic Training Pipeline

```typescript
// 1. Generate comprehensive training data
await runtime.processMessage({
  content: { text: "Generate training data for ElizaOS with max 1000 scenarios" }
});

// 2. Train model with custom parameters
await runtime.processMessage({
  content: { text: "Train model with learning rate 0.00001 and 3 epochs" }
});

// 3. Monitor training progress
await runtime.processMessage({
  content: { text: "Check training status for job ft-abc123" }
});

// 4. Configure auto-coder integration
await runtime.processMessage({
  content: { text: "Setup auto-coder with temperature 0.1" }
});
```

### Advanced Configuration

```typescript
// Custom training data generation
await runtime.processMessage({
  content: { 
    text: "Generate training data with workspace ./custom-workspace output ./custom-output include tests include config max scenarios 500" 
  }
});

// Model training with specific parameters
await runtime.processMessage({
  content: { 
    text: "Fine-tune model meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo with suffix my-elizaos-model learning rate 0.0001 epochs 5 batch size 2" 
  }
});
```

## System Architecture

### Training Data Generation Pipeline

```
ElizaOS Core Repo → File Extraction → Scenario Generation → JSONL Export
       ↓                ↓                    ↓               ↓
Plugin Repos → Code Analysis → User Queries → Together.ai Format
       ↓                ↓                    ↓               ↓
Documentation → Metadata → Thinking Process → Training Dataset
```

### Generated Training Examples

Each training example includes:

1. **User Query**: Realistic request for ElizaOS functionality
2. **Context**: Repository structure, related files, target information
3. **Thinking Process**: Detailed reasoning from requirements to implementation
4. **Expected Output**: Complete, working ElizaOS code with proper patterns

Example structure:
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are an expert ElizaOS developer..."
    },
    {
      "role": "user", 
      "content": "Create an ElizaOS action that sends Discord messages..."
    },
    {
      "role": "assistant",
      "content": "<thinking>...</thinking>\n\n<file path=\"src/actions/discord-message.ts\">...</file>"
    }
  ]
}
```

### Auto-Coder Integration

When reasoning proxy is enabled:

```
Claude Code Request → Reasoning Proxy → Together.ai Model → Response
                           ↓                    ↓            ↑
                     Fallback Logic → Gemini → Response (if Together.ai fails)
```

## Configuration Options

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for scenario generation | - |
| `TOGETHER_API_KEY` | Yes | Together.ai API key for model training | - |
| `GITHUB_TOKEN` | No | GitHub token for repository access | - |
| `ELIZAOS_FINETUNED_MODEL` | No | Specific fine-tuned model ID | Auto-detect |
| `REASONING_PROXY_ENABLED` | No | Enable auto-coder proxy | `true` |
| `REASONING_TEMPERATURE` | No | Model temperature | `0.1` |
| `REASONING_MAX_TOKENS` | No | Max tokens per request | `4000` |
| `REASONING_TIMEOUT` | No | Request timeout (ms) | `30000` |
| `FALLBACK_MODEL` | No | Fallback model name | `gemini-pro` |

### Training Generation Options

Customize via natural language in your requests:

- **Workspace**: `workspace ./my-workspace`
- **Output Directory**: `output ./my-output` 
- **Max Scenarios**: `max scenarios 500`
- **Include Tests**: `include tests`
- **Include Config**: `include config`
- **Exclude Complex**: `exclude complex` or `simple only`
- **Temperature**: `temperature 0.7`
- **Cleanup**: `cleanup` or `clean up`

### Model Training Options

- **Base Model**: `model meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo`
- **Model Suffix**: `suffix my-elizaos-model`
- **Learning Rate**: `learning rate 0.00001`
- **Epochs**: `epochs 3`
- **Batch Size**: `batch size 1`

## Output Structure

### Generated Files

```
./training-output/
├── together-ai-training.jsonl      # Main training file for Together.ai
├── training-scenarios.json         # Raw scenarios with metadata
├── generation-statistics.json      # Detailed statistics
├── generation-report.json          # Comprehensive report
└── by-category/                    # Optional category splits
    ├── file-creation-training.jsonl
    ├── plugin-creation-training.jsonl
    └── documentation-training.jsonl
```

### Training Workspace

```
./training-workspace/
├── core/                           # ElizaOS core repository
│   └── eliza/
└── plugins/                        # All plugin repositories
    ├── plugin-discord/
    ├── plugin-twitter/
    └── ...
```

## Monitoring and Analytics

### Training Status

Check training progress:
```bash
"Check training status"                    # All jobs
"Check status for job ft-abc123"          # Specific job
"What is the progress of my training?"     # All jobs with details
```

### Generated Statistics

The system provides comprehensive analytics:

- **Repository Statistics**: Core + plugin count, failed clones
- **File Analysis**: Total files, language distribution, complexity
- **Scenario Distribution**: Simple/medium/complex breakdown
- **Component Analysis**: Actions, providers, services, evaluators
- **Token Estimates**: Total tokens, average per scenario
- **Training Costs**: Estimated costs and training time

### Example Report

```json
{
  "totalScenarios": 1247,
  "coreScenarios": 523,
  "pluginScenarios": 681,
  "docScenarios": 43,
  "totalTokens": 2847291,
  "processingTime": 892345,
  "statistics": {
    "repositories": { "core": 1, "plugins": 47, "failed": 3 },
    "files": { "total": 2341, "typescript": 1876, "javascript": 234 },
    "scenarios": { "simple": 567, "medium": 421, "complex": 259 },
    "components": { "actions": 127, "providers": 89, "services": 34 }
  }
}
```

## Best Practices

### 1. Training Data Quality

- **Start Small**: Generate 100-500 scenarios for initial testing
- **Review Samples**: Check generated scenarios for quality
- **Iterate**: Regenerate with adjusted parameters if needed
- **Balance Complexity**: Include mix of simple, medium, complex examples

### 2. Model Training

- **Conservative Learning Rates**: Start with 0.00001 for stability
- **Monitor Progress**: Check status regularly during training
- **Test Models**: Validate trained models before production use
- **Version Control**: Keep track of model IDs and training configs

### 3. Auto-Coder Integration

- **Gradual Rollout**: Test with simple tasks first
- **Fallback Ready**: Ensure Gemini fallback is configured
- **Monitor Performance**: Track response quality and speed
- **Cost Management**: Set reasonable token limits

### 4. Troubleshooting

Common issues and solutions:

**Training Data Generation Fails**
- Check OpenAI API key and credits
- Verify network connectivity
- Ensure sufficient disk space
- Check GitHub rate limits

**Model Training Fails**
- Validate JSONL format
- Check Together.ai API key
- Verify file size limits
- Monitor account credits

**Auto-Coder Not Working**
- Check reasoning proxy status
- Verify model ID is correct
- Test Together.ai connectivity
- Confirm fallback is working

## API Reference

### Actions

#### `GENERATE_TRAINING_DATA`
Generates comprehensive training datasets from ElizaOS repositories.

**Triggers**: "generate training data", "create training dataset", "build training scenarios"

**Options**: workspace, output, max scenarios, include tests/config, temperature

#### `TRAIN_MODEL`
Uploads data to Together.ai and starts fine-tuning DeepSeek-70B.

**Triggers**: "train model", "fine-tune model", "start training"

**Options**: model, file, suffix, learning rate, epochs, batch size

#### `CHECK_TRAINING_STATUS`
Monitors Together.ai fine-tuning job progress.

**Triggers**: "check training status", "training progress", "status"

**Options**: job ID (optional)

#### `CONFIGURE_AUTOCODER`
Sets up auto-coder integration with trained models.

**Triggers**: "configure auto-coder", "setup reasoning", "config proxy"

**Options**: model, temperature, max tokens, fallback

### Services

#### `ReasoningService`
Core reasoning capabilities for scenario generation.

#### `ReasoningProxyService`
Proxies auto-coder requests to Together.ai models with fallback.

**Methods**:
- `processReasoningRequest(prompt, options)`: Process reasoning request
- `getAvailableModels()`: List fine-tuned models
- `updateConfig(config)`: Update service configuration
- `getStatus()`: Get service health status

## Contributing

The training system is designed to be extensible:

1. **Custom Scenario Generators**: Add new scenario types
2. **Additional Model Providers**: Support other training platforms
3. **Enhanced Analytics**: Add more detailed metrics
4. **Integration Hooks**: Extend auto-coder functionality

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review logs for detailed error messages
3. Verify all environment variables are set
4. Test with minimal configurations first

The system provides extensive logging and error messages to help diagnose issues. All operations include progress tracking and detailed status information.