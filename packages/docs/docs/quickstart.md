---
sidebar_position: 2
title: Quickstart Guide
description: Get started quickly with ElizaOS - from installation to running your first AI agent in 5 minutes.
keywords: [quickstart, install, setup, run, create, agent]
image: /img/eliza_banner.jpg
---

# Quickstart Guide

This guide will get you from zero to a running AI agent in under 5 minutes.

### Prerequisites

#### System Requirements

- **Hardware**: At least 4GB RAM (8GB recommended for multiple agents)
- **Storage**: 2GB free disk space for installation (plus additional for local models)
- **Network**: Port 3000 available (or configure alternative with --port flag)

#### Software Requirements

- Node.js LTS (v20 or v22 recommended for stability)
- [Bun](https://bun.sh) v1.2.15 or higher
- Git
- Ollama or an API key from Openrouter, OpenAI, Anthropic, etc

> **Note for Windows Users:** [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install-manual) is required to run ElizaOS.

### 1. Install ElizaOS CLI

```bash
bun install -g @elizaos/cli
```

### 2. Create Your First Project

```bash
elizaos create my-agent
cd my-agent
```

### 3. Configure Your API Key

Your new project includes a `.env.example` file. You need to copy it to a new `.env` file to store your secret API keys.

```bash
# Copy the environment template to a new .env file
cp .env.example .env

# Open the file for editing
elizaos env edit-local

# Add either OPENAI_API_KEY or ANTHROPIC_API_KEY
```

Your agent will not work without an API key. For more details on environment configuration, see the [Environment Guide](./cli/env.md).

### 4. Build Your Project

**Important:** You must build the project before starting your agent:

```bash
bun run build
```

This step compiles the TypeScript code and prepares your agent for execution.

### 5. Start Your Agent

```bash
elizaos start
```

Your agent is now running at [http://localhost:3000](http://localhost:3000)! 🎉

**Success Indicators:**

- You should see "Server started on port 3000" in the console
- The web interface should be accessible at http://localhost:3000
- Your agent should respond to messages in the chat interface

## What's Next?

Congratulations, you have a running ElizaOS agent! Here's where to go next to explore its full power:

- **[Explore all CLI Commands](./cli/overview.md)**: See everything you can do from the command line, including managing agents and plugins.
- **[Customize Your Agent](./core/characters.md)**: Learn how to edit your agent's personality, knowledge, and abilities using Character Files.
- **[Understand the Project Structure](./core/project.md)**: Get a detailed breakdown of every file in your new project.
- **[Extend Your Agent with Plugins](./core/plugins.md)**: Discover how to add new capabilities to your agent.

> **Important Note**: Your agent includes the `@elizaos/plugin-bootstrap` plugin by default, which is **essential for communication**. This plugin handles all message processing, response generation, and platform interactions. Without it, your agent won't be able to respond to messages. Only remove it if you're building a completely custom event handling system.

## Plugin Order Matters!

When configuring plugins in your character file, the order is critical:

```json
{
  "plugins": [
    "@elizaos/plugin-sql", // 1. MUST BE FIRST - provides database
    "@elizaos/plugin-openai", // 2. LLM provider (or anthropic, etc.)
    "@elizaos/plugin-bootstrap" // 3. Core message handling
    // ... other plugins can follow in any order
  ]
}
```

**Why this order?**

- The SQL plugin provides the database that other plugins need
- LLM provider plugins must load before plugins that use AI capabilities
- Bootstrap plugin depends on both database and LLM being available

Incorrect plugin order will cause initialization failures!

## Troubleshooting Common Issues

### "Cannot find module" Errors

**Cause**: Dependencies not properly installed or built
**Solution**:

```bash
rm -rf node_modules bun.lock
bun install
bun run build
```

### "Plugin initialization failed"

**Cause**: Incorrect plugin order in character file
**Solution**: Ensure plugins are ordered correctly as shown above

### Agent Not Responding

**Cause**: Missing bootstrap plugin or incorrect configuration
**Solution**:

- Verify `@elizaos/plugin-bootstrap` is in your plugins array
- Check that your API key is correctly set in `.env`
- Ensure all required plugins are installed

### Port 3000 Already in Use

**Cause**: Another application is using port 3000
**Solution**:

```bash
# Use a different port
elizaos start --port 3001
```

### Build Failures

**Cause**: TypeScript errors or missing dependencies
**Solution**:

```bash
# Clean and rebuild
rm -rf dist node_modules bun.lock
bun install
bun run build
```

For more detailed troubleshooting, see our [FAQ](../faq.md).
