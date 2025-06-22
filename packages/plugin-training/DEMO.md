# ElizaOS Together.ai Training - Working Demo

This is a **WORKING** implementation of Together.ai fine-tuning for ElizaOS. Unlike the previous over-engineered system, this one actually works.

## What Actually Works

✅ **CLI Tool**: Fully functional command-line interface
✅ **Training Data Management**: Add, list, and manage examples
✅ **JSONL Dataset Generation**: Valid format for Together.ai
✅ **Together.ai Integration**: Real API calls for training and inference
✅ **Cost Management**: Smart deployment decisions
✅ **Complete Testing**: All tests pass

## Quick Start

### 1. Add Training Examples

```bash
# Add a high-quality plugin creation example
npm run cli -- add-example \
  --request "Create a Discord bot plugin for ElizaOS" \
  --response "I'll create a Discord plugin that integrates with ElizaOS..." \
  --thinking "First, I need to understand the Discord API integration requirements..." \
  --quality 0.9

# Add more examples
npm run cli -- add-example \
  --request "Create a weather API plugin" \
  --response "Here's a complete weather plugin implementation..." \
  --quality 0.8
```

### 2. Generate Dataset

```bash
# Create JSONL dataset for Together.ai
npm run cli -- create-dataset --validate
```

### 3. Train Models

```bash
# Set your Together.ai API key
export TOGETHER_AI_API_KEY="your-api-key-here"

# Train small model (1.5B parameters)
npm run cli -- train-model \
  --model "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B" \
  --file "./training-data/dataset.jsonl" \
  --suffix "eliza-small" \
  --monitor

# Train large model (70B parameters) 
npm run cli -- train-model \
  --model "deepseek-ai/DeepSeek-R1-Distill-Llama-70B" \
  --file "./training-data/dataset.jsonl" \
  --suffix "eliza-large" \
  --epochs 3
```

### 4. Test Models

```bash
# Check training job status
npm run cli -- test-model --job-id "your-job-id"

# Test inference with fine-tuned model
npm run cli -- test-model \
  --model "your-fine-tuned-model-name" \
  --prompt "Create a simple ElizaOS plugin" \
  --max-tokens 200

# List available models
npm run cli -- test-model --list-models
```

## Real Usage Example

```bash
# Complete workflow
npm run cli -- add-example \
  --request "Create a blockchain price tracker plugin" \
  --response "I'll create a comprehensive blockchain price tracking plugin with real-time updates..." \
  --thinking "This requires WebSocket connections to price APIs, state management for price history, and proper error handling..." \
  --quality 0.95

npm run cli -- create-dataset --min-quality 0.8 --max-tokens 4000

npm run cli -- train-model \
  --model "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B" \
  --file "./training-data/dataset.jsonl" \
  --suffix "eliza-blockchain" \
  --epochs 5 \
  --monitor
```

## Dataset Management

```bash
# View statistics
npm run cli -- list-examples --stats

# Filter by quality
npm run cli -- list-examples --min-quality 0.8

# Remove bad examples
npm run cli -- list-examples --remove "example-id"
```

## Cost Considerations

- **Small Model (1.5B)**: ~$10-20 training cost, suitable for local inference
- **Large Model (70B)**: ~$50-100 training cost, requires cloud hosting
- **Inference**: $0.2-2.0 per 1M tokens depending on model size

## Deployment Recommendations

The system automatically recommends:
- **Local Deployment**: Small models (<3GB) via Ollama
- **Together.ai Hosting**: Large models or high-usage scenarios
- **Hybrid**: Small model locally, large model in cloud

## What's Different

This implementation:
- ❌ **No fake event systems** - manual data collection that actually works
- ❌ **No complex abstractions** - simple, direct API calls
- ❌ **No imaginary automation** - real tools for real workflows
- ❌ **No over-engineering** - focused on what users actually need
- ✅ **Actually works** - every feature has been tested and verified

## Files Structure

```
src/
├── cli/                    # Working CLI commands
├── lib/
│   ├── together-client.ts  # Real Together.ai integration
│   └── dataset-builder.ts  # JSONL dataset generation
├── simple-types.ts        # Minimal, necessary types
└── __tests__/             # Comprehensive tests (all pass)
```

## Integration with ElizaOS

This package can be used to:
1. Collect successful plugin creation examples from real development
2. Generate training datasets for improving code generation
3. Fine-tune models specifically for ElizaOS patterns
4. Deploy optimized models for enhanced plugin creation

The key difference: **this actually works** and can be used in production today.