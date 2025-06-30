#!/bin/bash

# Cleanup script for CLI tests
# Kills any lingering processes from test runs

echo "Cleaning up test processes..."

# Kill any bun processes running dist/index.js with escalating signals
echo "Terminating bun processes..."
pkill -TERM -f "bun.*dist/index.js" || true
sleep 1
pkill -KILL -f "bun.*dist/index.js" || true

# Kill any node processes that might be lingering
echo "Terminating node processes..."
pkill -TERM -f "node.*dist/index.js" || true
sleep 1
pkill -KILL -f "node.*dist/index.js" || true

# Kill processes on common test ports with retry logic
echo "Freeing up test ports..."
for port in 3000 3100 3456; do
  echo "Checking port $port..."
  PIDS=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "Killing processes on port $port: $PIDS"
    echo "$PIDS" | xargs kill -TERM 2>/dev/null || true
    sleep 1
    # Force kill if still running
    PIDS=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
      echo "Force killing remaining processes on port $port: $PIDS"
      echo "$PIDS" | xargs kill -9 2>/dev/null || true
    fi
  fi
done

# Wait for ports to be fully freed
echo "Waiting for ports to be freed..."
sleep 2

# Verify cleanup
echo "Verifying cleanup..."
REMAINING_BUN=$(pgrep -f "bun.*dist/index.js" | wc -l)
REMAINING_NODE=$(pgrep -f "node.*dist/index.js" | wc -l)
REMAINING_PORTS=$(lsof -ti:3000,3100,3456 2>/dev/null | wc -l)

echo "Remaining processes: bun=$REMAINING_BUN, node=$REMAINING_NODE, ports=$REMAINING_PORTS"

if [ "$REMAINING_BUN" -gt 0 ] || [ "$REMAINING_NODE" -gt 0 ] || [ "$REMAINING_PORTS" -gt 0 ]; then
  echo "Warning: Some processes may still be running"
else
  echo "Cleanup verified successful"
fi

echo "Cleanup complete"
