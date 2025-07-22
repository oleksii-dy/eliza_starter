a# Development Container for ElizaOS Monorepo
# Supports workspace dependencies and hot reload via volume mounts

FROM node:23.3.0-slim AS builder

WORKDIR /app

# Install system dependencies (matching upstream requirements)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ffmpeg \
    g++ \
    git \
    make \
    python3 \
    unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install bun and turbo globally (matching upstream)
RUN npm install -g bun@1.2.5 turbo@2.3.3

# Create python symlink (matching upstream)
RUN ln -s /usr/bin/python3 /usr/bin/python

# Copy monorepo configuration files (essential for workspace deps)
COPY package.json turbo.json tsconfig.json lerna.json renovate.json .npmrc ./
COPY scripts ./scripts
COPY packages ./packages

# Install dependencies using bun (workspace-aware)
RUN bun install --frozen-lockfile

# Build workspace packages (ensures @elizaos/core is available)
RUN bun run build

# Set git config for container
RUN git config --global --add safe.directory /app

# Create eliza user directory structure  
RUN mkdir -p /home/eliza/agent

# Development stage - optimized for hot reload
FROM node:23.3.0-slim AS development

WORKDIR /app

# Install system dependencies for runtime
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install bun and turbo
RUN npm install -g bun@1.2.5 turbo@2.3.3

# Create python symlink
RUN ln -s /usr/bin/python3 /usr/bin/python

# Copy built workspace from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/turbo.json ./turbo.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/lerna.json ./lerna.json
COPY --from=builder /app/.npmrc ./.npmrc
COPY --from=builder /app/scripts ./scripts

# Set git config for container
RUN git config --global --add safe.directory /app

# Create eliza user directory structure  
RUN mkdir -p /home/eliza/agent

# Expose development ports
EXPOSE 3000 3001 5173 9229

# Default command for development (can be overridden)
CMD ["bun", "run", "dev"]