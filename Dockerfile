# Use a specific Node.js version for better reproducibility
FROM node:23.3.0-slim AS builder

# Install pnpm globally and build tools
RUN npm install -g pnpm@9.4.0 && \
    apt-get update && \
    apt-get install -y git python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Python 3 as the default python
RUN ln -s /usr/bin/python3 /usr/bin/python

# Set the working directory
WORKDIR /app

# Copy configuration files and app code
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY agent ./agent
COPY packages ./packages
COPY scripts ./scripts
COPY characters ./characters

# Install dependencies and build the project
RUN pnpm install && pnpm build-docker && pnpm prune --prod && \
    rm -rf /app/node_modules/.cache

# Create the final image
FROM node:23.3.0-slim

# Install pnpm globally for runtime
RUN npm install -g pnpm@9.4.0 && \
    apt-get update && \
    apt-get install -y git python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy production files from the builder stage
COPY --from=builder /app ./

# Expose the default port
EXPOSE 3001

# Set the default command
CMD ["pnpm", "start"]

