# Full Development Container for ElizaOS Monorepo
# Workspace is volume-mounted at runtime for complete development capabilities

FROM node:23.3.0-slim

WORKDIR /app

# Install system dependencies for full development
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ffmpeg \
    g++ \
    git \
    make \
    python3 \
    unzip \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install bun and turbo globally
RUN npm install -g bun@1.2.5 turbo@2.3.3

# Create python symlink
RUN ln -s /usr/bin/python3 /usr/bin/python

# Set git config for container
RUN git config --global --add safe.directory /app

# Create eliza user directory structure  
RUN mkdir -p /home/eliza/agent

# Set development environment
ENV NODE_ENV=development
ENV LOG_LEVEL=debug
ENV DEV_MODE=true

# Expose development ports
EXPOSE 3000 3001 5173 9229

# Default command - workspace will be mounted and built at runtime
CMD ["bun", "run", "dev"]