FROM node:23.3.0-slim AS builder

WORKDIR /app

# Install build tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    g++ \
    git \
    make \
    python3 \
    unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install bun and turbo
RUN npm install -g bun@1.2.5 turbo@2.3.3

# Symlink python
RUN ln -s /usr/bin/python3 /usr/bin/python

# Copy configuration files
COPY package.json turbo.json tsconfig.json lerna.json renovate.json .npmrc ./
COPY scripts ./scripts

# Copy package sources
COPY packages ./packages

# Install ALL dependencies (including devDependencies needed for build)
RUN bun install --frozen-lockfile --no-cache

# Build the project using turbo
RUN bun run build

# Prune dependencies to keep only production ones
RUN bun install --production --frozen-lockfile --no-cache

# --- Final Stage ---
FROM node:23.3.0-slim

WORKDIR /app

# Install runtime tools (adjust if needed, maybe some aren't required)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    git \
    python3 \
    unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install bun (needed to run the start command)
# Consider if a smaller base image without needing global bun install is possible
RUN npm install -g bun@1.2.5

# Copy essential configuration
COPY --from=builder /app/package.json ./
COPY --from=builder /app/turbo.json /app/turbo.json
COPY --from=builder /app/tsconfig.json /app/tsconfig.json

# Copy production node_modules
COPY --from=builder /app/node_modules ./node_modules

# Copy built package artifacts
# This assumes 'bun run build' outputs necessary files within each package directory, often 'dist'
# Adjust the COPY source path if build outputs go elsewhere (e.g., a single top-level dist)
COPY --from=builder /app/packages ./packages

# Copy scripts (if needed at runtime)
COPY --from=builder /app/scripts ./scripts

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "run", "start"]
