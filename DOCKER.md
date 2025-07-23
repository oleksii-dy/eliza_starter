# Docker Guide (Temporary)

## For Monorepo Development

If you're working on the elizaOS monorepo itself, use the organised Docker targets:

```bash
# Development (hot reload)
cd docker/targets/dev && docker-compose up

# Production (optimised)
cd docker/targets/prod && docker-compose up

# Documentation
cd docker/targets/docs && docker-compose up
```

## For New Projects

**Best approach:** Use the CLI to create a new project with Docker support:

```bash
elizaos create my-project
cd my-project
# Docker configs included automatically
```

## CLI Docker Integration

The CLI now supports Docker flags for seamless container orchestration:

```bash
# Start with Docker (production-like)
elizaos start --docker

# Development with Docker and hot reload
elizaos dev --docker
```

These commands automatically handle Docker Compose and environment setup.

## TEE (Trusted Execution Environment)

TEE Docker files remain in the root to avoid breaking existing features:
- `tee-docker-compose.yaml` - Uses pre-built images for secure execution

---

*This guide is temporary whilst Docker structure stabilises.* 