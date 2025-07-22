# Production-optimized Dockerfile for elizaOS
# Focused on minimal layers, optimal caching, and small image size

ARG NODE_VERSION=23.3.0
ARG BUN_VERSION=1.2.5
ARG ELIZAOS_VERSION=latest

# ===================================================================
# Stage 1: Dependencies and Build Environment
# ===================================================================
FROM node:${NODE_VERSION}-alpine AS builder

# Install build dependencies and system tools in a single layer
# Order: curl first (needed for bun), then build tools, then cleanup
RUN apk add --no-cache \
    curl \
    bash \
    git \
    python3 \
    && ln -sf /usr/bin/python3 /usr/bin/python

# Install bun globally - separate layer for better caching
ARG BUN_VERSION
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}" && \
    /root/.bun/bin/bun --version

# Install elizaOS CLI as root - separate layer since version changes infrequently
ARG ELIZAOS_VERSION
RUN /root/.bun/bin/bun install -g @elizaos/cli@${ELIZAOS_VERSION} && \
    cp /root/.bun/bin/bun /usr/local/bin/bun && \
    chmod +x /usr/local/bin/bun

# Create non-root user in builder stage
RUN addgroup -g 1001 -S eliza && \
    adduser -S eliza -u 1001 -G eliza

# Switch to non-root user and set working directory
USER eliza
WORKDIR /home/eliza

# Set up agent directory
WORKDIR /home/eliza/agent

# Copy package files first for better caching
# Only package.json changes when dependencies change
COPY --chown=eliza:eliza package.json ./

# Install dependencies with production optimizations
# Chain commands to reduce layers and cleanup in same layer
RUN bun install --frozen-lockfile --production --no-optional --ignore-scripts && \
    bun pm cache rm && \
    rm -rf /tmp/* /var/tmp/* ~/.cache

# ===================================================================
# Stage 2: Runtime Image  
# ===================================================================
FROM node:${NODE_VERSION}-alpine AS runtime

# Install only essential runtime dependencies in single layer
# Order: update, install, symlink, cleanup - all chained
RUN apk add --no-cache \
    dumb-init \
    curl \
    git \
    python3 \
    ffmpeg \
    ca-certificates \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Create non-root user for runtime
RUN addgroup -g 1001 -S eliza && \
    adduser -S eliza -u 1001 -G eliza

# Copy bun binary from builder and make it globally accessible
COPY --from=builder /root/.bun /usr/local/bun
RUN ln -s /usr/local/bun/bin/bun /usr/local/bin/bun && \
    chmod +x /usr/local/bin/bun
ENV PATH="/usr/local/bun/bin:$PATH"

# Copy elizaOS CLI installation
COPY --from=builder --chown=eliza:eliza /home/eliza/.bun /home/eliza/.bun

# Copy installed dependencies
COPY --from=builder --chown=eliza:eliza /home/eliza/agent/node_modules /home/eliza/agent/node_modules
COPY --from=builder --chown=eliza:eliza /home/eliza/agent/package.json /home/eliza/agent/package.json

# Copy application code (most frequently changing - goes last)
COPY --chown=eliza:eliza src/ /home/eliza/agent/src/
COPY --chown=eliza:eliza .env /home/eliza/agent/.env

# Create optimized startup script in single layer
RUN echo '#!/bin/sh' > /home/eliza/start.sh && \
    echo 'set -e' >> /home/eliza/start.sh && \
    echo 'cd /home/eliza/agent' >> /home/eliza/start.sh && \
    echo 'echo "Starting ElizaOS agent..."' >> /home/eliza/start.sh && \
    echo 'exec elizaos start "$@"' >> /home/eliza/start.sh && \
    chmod +x /home/eliza/start.sh && \
    chown eliza:eliza /home/eliza/start.sh

# Switch to non-root user
USER eliza
WORKDIR /home/eliza/agent

# Set production environment variables
ENV NODE_ENV=production \
    LOG_LEVEL=info

# Expose port
EXPOSE 3000

# Health check using curl (already installed)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Use the optimized startup script
CMD ["/bin/sh", "/home/eliza/start.sh"]