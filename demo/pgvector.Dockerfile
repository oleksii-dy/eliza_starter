# Postgres w/ pgvector installed
# https://alpeshkumar.com/docker/automating-postgres-and-pgvector-setup-with-docker/

# Extend the official PostgreSQL 15 image
FROM postgres:15

# Install necessary dependencies for building pgvector
RUN apt-get update && apt-get install -y \
    build-essential \
    postgresql-server-dev-15 \
    git \
    clang \
    llvm \
    ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set clang as the default compiler
ENV CC=clang
ENV CXX=clang++

# Clone and build pgvector
WORKDIR /tmp
RUN git clone https://github.com/pgvector/pgvector.git

WORKDIR /tmp/pgvector
RUN make
RUN make install

# Enable pgvector in PostgreSQL
# RUN echo "shared_preload_libraries = 'pgvector'" >> /usr/share/postgresql/postgresql.conf.sample
