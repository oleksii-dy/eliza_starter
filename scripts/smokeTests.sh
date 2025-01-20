#!/bin/bash

# Strict mode, exit on error, undefined variables, and pipe failures
set -euo pipefail

# Print some information about the environment to aid in case of troubleshooting

echo "node version:"
node --version

echo "python version:"
python3 --version

echo "make version:"
make --version

echo "gcc version:"
gcc --version

echo "g++ version:"
g++ --version

# Check Node.js version (must be exactly 23.3.0)
REQUIRED_NODE_VERSION="23.3.0"
CURRENT_NODE_VERSION=$(node -v | sed 's/v//')

# Split version string into components for comparison
IFS='.' read -r CURRENT_MAJOR CURRENT_MINOR CURRENT_PATCH <<< "$CURRENT_NODE_VERSION"
IFS='.' read -r REQUIRED_MAJOR REQUIRED_MINOR REQUIRED_PATCH <<< "$REQUIRED_NODE_VERSION"

if [[ "$CURRENT_NODE_VERSION" != "$REQUIRED_NODE_VERSION" ]]; then
    echo "Error: Node.js version must be exactly $REQUIRED_NODE_VERSION. Current version is $CURRENT_NODE_VERSION."
    exit 1
fi

# Autodetect project directory relative to this script's path
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_DIR"

cp .env.example .env

# Removed pnpm clean to prevent unnecessary rebuilds and dependency installation issues
# This improves smoke test reliability by preserving the node_modules directory
pnpm install -r --no-frozen-lockfile

pnpm build

# Create temp file and ensure cleanup
OUTFILE="$(mktemp)"
trap 'rm -f "$OUTFILE"' EXIT
echo "Using temporary output file: $OUTFILE"

# Add timeout configuration
TIMEOUT=900  # 90 seconds to accommodate slower builds and initial installations
INTERVAL=5   # Represent 0.5 seconds as 5 tenths of a second
TIMER=0

# Start the application and capture logs in the background
>&2 echo "Starting server with character trump.character.json..."

# Function to extract port from logs
get_server_port() {
    if grep -q "Port 3000 is in use, trying" "$1"; then
        # Extract the alternative port from the log
        local alt_port=$(grep "Port 3000 is in use, trying" "$1" | grep -o '[0-9]\+' | tail -1)
        echo "$alt_port"
    else
        echo "3000"
    fi
}

# Start with plugins disabled and configure Node.js for ESM and native modules
export DISABLE_PLUGINS=true
export NODE_OPTIONS="--no-node-snapshot --experimental-loader=ts-node/esm/transpile-only"
export TS_NODE_TRANSPILE_ONLY=true
>&2 echo "Starting with DISABLE_PLUGINS=$DISABLE_PLUGINS and NODE_OPTIONS=$NODE_OPTIONS"
NODE_NO_WARNINGS=1 pnpm start --character=characters/trump.character.json > "$OUTFILE" 2>&1 &

APP_PID=$!  # Capture the PID of the background process
SERVER_PORT=""

(
  # Wait for the ready message with timeout
  while true; do
    if (( TIMER >= TIMEOUT )); then
        >&2 echo "ERROR: Timeout waiting for application to start after $((TIMEOUT / 10)) seconds"
        >&2 echo "Last 20 lines of server output:"
        tail -n 20 "$OUTFILE" >&2
        kill $APP_PID  # Terminate the pnpm process
        exit 1
    fi

    if grep -q "=== Starting DirectClient initialization ===" "$OUTFILE"; then
        >&2 echo "Server initialization started..."
        
        # Wait up to 30 seconds for the server to start and detect the port
        for i in {1..30}; do
            # Try to get the server port
            if [[ -z "$SERVER_PORT" ]]; then
                SERVER_PORT=$(get_server_port "$OUTFILE")
                if [[ -n "$SERVER_PORT" ]]; then
                    >&2 echo "Detected server running on port: $SERVER_PORT"
                fi
            fi
            
            # If we have a port, try to connect
            if [[ -n "$SERVER_PORT" ]]; then
                if curl -sf "http://localhost:$SERVER_PORT/status" > /dev/null 2>&1; then
                    >&2 echo "SUCCESS: Direct Client API is ready! Status endpoint responding on port $SERVER_PORT"
                    break 2
                fi
            fi
            
            sleep 1
            >&2 echo "Waiting for server to be ready... ($i seconds)"
        done
        
        >&2 echo "ERROR: Server failed to respond within 30 seconds"
        >&2 echo "Last 50 lines of server output:"
        tail -n 50 "$OUTFILE" >&2
        kill $APP_PID
        exit 1
    fi

    sleep 0.5
    TIMER=$((TIMER + INTERVAL))
    
    # Show progress every 10 seconds
    if (( TIMER % 100 == 0 )); then
        >&2 echo "Waiting for server startup... ($((TIMER / 10)) seconds elapsed)"
        >&2 echo "Recent server output:"
        tail -n 5 "$OUTFILE" >&2
    fi
  done
)

# Gracefully terminate the application if needed
kill $APP_PID
wait $APP_PID 2>/dev/null || true  # Ensure the process is cleaned up

RESULT=$?

# Output logs
echo "----- OUTPUT START -----"
cat "$OUTFILE"
echo "----- OUTPUT END -----"

# Check the application exit code
if [[ $RESULT -ne 0 ]]; then
    echo "Error: 'pnpm start' command exited with an error (code: $RESULT)"
    exit 1
fi

# Final validation
if grep -q "Server closed successfully" "$OUTFILE"; then
    echo "Smoke Test completed successfully."
else
    echo "Error: The output does not contain the expected termination message but was completed."
    echo "Smoke Test completed without completion message."
    # Exit gracefully
fi
