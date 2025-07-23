# elizaOS Docker Infrastructure

Docker support gives you a containerised environment to run your agent projects and deploy them externally. Perfect for consistent environments, production deployment, and development isolation.

## Getting Started

First, create a new elizaOS project:

```bash
# Create your agent project
elizaos create my-agent
cd my-agent

# Edit .env and add your API keys
# OPENAI_API_KEY=sk-your-key
# ANTHROPIC_API_KEY=sk-ant-your-key
```

## Production Ready

Run your agent in a production-ready container:

```bash
# Start your agent in production mode
elizaos start --docker

# Force image rebuild if you've made changes
elizaos start --docker --build
```

Your agent will be available at http://localhost:3000 with PostgreSQL database included.

## Development with Hot Reload

Work on your agent with automatic code reloading:

```bash
# Start development mode with hot reload
elizaos dev --docker
```

This mounts your project files into the container so changes are reflected immediately. Includes debugging tools and development database.

## Contributing to elizaOS Core

If you're developing elizaOS itself in the monorepo, set up Docker secrets:

```bash
# Create docker/.env.local with your API keys
cat > docker/.env.local << EOF
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=sk-ant-your-key
NODE_ENV=development
ELIZA_UI_ENABLE=true
EOF

# Then run as normal
elizaos dev --docker
```


This provides a pristine development environment with:
- Monorepo mounted with hot reload support
- PostgreSQL with pgvector extensions
- Standard build tools and CLI access
- Ports: 3000 (web UI), 5173 (Vite), 9229 (Node debugger)

```bash
# View logs
docker logs -f elizaos-dev

# Shell access
docker exec -it elizaos-dev /bin/bash

# Run tests
docker exec elizaos-dev bun test

# Stop container
docker-compose -f docker/targets/dev/docker-compose.yml down
```

## Production Container

```bash
# Start production container
elizaos start --docker

# Force rebuild image
elizaos start --docker --build
```

Production configuration provides:
- PostgreSQL with pgvector
- Pre-installed plugins: bootstrap, openai, anthropic, sql
- Web UI at http://localhost:3000
- Optimised image size and security hardening

**Note:** If the web UI returns `Forbidden`, ensure `ELIZA_UI_ENABLE=true` is set in your environment configuration.

## Testing

### Automated Testing Framework

Run the Docker testing framework:

```bash
# From monorepo root
bun test docker/tests/

# Run specific test suite
bun test docker/tests/health-checks.test.ts
bun test docker/tests/cli-integration.test.ts
bun test docker/tests/agent-functionality.test.ts
bun test docker/tests/multi-context-validation.test.ts

# Run with verbose output
TEST_VERBOSE=true bun test docker/tests/
```

The framework validates:
- **Infrastructure**: Docker availability, target configuration validation
- **CLI Integration**: `--docker` flag functionality, command execution
- **Agent Functionality**: LLM provider integration with environment handling
- **Multi-Context**: Monorepo prod + starter project dev/prod targets

For detailed testing documentation, environment setup, and advanced testing patterns, see [docker/tests/README.md](tests/README.md).

### Manual Testing

```bash
# Test production deployment
elizaos start --docker

# Verify container status
docker ps | grep elizaos

# Access web interface
curl http://localhost:3000/health

# Stop when complete
docker-compose down
```

## Documentation Server

```bash
# Build and serve documentation
docker-compose -f docker/targets/docs/docker-compose.yml up

# Access at http://localhost:3000
```

The documentation container uses nginx for static serving with minimal footprint (~30MB).

## Directory Structure

```
docker/
├── .env.local                   # API keys and local overrides (gitignored)
├── scripts/                     # Build and utility scripts
│   ├── build.ts                 # Container build utilities
│   └── docker-version.ts        # Version management
├── tests/                       # Comprehensive testing framework
│   ├── health-checks.test.ts    # Infrastructure validation
│   ├── cli-integration.test.ts  # CLI --docker flag testing
│   ├── agent-functionality.test.ts # Agent LLM testing
│   ├── multi-context-validation.test.ts # Multi-context testing
│   └── utils/                   # Testing utilities
└── targets/
    ├── dev/                     # Development configuration
    │   ├── docker-compose.yml   # Dev service definitions
    │   └── Dockerfile           # Dev container image
    ├── prod/                    # Production configuration
    │   ├── docker-compose.yml   # Prod service definitions
    │   └── Dockerfile           # Prod container image
    └── docs/                    # Documentation server
        ├── docker-compose.yml   # Standard docs configuration
        ├── docker-compose-quick.yml # Quick startup variant
        ├── docker-compose-small.yml # Minimal footprint variant
        └── Dockerfile           # Docs container image
```


## Debugging

### Common Issues

**Container fails to start:**
```bash
# Check Docker daemon status
docker info

# View container logs
docker logs elizaos-dev  # or elizaos-prod

# Check environment variables
docker exec elizaos-dev env | grep ELIZA
```

**Build failures:**
```bash
# Clean Docker cache
docker system prune -f

# Rebuild without cache
elizaos start --docker --build

# Check available disk space
docker system df
```

**Port conflicts:**
```bash
# Check port usage
lsof -i :3000

# Stop conflicting containers
docker ps | grep 3000
docker stop <container-id>
```

**Environment configuration issues:**
```bash
# Verify environment file parsing
docker exec elizaos-dev cat /app/.env

# Check service connectivity
docker exec elizaos-dev nc -zv postgres 5432
```

### Performance Analysis

**Image size breakdown (production):**
- Base Node.js slim: 346MB
- Bun runtime: ~188MB
- elizaOS packages: ~678MB
- System dependencies: ~400MB
- **Total: ~1.6GB**

**Container resource usage:**
```bash
# Monitor resource consumption
docker stats elizaos-prod

# Check memory usage
docker exec elizaos-prod free -h

# Analyse startup time
time elizaos start --docker
```

