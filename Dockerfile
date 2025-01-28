# Use a specific Node.js version for better reproducibility
FROM node:23.3.0-slim AS builder

# Enhanced debug configuration
ENV LOG_LEVEL=debug \
    NODE_DEBUG="module,child_process,net,stream,timer" \
    DEBUG="*,-follow-redirects" \
    TSUP_LOG_LEVEL=verbose \
    NODE_OPTIONS="--trace-warnings --trace-uncaught --trace-exit --trace-events-enabled" \
    DEBUG_COLORS=1 \
    DEBUG_DEPTH=10 \
    DEBUG_SHOW_HIDDEN=1

# Clear npm cache and remove existing node_modules
RUN npm cache clean --force && \
    rm -rf node_modules

# Set environment variables for detailed logging
ENV NODE_ENV=development
ENV NODE_OPTIONS="--trace-warnings"
ENV DOCKER_BUILDKIT=1
ENV BUILDKIT_PROGRESS=plain

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

# Build the project
RUN pnpm -F @elizaos/plugin-bootstrap build --verbose 2>&1 | tee build.log

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
# Set the command to run the application

# Command to start the application
CMD ["sh", "-c", "pnpm start & pnpm start:client"]