FROM node:23.3.0-slim AS builder

# Set working directory
WORKDIR /app

# Install Node.js 23.3.0 and required dependencies
RUN apt-get update && \
    apt-get install -y curl git python3 make g++ unzip build-essential nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install bun using npm (more reliable across architectures)
RUN npm install -g bun turbo@2.3.3

# Set Python 3 as the default python
RUN ln -sf /usr/bin/python3 /usr/bin/python

RUN git clone https://github.com/elizaos/eliza.git

WORKDIR /app/eliza

RUN git checkout v2-develop

# Install dependencies
RUN bun install
RUN bun add better-sqlite3

# Build the project
RUN bun run build:core
RUN bun run build:docker

# Create a new stage for the final image
FROM node:23.3.0-slim

WORKDIR /app

# Install Node.js 23.3.0 and required dependencies
RUN apt-get update && \
    apt-get install -y curl git python3 make g++ unzip build-essential nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install bun using npm
RUN npm install -g bun turbo@2.3.3

# Copy built artifacts and production dependencies from the builder stage
COPY --from=builder /app/eliza/package.json ./
COPY --from=builder /app/eliza/tsconfig.json ./
COPY --from=builder /app/eliza/turbo.json ./
COPY --from=builder /app/eliza/lerna.json ./
COPY --from=builder /app/eliza/renovate.json ./
COPY --from=builder /app/eliza/biome.json ./
COPY --from=builder /app/eliza/node_modules ./node_modules
COPY --from=builder /app/eliza/packages ./packages
COPY --from=builder /app/eliza/scripts ./scripts

# Set environment variables
ENV NODE_ENV=production

# Expose any necessary ports (if needed)
EXPOSE 3000 5173

# Start the application
CMD ["bun", "run", "swarm"] 