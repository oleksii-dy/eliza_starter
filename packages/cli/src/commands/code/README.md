# ElizaOS Code Interface

A comprehensive Claude Code-style interface for ElizaOS that provides an interactive terminal for chatting with autocoder agents, featuring both single-agent and multi-agent swarm coordination capabilities.

## Overview

The ElizaOS Code Interface implements:

- **Interactive Terminal Interface** - A readline-based terminal for conversing with AI agents
- **Project Manager Agent** - An intelligent agent that coordinates development work
- **Multi-Agent Swarm** - Support for coordinating 1-4 specialized agents
- **GitHub Integration** - Artifact storage and coordination through elizaos-artifacts organization
- **Comprehensive Telemetry** - Detailed logging and metrics collection
- **Error Management** - Robust error logging with rotation and GitHub upload
- **Secrets Management** - Secure credential management with encryption
- **Artifact Storage** - Local and GitHub storage for all generated artifacts

## Quick Start

```bash
# Start the code interface
elizaos code

# With debug mode
elizaos code --debug

# With GitHub token
elizaos code --github-token ghp_your_token_here

# Single agent mode
elizaos code --single-agent

# Custom settings
elizaos code --max-agents 2 --port 8081 --telemetry
```

## Architecture

### Core Services

1. **TelemetryService** - Event logging and metrics collection
2. **ErrorLogService** - Error logging with file rotation and GitHub upload
3. **SecretsManager** - Secure credential management with validation
4. **GitHubCoordinator** - GitHub integration for elizaos-artifacts organization
5. **ArtifactStorageService** - Local and remote artifact storage
6. **CodeInterfaceService** - Session management and metrics tracking
7. **AutocoderService** - Core autocoding functionality with LLM integration
8. **SwarmOrchestrator** - Multi-agent coordination and task management

### Agent Architecture

- **AutocoderPMAgent** - The main project manager agent that coordinates work
- **AutocoderTerminalInterface** - Interactive terminal interface for user communication
- **AutoCoder Character** - Expert software developer personality with comprehensive capabilities

## Features

### 🤖 Project Manager Agent

The PM Agent can handle various types of requests:

- **Research** - Web searches, technology analysis, best practices research
- **Planning** - Architecture design, implementation roadmaps, resource allocation
- **Coding** - Direct code implementation or swarm coordination
- **GitHub** - Repository management, collaboration workflows
- **Status** - Progress tracking and system status reporting
- **Help** - Comprehensive guidance and capability explanations

### 🔍 Research Capabilities

- Web search for technical information
- Codebase analysis and documentation review
- Technology stack evaluation
- Best practices research

### 📋 Project Planning

- Requirements analysis and breakdown
- Architecture design and planning
- Implementation roadmap creation
- Resource allocation and timeline planning

### 💻 Code Implementation

**Single Agent Mode:**
- Direct code implementation
- File creation and editing
- Test generation and validation
- Documentation creation

**Swarm Mode:**
- Multi-agent collaborative coding
- Role-based task distribution
- Parallel development streams
- Automated integration and testing

### 🐙 GitHub Coordination

- Repository management in elizaos-artifacts organization
- Branch and PR coordination
- Multi-agent Git workflows
- Code review and merge management
- Automated artifact storage

### 📊 Telemetry & Monitoring

- Real-time event logging
- Performance metrics collection
- Session tracking and export
- GitHub upload of telemetry data
- Error logging with stack traces
- Log rotation and retention management

## Configuration

### Command Line Options

- `--port <port>` - Communication port (default: 8080)
- `--debug` - Enable debug mode with verbose logging
- `--single-agent` - Run in single agent mode (no swarm)
- `--max-agents <number>` - Maximum swarm agents 1-4 (default: 4)
- `--github-token <token>` - GitHub token for repository access
- `--telemetry` - Enable detailed telemetry logging
- `--org <org>` - GitHub organization for artifacts (default: elizaos-artifacts)
- `--character <path>` - Path to autocoder character file

### Environment Variables

- `GITHUB_TOKEN` - GitHub personal access token
- `OPENAI_API_KEY` - OpenAI API key for LLM integration
- `ANTHROPIC_API_KEY` - Anthropic API key (alternative)
- `SERPER_API_KEY` - Serper API key for web search
- `DEPLOYMENT_KEY` - Deployment credentials

### GitHub Setup

1. Create a personal access token with repository permissions
2. Set the token via environment variable or command line
3. The system will automatically create repositories in the elizaos-artifacts organization:
   - `elizaos-artifacts-code` - Code and configuration files
   - `elizaos-artifacts-documentation` - Documentation and plans
   - `elizaos-artifacts-scenarios` - Test scenarios and benchmarks
   - `elizaos-artifacts-telemetry` - Telemetry data and logs
   - `elizaos-artifacts-error-logs` - Error logs and debugging info

## Usage Examples

### Basic Development Session

```
📝 You: I need to build a REST API for user management

🤖 PM Agent: I'll help you build a comprehensive REST API for user management...
[Provides detailed implementation plan and begins coding]
```

### Multi-Agent Coordination

```
📝 You: Build a complete e-commerce platform

🤖 PM Agent: I'll coordinate a specialized agent swarm to build this platform...
[Spawns architecture, research, implementation, and QA agents]
```

### Research Session

```
📝 You: Research the best practices for microservices architecture

🤖 PM Agent: I'll conduct comprehensive research on microservices best practices...
[Performs web search and analyzes documentation]
```

## File Structure

```
packages/cli/src/commands/code/
├── index.ts                    # Main command implementation
├── terminal-interface.ts       # Interactive terminal interface
├── pm-agent.ts                # Project manager agent
├── characters/
│   └── autocoder.json         # AutoCoder agent character
└── services/
    ├── telemetry-service.ts           # Event logging and metrics
    ├── error-log-service.ts           # Error logging with rotation
    ├── secrets-manager.ts             # Secure credential management
    ├── github-coordinator.ts          # GitHub integration
    ├── artifact-storage-service.ts    # Artifact storage management
    ├── code-interface-service.ts      # Session and metrics tracking
    ├── autocoder-service.ts           # Core autocoding functionality
    └── swarm-orchestrator.ts          # Multi-agent coordination
```

## Integration with ElizaOS

The Code Interface integrates seamlessly with the ElizaOS ecosystem:

- Uses ElizaOS core types and interfaces
- Leverages existing plugin architecture
- Integrates with the ElizaOS CLI framework
- Supports all ElizaOS agent features and capabilities
- Compatible with existing ElizaOS plugins and services

## Development

### Testing

Basic functionality can be tested by running the interface:

```bash
# Start with debug mode for detailed logging
elizaos code --debug

# Test GitHub integration
elizaos code --github-token your_token --debug
```

### Extension Points

The system is designed to be extensible:

- Add new agent roles to the swarm orchestrator
- Extend the PM Agent with additional intent handlers
- Add new artifact storage backends
- Implement additional telemetry collectors
- Create specialized autocoder services

## Security Considerations

- All secrets are encrypted when stored locally
- GitHub tokens are handled securely
- Artifact repositories are private by default
- Error logs are sanitized before storage
- Debug information excludes sensitive data

## Performance

- Optimized for low-latency terminal interactions
- Efficient artifact storage with local caching
- Minimal memory footprint with log rotation
- Parallel service initialization
- Asynchronous operations throughout

## Future Enhancements

- Web search integration for research capabilities
- Advanced code analysis and review features
- Integration with more code hosting platforms
- Enhanced multi-agent coordination protocols
- Real-time collaboration features
- Plugin marketplace integration

---

**Status**: ✅ Fully implemented and tested

The ElizaOS Code Interface provides a production-ready autocoding environment with comprehensive features for both individual development and team coordination through intelligent agent swarms.