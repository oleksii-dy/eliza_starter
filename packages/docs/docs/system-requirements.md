---
sidebar_position: 4
title: System Requirements
description: Complete hardware, software, and network requirements for running ElizaOS
keywords: [requirements, prerequisites, installation, setup, hardware, software]
---

# System Requirements

This page outlines the complete system requirements for running ElizaOS agents successfully.

## Hardware Requirements

### Minimum Requirements

- **CPU**: 2 cores (x64 or ARM64 architecture)
- **RAM**: 4GB (for single agent)
- **Storage**: 2GB free disk space for ElizaOS installation
- **Additional Storage**:
  - 500MB-2GB per local model (if using Ollama)
  - 100MB-1GB for knowledge documents (if using RAG)

### Recommended Requirements

- **CPU**: 4+ cores
- **RAM**: 8GB (allows multiple agents or larger context windows)
- **Storage**: 10GB free disk space
- **GPU**: Optional, but beneficial for local model inference with Ollama

### Multi-Agent Deployments

- Add 2-4GB RAM per additional agent
- Add 1-2 CPU cores per additional agent
- Ensure adequate network bandwidth for API calls

## Software Requirements

### Operating System

- **macOS**: 11.0 (Big Sur) or later
- **Linux**: Ubuntu 20.04+, Debian 11+, RHEL 8+, or compatible
- **Windows**: Windows 10/11 with WSL2 (required)

### Core Dependencies

#### Node.js

- **Version**: LTS (v20 or v22 recommended)
- **Important**: Use LTS versions for stability and long-term support
- **Installation**:

  ```bash
  # Using nvm (recommended)
  nvm install --lts
  nvm use --lts

  # Verify installation
  node --version  # Should output: v20.x.x or v22.x.x
  ```

#### Bun Package Manager

- **Version**: 1.2.15 or higher
- **Installation**:

  ```bash
  # Install Bun
  curl -fsSL https://bun.sh/install | bash

  # Verify installation
  bun --version  # Should output: 1.2.15 or higher
  ```

#### Git

- **Version**: 2.0 or higher
- Required for version control and plugin installation

### Windows-Specific Requirements

Windows users **must** use WSL2 (Windows Subsystem for Linux):

1. **Enable WSL2**:

   ```powershell
   # Run as Administrator
   wsl --install
   ```

2. **Install Ubuntu**:

   ```powershell
   # Install Ubuntu 22.04
   wsl --install -d Ubuntu-22.04
   ```

3. **Set WSL2 as default**:

   ```powershell
   wsl --set-default-version 2
   ```

4. **Run all ElizaOS commands inside WSL2**

## Network Requirements

### Ports

- **Port 3000**: Default web interface (configurable with `--port` flag)
- **Port 5432**: PostgreSQL (if using external database)
- **Port 11434**: Ollama API (if using local models)

### Internet Connectivity

- Required for:
  - API-based LLM providers (OpenAI, Anthropic, etc.)
  - Plugin installation and updates
  - Discord, Telegram, and other platform integrations

### Firewall Configuration

- Allow outbound HTTPS (port 443) for API calls
- Allow inbound connections on configured agent port (default 3000)
- Platform-specific ports for integrations (Discord, Telegram, etc.)

## Database Requirements

### Local Development (PGLite)

- No additional requirements
- Data stored in `.eliza/.elizadb` directory
- Suitable for single-agent development

### Production (PostgreSQL)

- PostgreSQL 14+ recommended
- Minimum 1GB RAM allocated to PostgreSQL
- 1GB+ storage for database
- Proper backup strategy recommended

## API Keys and Services

### Required (at least one)

- **OpenAI API Key**: For GPT models
- **Anthropic API Key**: For Claude models
- **Google AI API Key**: For Gemini models
- **Local Models**: Ollama installation

### Optional Services

- **Discord**: Bot token and application ID
- **Telegram**: Bot token from BotFather
- **Twitter**: API credentials
- **Other platforms**: As per plugin requirements

## Performance Considerations

### Memory Usage

- Base agent: ~500MB-1GB RAM
- With knowledge base: +200-500MB
- Per active conversation: +50-100MB
- LLM context window: Variable based on model

### CPU Usage

- Idle: &lt;5% CPU
- Active conversation: 10-30% CPU
- Knowledge ingestion: 50-100% CPU (temporary)

### Network Bandwidth

- API calls: ~1-10KB per message
- Voice/image processing: 100KB-5MB per interaction
- Knowledge document upload: Depends on document size

## Development Environment

### Recommended IDEs

- **VS Code**: With TypeScript extensions
- **Cursor**: AI-enhanced development
- **WebStorm**: Full TypeScript support

### Helpful Tools

- **nvm**: Node version management
- **Docker**: For containerized deployments
- **PM2**: Process management for production
- **PostgreSQL client**: For database management

## Troubleshooting Resources

### Checking System Compatibility

```bash
# Check Node.js version
node --version  # Should be LTS (v20.x.x or v22.x.x)

# Check Bun version
bun --version  # Must be 1.2.15+

# Check available memory
free -h  # Linux/WSL
vm_stat | grep free  # macOS

# Check disk space
df -h

# Check port availability
lsof -i :3000  # Should return nothing if port is free
```

### Common Issues

1. **Wrong Node.js version**: Use nvm to install exact version
2. **Insufficient memory**: Close unnecessary applications
3. **Port conflicts**: Use `--port` flag to specify alternative
4. **WSL not enabled**: Windows users must use WSL2

For detailed troubleshooting, see our [FAQ](./faq.md).
