# ElizaOS Custom Reasoning Service

This document provides a complete guide to the **Custom Reasoning Service** - a powerful extension to ElizaOS that replaces key decision-making components with fine-tuned DeepSeek models via Together.ai.

## Overview

The Custom Reasoning Service provides three specialized fine-tuned models:

1. **ShouldRespond Model** (Ultra-small 1.5B) - Decides when the agent should respond to messages
2. **Planning Model** (Medium 14B) - Generates thoughts, selects actions, and plans responses  
3. **Coding Model** (Large 67B) - Generates code and technical solutions

## Key Features

- ✅ **Intelligent Decision Making**: Override ElizaOS core decision points with fine-tuned models
- ✅ **Cost Management**: Automatic budget limits and idle model shutdown
- ✅ **Training Data Collection**: Continuous learning from agent interactions
- ✅ **Anthropic API Proxy**: Seamless autocoder integration
- ✅ **Real-time Monitoring**: Comprehensive CLI tools for management
- ✅ **Production Ready**: Error handling, fallbacks, and monitoring

## Quick Start

### 1. Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Add your Together.ai API key:
```env
CUSTOM_REASONING_ENABLED=true
TOGETHER_AI_API_KEY=your_together_ai_api_key_here
CUSTOM_REASONING_SHOULD_RESPOND_ENABLED=true
CUSTOM_REASONING_BUDGET_LIMIT=50
```

### 2. Start Your Agent

The service will automatically initialize when you start your ElizaOS agent:

```bash
npm start
# or
elizaos start
```

Look for initialization logs:
```
✅ Custom reasoning service enabled with Together.ai
✅ Enabled custom reasoning models: ShouldRespond
💰 Custom reasoning budget limit: $50
```

### 3. CLI Management

Use the comprehensive CLI tools to manage your custom reasoning:

```bash
# Show current configuration
elizaos reasoning config

# Check model status
elizaos reasoning models list

# View cost breakdown
elizaos reasoning costs report

# Export training data
elizaos reasoning data export --model-type should_respond
```

## Model Configuration

### ShouldRespond Model (Ultra-small)
- **Purpose**: Decides whether the agent should respond to messages
- **Model**: DeepSeek-R1-Distill-Qwen-1.5B (1.5B parameters)
- **Cost**: ~$0.10/hour when deployed
- **Use Case**: High-frequency decisions, always-on optimization

```env
CUSTOM_REASONING_SHOULD_RESPOND_ENABLED=true
CUSTOM_REASONING_SHOULD_RESPOND_MODEL=moonmakesmagic/DeepSeek-R1-Distill-Qwen-1.5B-shouldrespond
```

### Planning Model (Medium)
- **Purpose**: Generates response plans, selects actions, chooses providers
- **Model**: DeepSeek-Qwen-14B (14B parameters)
- **Cost**: ~$0.50/hour when deployed
- **Use Case**: Strategic thinking and response coordination

```env
CUSTOM_REASONING_PLANNING_ENABLED=true
CUSTOM_REASONING_PLANNING_MODEL=moonmakesmagic/DeepSeek-Qwen-14B-planning
```

### Coding Model (Large)
- **Purpose**: Generates code, technical solutions, and explanations
- **Model**: DeepSeek-Llama-67B (67B parameters)  
- **Cost**: ~$2.00/hour when deployed
- **Use Case**: Complex coding tasks, autocoder integration

```env
CUSTOM_REASONING_CODING_ENABLED=true
CUSTOM_REASONING_CODING_MODEL=moonmakesmagic/DeepSeek-Llama-67B-coding
```

## Cost Management

### Budget Limits

Set automatic spending limits:
```env
CUSTOM_REASONING_BUDGET_LIMIT=100          # $100 total limit
CUSTOM_REASONING_MAX_COST_PER_HOUR=10      # $10/hour limit
```

When limits are reached, models automatically shut down to prevent overspending.

### Auto-Shutdown

Configure idle time before automatic model shutdown:
```env
CUSTOM_REASONING_AUTO_SHUTDOWN_MINUTES=30  # Shutdown after 30 minutes idle
```

### Cost Monitoring

Track spending in real-time:
```bash
# View detailed cost report
elizaos reasoning costs report

# Set new budget limit
elizaos reasoning costs set-budget 150

# Configure auto-shutdown
elizaos reasoning costs auto-shutdown --minutes 60
```

## Training Data Collection

### Automatic Collection

Enable automatic training data collection from agent decisions:
```env
CUSTOM_REASONING_COLLECT_TRAINING_DATA=true
CUSTOM_REASONING_MAX_SAMPLES_PER_MODEL=10000
CUSTOM_REASONING_RETENTION_DAYS=30
```

### Data Export

Export collected training data for model improvement:
```bash
# Export all training data
elizaos reasoning data export

# Export specific model data
elizaos reasoning data export --model-type should_respond --format jsonl

# Export with date range
elizaos reasoning data export --start-date 2024-01-01 --end-date 2024-01-31
```

### Training Data Statistics

View collection statistics:
```bash
elizaos reasoning data stats
```

## Anthropic API Proxy

### Purpose

The Anthropic proxy intercepts calls to Claude API (used by autocoder) and routes coding requests to your custom coding model.

### Configuration

```env
ANTHROPIC_PROXY_ENABLED=true
ANTHROPIC_PROXY_PORT=8001
```

### How It Works

1. Proxy starts on configured port (default 8001)
2. Detects coding-related requests via keywords and patterns
3. Routes to custom coding model if available
4. Falls back to original Anthropic API for non-coding requests
5. Maintains full API compatibility

### Usage with Autocoder

Configure your autocoder to use the proxy:
```env
ANTHROPIC_BASE_URL=http://localhost:8001
```

## CLI Commands Reference

### Model Management

```bash
# List all models and their status
elizaos reasoning models list

# Enable a specific model
elizaos reasoning models enable should-respond

# Disable a model
elizaos reasoning models disable coding

# Check detailed status
elizaos reasoning models status

# Deploy model for inference
elizaos reasoning models deploy my-model-name

# Undeploy to save costs
elizaos reasoning models undeploy my-model-name
```

### Training Data Management

```bash
# Export training data
elizaos reasoning data export [options]
  -m, --model-type <type>     Model type (should-respond, planning, coding)
  -f, --format <format>       Export format (jsonl, json)
  -o, --output <file>         Output file path
  -l, --limit <number>        Limit number of samples
  --start-date <date>         Start date (YYYY-MM-DD)
  --end-date <date>           End date (YYYY-MM-DD)

# View statistics
elizaos reasoning data stats

# Clean up old data
elizaos reasoning data cleanup --days 30 [--dry-run]
```

### Cost Management

```bash
# View cost report
elizaos reasoning costs report

# Set budget limit
elizaos reasoning costs set-budget <amount>

# Configure auto-shutdown
elizaos reasoning costs auto-shutdown --minutes <minutes>
```

### Configuration

```bash
# Show current configuration
elizaos reasoning config

# Interactive setup wizard
elizaos reasoning setup
```

## How It Works

### Integration Points

The custom reasoning service integrates with ElizaOS at three key decision points:

1. **ShouldRespond Hook**: Called before the agent decides whether to respond
2. **Planning Hook**: Called when generating response plans and selecting actions
3. **Coding Hook**: Called via Anthropic proxy for code generation requests

### Fallback Strategy

- If custom reasoning fails or is unavailable, falls back to original ElizaOS logic
- Errors are logged but don't break the agent's functionality
- Graceful degradation ensures reliability

### Data Flow

```
Message → ShouldRespond Model → Planning Model → Action Execution
                ↓                      ↓              ↓
         Training Data         Training Data   Training Data
                ↓                      ↓              ↓
            Database Storage → Export → Fine-tuning → Model Update
```

## Advanced Configuration

### Model Customization

You can specify custom model names for your own fine-tuned models:

```env
CUSTOM_REASONING_SHOULD_RESPOND_MODEL=your-org/your-custom-shouldrespond-model
CUSTOM_REASONING_PLANNING_MODEL=your-org/your-custom-planning-model
CUSTOM_REASONING_CODING_MODEL=your-org/your-custom-coding-model
```

### Custom Reasoning Service Extension

The service implements the `CustomReasoningService` interface, making it easy to create alternative implementations:

```typescript
import { CustomReasoningService } from '@elizaos/plugin-training';

class MyCustomReasoningService implements CustomReasoningService {
  // Implement your own reasoning logic
}
```

## Troubleshooting

### Common Issues

**Service Not Starting**
```bash
# Check API key configuration
elizaos reasoning config

# Verify Together.ai API key
curl -H "Authorization: Bearer $TOGETHER_AI_API_KEY" https://api.together.xyz/models
```

**High Costs**
```bash
# Check current usage
elizaos reasoning costs report

# Set stricter budget limits
elizaos reasoning costs set-budget 50

# Enable auto-shutdown
elizaos reasoning costs auto-shutdown --minutes 15
```

**Models Not Responding**
```bash
# Check model status
elizaos reasoning models status

# Try redeploying
elizaos reasoning models undeploy model-name
elizaos reasoning models deploy model-name
```

### Debug Logging

Enable debug logging for detailed troubleshooting:
```env
DEBUG=custom-reasoning*
```

## Production Deployment

### Recommended Settings

For production deployment:

```env
# Core settings
CUSTOM_REASONING_ENABLED=true
TOGETHER_AI_API_KEY=your_production_key

# Conservative model enablement
CUSTOM_REASONING_SHOULD_RESPOND_ENABLED=true
CUSTOM_REASONING_PLANNING_ENABLED=true
CUSTOM_REASONING_CODING_ENABLED=false  # Start with false, enable gradually

# Strict cost controls
CUSTOM_REASONING_BUDGET_LIMIT=500
CUSTOM_REASONING_AUTO_SHUTDOWN_MINUTES=15
CUSTOM_REASONING_MAX_COST_PER_HOUR=25

# Data collection for improvement
CUSTOM_REASONING_COLLECT_TRAINING_DATA=true
CUSTOM_REASONING_RETENTION_DAYS=90
```

### Monitoring

Set up monitoring for:
- Model response times
- Cost accumulation
- Training data quality
- Error rates and fallbacks

### Security

- Keep API keys secure and rotate regularly
- Use environment variables, never hardcode credentials
- Monitor proxy access logs if using Anthropic proxy
- Regularly review training data for sensitive information

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review logs with debug mode enabled
3. Use `elizaos reasoning config` to verify setup
4. Check Together.ai status and account limits

## Architecture Summary

The Custom Reasoning Service provides a complete replacement for ElizaOS's core decision-making with:

- **3 specialized fine-tuned models** for different reasoning tasks
- **Comprehensive cost management** with automatic controls
- **Continuous learning** through training data collection
- **Seamless integration** with existing ElizaOS workflows
- **Production-ready monitoring** and management tools
- **Flexible deployment** options via Together.ai

This creates a powerful, cost-effective, and continuously improving reasoning system for ElizaOS agents.