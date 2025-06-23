# ElizaOS Plugin Registry Scripts - Production Ready

A comprehensive suite of TypeScript scripts for managing the ElizaOS plugin ecosystem with production-grade infrastructure.

## 🚀 Features

- **Registry Analysis**: Discover and analyze all ElizaOS plugins
- **Documentation Enhancement**: Generate AI-powered documentation
- **Dependency Management**: Fix workspace references and versions
- **Production Ready**: Rate limiting, error recovery, logging, monitoring
- **Safe Operations**: Dry run mode, comprehensive testing
- **High Performance**: Parallel processing with concurrency control

## 📋 Prerequisites

- Node.js 18+
- GitHub Personal Access Token
- Optional: OpenAI or Anthropic API key for documentation enhancement

## 🔧 Installation

```bash
# From the plugin-github directory
npm install

# Install script dependencies
cd scripts
npm install
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required
GITHUB_TOKEN=ghp_your_token_here

# Optional - for AI documentation
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Operational settings
DRY_RUN=true              # Safe mode - no changes
LOG_LEVEL=INFO            # DEBUG, INFO, WARN, ERROR
LOG_TO_FILE=true          # Write logs to files
MAX_CONCURRENCY=5         # Parallel operations limit
CREATE_PRS=false          # Create GitHub PRs
```

### Configuration File (Optional)

Create `scripts/config.json` for additional settings:

```json
{
  "github": {
    "rateLimit": {
      "maxRequests": 5000,
      "windowMs": 3600000
    }
  },
  "features": {
    "dryRun": false,
    "parallel": true,
    "verbose": false
  },
  "paths": {
    "pluginData": "./plugin-data",
    "enhancedData": "./enhanced-plugin-data"
  }
}
```

## 🏃 Quick Start

### 1. Test Your Setup

```bash
npm run test-scripts
```

This validates your environment, configuration, and API connectivity.

### 2. Analyze Plugin Registry

```bash
# Safe dry run first
DRY_RUN=true npm run analyze-registry

# Production run
npm run analyze-registry
```

**Output:**
- `plugin-data/registry-analysis.json` - Raw analysis data
- `plugin-data/registry-report.md` - Human-readable report

### 3. Enhance Documentation (Optional)

```bash
# Requires AI API key
npm run enhance-docs
```

**Output:**
- `enhanced-plugin-data/*/enhanced-docs.md` - AI-generated documentation
- `enhanced-plugin-data/summary-report.md` - Summary of all plugins

### 4. Fix Dependencies

```bash
# Dry run to see what would change
DRY_RUN=true npm run fix-dependencies

# Apply fixes
npm run fix-dependencies
```

## 📚 Script Details

### analyze-plugin-registry-v2.ts

Discovers all ElizaOS plugins and analyzes their status:

- Fetches current plugin registry
- Discovers all plugin-* repositories
- Analyzes package.json for each plugin
- Identifies missing plugins
- Creates PRs to add missing plugins (if enabled)

**Key Features:**
- Parallel repository scanning
- Intelligent rate limiting
- Progress tracking
- Comprehensive error handling

### enhance-plugin-docs.ts

Generates enhanced documentation using AI:

- Loads plugin analysis data
- Clones repositories locally
- Concatenates TypeScript source code
- Analyzes code structure
- Generates detailed documentation

**Key Features:**
- Supports OpenAI and Anthropic
- Extracts environment variables
- Identifies actions, providers, services
- Creates structured markdown

### fix-plugin-dependencies.ts

Fixes common dependency issues:

- Resolves workspace:* references
- Updates to stable versions
- Adds missing dependencies
- Updates README files
- Creates fix PRs

**Key Features:**
- Safe dependency resolution
- Version compatibility checking
- Batch PR creation
- Rollback on errors

## 🏭 Production Infrastructure

### Rate Limiting

Built-in rate limiters for all external APIs:

```typescript
// GitHub: 5000 requests/hour
// NPM: 100 requests/minute
// OpenAI: 60 requests/minute
```

Features:
- Exponential backoff with jitter
- Automatic retry on failures
- Queue-based request management
- Per-service configuration

### Logging

Structured logging with multiple outputs:

```typescript
logger.info('Operation started', { plugin: 'example' });
logger.error('Operation failed', error);
logger.progress('Processing', 50, 100);
```

Features:
- Console output with colors
- File output with rotation
- Structured JSON format
- Operation tracking

### Error Handling

Comprehensive error recovery:

- Automatic retries for transient failures
- Graceful degradation
- Detailed error context
- Clean resource cleanup

### Monitoring

Built-in health checks and metrics:

- Execution time tracking
- Success/failure rates
- API usage monitoring
- Resource consumption

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Test everything
npm run test-scripts

# Test specific components
npm run test -- --filter=config
npm run test -- --filter=rate-limiter
```

## 🚨 Troubleshooting

### Common Issues

#### "Rate limit exceeded"
- Reduce `MAX_CONCURRENCY`
- Wait for rate limit reset
- Check logs for details

#### "Authentication failed"
- Verify GitHub token permissions
- Check token hasn't expired
- Ensure token has repo access

#### "Out of memory"
- Reduce parallel operations
- Process fewer plugins at once
- Increase Node.js memory limit

### Debug Mode

Enable detailed logging:

```bash
LOG_LEVEL=DEBUG npm run analyze-registry
```

### Log Files

Check logs for detailed information:

```bash
# View latest log
tail -f logs/plugin-scripts-*.log

# Search for errors
grep ERROR logs/*.log
```

## 📊 Output Files

### Registry Analysis
- `plugin-data/registry-analysis.json` - Complete analysis data
- `plugin-data/registry-report.md` - Markdown summary

### Enhanced Documentation
- `enhanced-plugin-data/*/` - Per-plugin documentation
- `enhanced-plugin-data/summary-report.md` - Combined report

### Dependency Fixes
- `plugin-fixes/*/` - Fixed package.json files
- `plugin-fixes/fix-report.md` - Summary of changes

## 🔒 Security

- API tokens stored in environment variables only
- No sensitive data in logs
- Secure HTTPS connections
- Minimal permission requirements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm run test-scripts`
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
1. Check the [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) guide
2. Review logs in the `logs/` directory
3. Create an issue with error details

## 🎯 Roadmap

- [ ] Caching for API responses
- [ ] Web dashboard for monitoring
- [ ] Webhook support for real-time updates
- [ ] Plugin quality scoring
- [ ] Automated testing integration 