# Build stage
FROM node:23.3.0-slim AS builder

RUN npm install -g pnpm@9.4.0 && \
    apt-get update && \
    apt-get install -y git python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY agent ./agent
COPY packages ./packages
COPY scripts ./scripts
COPY characters ./characters

RUN pnpm install && \
    pnpm build-docker && \
    pnpm prune --prod

# Runtime stage
FROM node:23.3.0-slim

ENV NPM_CONFIG_FETCH_TIMEOUT=300000

RUN apt-get update && apt-get install -y \
    pkg-config libcairo2-dev libpango1.0-dev libjpeg-dev \
    libgif-dev librsvg2-dev build-essential python3 python3-pip git && \
    npm install -g pnpm@9.4.0 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app ./

RUN chmod +x start.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["./start.sh"]
