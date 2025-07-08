#!/bin/bash

# Build the project first
bun run build

# Forward all arguments to the node command
node dist/index.js start "$@" 