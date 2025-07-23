# ElizaOS Documentation Docker

Quick and simple setup for serving ElizaOS documentation locally.

## 🚀 Quick Start

```bash
# 1. Build docs first (from eliza/ root)
cd packages/docs && bun install && bun run build && cd ../..

# 2. Serve with Docker (super fast)
cd docker/targets/docs && docker-compose up
```

**Access:** http://localhost:3001

## 🔧 How It Works

- **Simple**: Uses nginx:alpine to serve pre-built docs
- **Fast**: Starts in seconds (no building required)
- **Lightweight**: Minimal nginx setup, no bloat

## 📋 Prerequisites

Docs must be built first:
```bash
cd packages/docs
bun install
bun run build
```

## 🧹 Cleanup

```bash
docker-compose down
```

## ⚡ Other Docker Files

- **Main App**: Use `eliza/docker-compose.yaml` for full ElizaOS with database