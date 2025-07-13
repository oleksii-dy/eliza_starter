# Deployment Guide for Eliza Agents

This guide covers deploying custom Eliza agents using Railway and Render platforms.

## Prerequisites

Before deploying, ensure you have:

1. **AI Provider API Keys** - At least one of:
   - OpenAI API Key (`OPENAI_API_KEY`)
   - Anthropic Claude API Key (`ANTHROPIC_API_KEY`)
   - Google Generative AI API Key (`GOOGLE_GENERATIVE_AI_API_KEY`)
   - OpenRouter API Key (`OPENROUTER_API_KEY`)
   - Ollama API Endpoint (`OLLAMA_API_ENDPOINT`)

2. **Database** (optional):
   - PostgreSQL URL (`POSTGRES_URL`) - if not provided, uses PGLite
   - PGLite data directory (`PGLITE_DATA_DIR`)

## Railway Deployment

### Using railway.json

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Deploy from repository**:
   ```bash
   railway up
   ```

4. **Set environment variables**:
   ```bash
   railway variables set OPENAI_API_KEY=your_openai_key
   railway variables set ANTHROPIC_API_KEY=your_anthropic_key
   # Add other required variables
   ```

### Railway Configuration Features

- **Auto-scaling**: Configured for 1 replica with restart policy
- **Health checks**: Endpoint `/health` with 30s timeout
- **Resources**: 1GB memory, 1 CPU limit
- **Port**: Automatically uses Railway's `$PORT` environment variable
- **Build**: Uses bun for package management and building
- **Node version**: 23.3.0

## Render Deployment

### Using render.yaml Blueprint

1. **Connect your repository** to Render
2. **Import the blueprint**:
   - Go to Render Dashboard
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select `render.yaml` as the blueprint file

3. **Configure environment variables**:
   - Set required API keys in Render's environment variables section
   - Configure optional database settings

### Render Configuration Features

- **Web Service**: Starter plan in Oregon region
- **Database**: Optional PostgreSQL service included
- **Auto-deploy**: Triggers on `develop` branch changes
- **Health checks**: Endpoint `/health`
- **Environment**: Production-ready with all necessary variables

## Environment Variables

### Required (at least one AI provider)

```bash
# AI Model Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key
OPENROUTER_API_KEY=your_openrouter_key
OLLAMA_API_ENDPOINT=your_ollama_endpoint
```

### Optional

```bash
# Server Configuration
SERVER_PORT=3000                    # Port for server (auto-set by platforms)
SERVER_HOST=0.0.0.0                 # Host binding
NODE_ENV=production                 # Environment mode
ELIZA_UI_ENABLE=true               # Enable web UI
EXPRESS_MAX_PAYLOAD=2mb            # Max request payload

# Database
POSTGRES_URL=your_postgres_url      # PostgreSQL connection
PGLITE_DATA_DIR=./data             # PGLite data directory

# Security
ELIZA_SERVER_AUTH_TOKEN=your_token  # API authentication token

# Agent Configuration
REMOTE_CHARACTER_URLS=urls         # Remote character URLs
ELIZA_NONINTERACTIVE=false         # Non-interactive mode
```

## Post-Deployment

### Verify Deployment

1. **Check health endpoint**:
   ```bash
   curl https://your-app-url/health
   ```

2. **Monitor logs**:
   - Railway: `railway logs`
   - Render: Check logs in Render dashboard

3. **Test agent functionality**:
   - Access the web UI (if enabled)
   - Test API endpoints
   - Verify agent responses

### Troubleshooting

**Common Issues**:

1. **Build failures**:
   - Ensure bun is installed correctly
   - Check Node.js version compatibility
   - Verify all dependencies are resolved

2. **Runtime errors**:
   - Check environment variables are set
   - Verify AI provider API keys are valid
   - Monitor memory usage and resource limits

3. **Database connectivity**:
   - Check PostgreSQL connection string
   - Verify database exists and is accessible
   - Fall back to PGLite if PostgreSQL fails

## Scaling Considerations

### Performance Optimization

1. **Memory allocation**: Increase memory limits for complex agents
2. **CPU resources**: Scale CPU for multiple concurrent conversations
3. **Database**: Use managed PostgreSQL for production workloads
4. **Caching**: Consider Redis for session management

### Cost Optimization

1. **Resource limits**: Set appropriate memory/CPU limits
2. **Auto-scaling**: Configure based on actual usage patterns
3. **Database tier**: Choose appropriate database plan
4. **Monitoring**: Set up alerts for resource usage

## Security Best Practices

1. **API Keys**: Store in platform environment variables, never in code
2. **Authentication**: Set `ELIZA_SERVER_AUTH_TOKEN` for API access
3. **HTTPS**: Both platforms provide SSL certificates automatically
4. **Database**: Use connection pooling and proper access controls
5. **Monitoring**: Enable logging and monitoring for security events

## Support and Resources

- **Railway Documentation**: https://docs.railway.app/
- **Render Documentation**: https://render.com/docs
- **Eliza Documentation**: Check the main README and documentation
- **Community**: Join the Eliza community for deployment support

---

*Generated for ElizaOS deployment - Update as needed for your specific requirements*