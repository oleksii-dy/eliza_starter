# Use a specific Node.js version for better reproducibility
FROM node:23.3.0-slim AS builder

# Install pnpm globally and necessary build tools
RUN npm install -g pnpm@9.4.0 && \
    apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y \
        git \
        python3 \
        python3-pip \
        curl \
        node-gyp \
        ffmpeg \
        libtool-bin \
        autoconf \
        automake \
        libopus-dev \
        make \
        g++ \
        build-essential \
        libcairo2-dev \
        libjpeg-dev \
        libpango1.0-dev \
        libgif-dev \
        openssl \
        libssl-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Python 3 as the default python
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Set the working directory
WORKDIR /app

# Copy application code
COPY . .

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build core package first
RUN cd packages/core && pnpm build

# Build adapter-pglite specifically
RUN cd packages/adapter-pglite && pnpm build

# Build bootstrap plugin with debug output
RUN cd packages/plugin-bootstrap && \
    echo "=== Bootstrap Plugin Files ===" && \
    ls -la && \
    echo "=== Bootstrap Plugin package.json ===" && \
    cat package.json && \
    echo "=== Building Bootstrap Plugin ===" && \
    NODE_DEBUG=* pnpm build || (echo "=== Build Error ===" && cat $(find . -name "*.log") && exit 1)

# Build all packages with increased verbosity
RUN pnpm run build --filter=!eliza-docs,!@elizaos/plugin-bootstrap --verbosity=2

# Verify built files exist
RUN ls -la packages/adapter-pglite/dist/index.js || echo "adapter-pglite build missing!"

# Prune dependencies for production
RUN pnpm prune --prod

# Final runtime image
FROM node:23.3.0-slim

# Install runtime dependencies
RUN npm install -g pnpm@9.4.0 && \
    apt-get update && \
    apt-get install -y \
        git \
        python3 \
        ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy built artifacts and production dependencies from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/agent ./agent
COPY --from=builder /app/client ./client
COPY --from=builder /app/lerna.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/characters ./characters

# Expose necessary ports
EXPOSE $PORT

# Command to start the application
CMD ["sh", "-c", "pnpm start & pnpm start:client"]
