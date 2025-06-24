# ElizaOS Training Plugin

A comprehensive training data extraction and RLAIF (Reinforcement Learning from AI Feedback) training plugin for ElizaOS agents using the Atropos framework.

## Overview

This plugin enables you to:

- 📊 **Extract training data** from ElizaOS conversation databases
- 🧠 **Prepare datasets** for fine-tuning and RLAIF training
- 🚀 **Train models** using Atropos with reinforcement learning
- ☁️ **Deploy training** to cloud providers (GCP, AWS, Azure)
- 🤗 **Upload datasets** to Hugging Face Hub
- 📈 **Monitor training** progress with real-time metrics

## Quick Start

### Installation

```bash
cd packages/plugin-training
bun install
bun run build
```

### Basic Usage

1. **Extract training data:**

```bash
# Extract conversations from the last 30 days
bun run extract-data --days 30 --quality 0.7

# Or use the agent action
"extract training data from the last 30 days for fine-tuning"
```

2. **Start RLAIF training:**

```bash
# Start training with default configuration
bun run train --model deepseek-coder --judge gpt-4

# Or use the agent action
"start RLAIF training with the extracted dataset"
```

3. **Monitor training:**

```bash
# Monitor specific training job
bun run monitor --job-id training-1234567890

# Or use the agent action
"monitor training training-1234567890"
```

## Features

### 🔍 Data Extraction

Extract rich training data from ElizaOS conversations:

- **Conversation filtering** by date, quality, length
- **Action metadata** including execution results
- **Provider context** and evaluation results
- **Multi-format output** (JSONL, CSV, Parquet)
- **Automatic deduplication** and quality scoring

### 🎯 RLAIF Training

Train models using reinforcement learning from AI feedback:

- **Response generation** with multiple variants
- **AI judging** with configurable preference models
- **Pairwise comparison** for preference learning
- **Reward optimization** with policy gradients
- **Checkpoint management** and evaluation

### 🌐 TypeScript-Python Bridge

Seamless integration between ElizaOS (TypeScript) and Atropos (Python):

- **WebSocket communication** for real-time data exchange
- **Async message handling** with request/response patterns
- **Error propagation** and status monitoring
- **Health checks** and connection management

### ☁️ Cloud Deployment

Deploy training to major cloud providers:

- **Google Cloud Platform** with GPU instances
- **Amazon Web Services** with EC2 and SageMaker
- **Microsoft Azure** with Azure ML
- **Auto-scaling** and cost optimization
- **Instance lifecycle** management

### 🤗 Hugging Face Integration

Upload and manage datasets on Hugging Face Hub:

- **Dataset publishing** with automatic metadata
- **Model repositories** for fine-tuned models
- **Version control** and collaboration
- **License management** and access controls

## Configuration

### Environment Variables

```bash
# Required
HUGGING_FACE_TOKEN=hf_...              # For dataset uploads
ATROPOS_API_URL=http://localhost:8000  # Atropos server

# Model APIs (choose one or more)
OPENAI_API_KEY=sk-...                  # For GPT models
ANTHROPIC_API_KEY=sk-ant-...           # For Claude models

# Cloud Deployment (optional)
GCP_PROJECT_ID=my-project              # Google Cloud
AWS_KEY_NAME=my-key                    # AWS EC2
AZURE_RESOURCE_GROUP=my-rg             # Azure

# Monitoring (optional)
WANDB_API_KEY=...                      # Weights & Biases
TENSORBOARD_LOG_DIR=./logs             # TensorBoard logs
```

### Training Configuration

```typescript
const config: TrainingConfig = {
  // Data extraction settings
  extractionConfig: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    minConversationLength: 3,
    maxConversationLength: 50,
    includeActions: true,
    includeProviders: true,
    includeEvaluators: true,
    minQuality: 0.7,
  },

  // Dataset preparation
  datasetConfig: {
    outputFormat: 'jsonl',
    splitRatio: { train: 0.8, validation: 0.1, test: 0.1 },
    maxTokens: 512,
    deduplicate: true,
  },

  // RLAIF training
  rlaifConfig: {
    judgeModel: 'gpt-4',
    preferenceDescription: 'helpful, harmless, and honest responses',
    maxResponseVariants: 3,
    scoringStrategy: 'pairwise',
    rewardThreshold: 0.7,
  },

  // Atropos configuration
  atroposConfig: {
    apiUrl: 'http://localhost:8000',
    environment: 'deepseek-coder',
    batchSize: 4,
    maxSteps: 1000,
    learningRate: 1e-5,
    warmupSteps: 100,
    evalSteps: 50,
    saveSteps: 100,
  },

  // Cloud deployment (optional)
  deploymentConfig: {
    provider: 'gcp',
    region: 'us-central1-a',
    instanceType: 'n1-standard-8',
    gpuType: 'nvidia-tesla-v100',
  },

  // Hugging Face integration (optional)
  huggingFaceConfig: {
    organization: 'elizaos',
    datasetName: 'eliza-conversations',
    modelName: 'eliza-fine-tuned',
    private: false,
    license: 'apache-2.0',
  },
};
```

## CLI Scripts

### Extract Training Data

```bash
# Basic extraction
bun run extract-data

# Advanced options
bun run extract-data \\
  --days 60 \\
  --quality 0.8 \\
  --format jsonl \\
  --output ./my-dataset \\
  --include-actions \\
  --include-providers \\
  --deduplicate \\
  --min-length 5 \\
  --max-length 25
```

### Start Training

```bash
# Basic training
bun run train

# Advanced training
bun run train \\
  --model deepseek-coder \\
  --judge gpt-4 \\
  --steps 2000 \\
  --batch-size 8 \\
  --learning-rate 5e-6 \\
  --cloud gcp \\
  --instance-type n1-standard-16 \\
  --upload-hf \\
  --hf-org my-org \\
  --wandb
```

### Monitor Training

```bash
# Monitor specific job
bun run monitor --job-id training-1234567890

# Monitor with live updates
bun run monitor --job-id training-1234567890 --live
```

## Agent Actions

The plugin provides three main actions for natural language interaction:

### EXTRACT_TRAINING_DATA

Extract and prepare training data from conversations.

**Examples:**

- "extract training data from the last 30 days"
- "prepare dataset for RLAIF training with high-quality conversations only"
- "create training set from autocoder plugin conversations"

### START_TRAINING

Start RLAIF training with Atropos.

**Examples:**

- "start RLAIF training with the extracted dataset"
- "launch training on Google Cloud with 1000 steps and batch size 8"
- "begin fine-tuning with DeepSeek model using GPT-4 as judge"

### MONITOR_TRAINING

Monitor training progress and metrics.

**Examples:**

- "monitor training job training-1234567890"
- "how is the training going?"
- "check training status and show me the loss curves"

## Architecture

### System Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ElizaOS       │    │   Training       │    │   Atropos       │
│   Database      │───▶│   Plugin         │───▶│   Framework     │
│                 │    │                  │    │                 │
│ • Conversations │    │ • Data Extract   │    │ • RLAIF Train   │
│ • Actions       │    │ • Processing     │    │ • RL Updates    │
│ • Evaluations   │    │ • Bridge Comm    │    │ • Checkpoints   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                       ┌────────┴────────┐
                       │                 │
                ┌──────▼──────┐   ┌──────▼──────┐
                │   Cloud     │   │ Hugging Face│
                │ Deployment  │   │    Hub      │
                │             │   │             │
                │ • GCP/AWS   │   │ • Datasets  │
                │ • Auto Scale│   │ • Models    │
                │ • Monitoring│   │ • Sharing   │
                └─────────────┘   └─────────────┘
```

### Data Flow

1. **Extraction:** Pull conversations from ElizaOS database
2. **Processing:** Filter, clean, and format for training
3. **Preparation:** Generate alternative responses for RLAIF
4. **Judging:** Use AI models to score response preferences
5. **Training:** Apply reinforcement learning with Atropos
6. **Monitoring:** Track progress and save checkpoints

## Development

### Setup Development Environment

```bash
# Install dependencies
bun install

# Build the plugin
bun run build

# Run tests
bun test

# Start development mode
bun run dev
```

### Running Tests

```bash
# Unit tests
bun test

# E2E tests (requires running ElizaOS)
elizaos test

# Integration tests
bun run test:integration
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Examples

### Complete Training Pipeline

```typescript
import { trainingPlugin } from '@elizaos/plugin-training';

// 1. Configure the agent with training plugin
const agent = {
  character: myCharacter,
  plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-openai', trainingPlugin],
};

// 2. Extract training data
const conversations = await trainingService.extractTrainingData({
  extractionConfig: {
    startDate: new Date('2024-01-01'),
    minQuality: 0.8,
    includeActions: true,
  },
  // ... other config
});

// 3. Prepare dataset
const datasetPath = await trainingService.prepareDataset(conversations, config);

// 4. Upload to Hugging Face
const datasetUrl = await trainingService.uploadToHuggingFace(datasetPath, config);

// 5. Start training
const trainingJob = await trainingService.startTraining(config);

// 6. Monitor progress
const status = await trainingService.monitorTraining(trainingJob.id);
```

### Custom Judge Model

```typescript
const config: TrainingConfig = {
  rlaifConfig: {
    judgeModel: 'claude-3-opus',
    preferenceDescription: `
      Prefer responses that:
      - Provide accurate and helpful information
      - Show clear reasoning steps
      - Use appropriate code examples
      - Maintain safety and ethical guidelines
      - Demonstrate creativity when appropriate
    `,
    maxResponseVariants: 4,
    scoringStrategy: 'pairwise',
  },
  // ... other config
};
```

### Cloud Training with Auto-scaling

```typescript
const config: TrainingConfig = {
  deploymentConfig: {
    provider: 'gcp',
    region: 'us-central1-a',
    instanceType: 'n1-standard-16',
    gpuType: 'nvidia-tesla-v100',
    maxInstances: 4,
    autoScaling: true,
  },
  atroposConfig: {
    batchSize: 16, // Larger batch for multi-GPU
    maxSteps: 10000,
    // ... other config
  },
};
```

## Troubleshooting

### Common Issues

**Atropos Bridge Connection Failed**

```bash
# Check if Python bridge is running
python3 atropos/bridge_server.py

# Check WebSocket connection
curl -v ws://localhost:8765
```

**Training Job Not Starting**

```bash
# Verify Atropos API is healthy
curl http://localhost:8000/health

# Check environment configuration
elizaos env list
```

**Dataset Quality Issues**

```bash
# Check extraction statistics
bun run extract-data --days 7 --quality 0.9

# Review conversation samples
head -5 training-data/train.jsonl
```

**Cloud Deployment Failures**

```bash
# Verify cloud credentials
gcloud auth list        # GCP
aws sts get-caller-identity  # AWS
az account show         # Azure

# Check instance quotas and limits
```

### Getting Help

- 📖 [Documentation](https://elizaos.ai/docs/training)
- 💬 [Discord Community](https://discord.gg/elizaos)
- 🐛 [GitHub Issues](https://github.com/elizaos/eliza/issues)
- 📧 [Support Email](mailto:support@elizaos.ai)

## License

This plugin is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

- [Atropos](https://github.com/NousResearch/Atropos) by Nous Research
- [Hugging Face](https://huggingface.co) for dataset hosting
- [ElizaOS](https://elizaos.ai) core team
- Contributors and community members

---

Built with ❤️ by the ElizaOS team
