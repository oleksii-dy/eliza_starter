#!/bin/bash
# cleanup-test-processes.sh
# Script to clean up any leftover test processes

echo "🧹 Cleaning up test processes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track what we cleaned up
CLEANED_COUNT=0

# Function to kill processes matching a pattern
kill_processes() {
  local pattern="$1"
  local description="$2"
  
  # Find processes matching the pattern
  local pids=$(pgrep -f "$pattern" 2>/dev/null)
  
  if [ -n "$pids" ]; then
    echo -e "${YELLOW}Found ${description} processes: ${pids}${NC}"
    
    # Try graceful termination first
    for pid in $pids; do
      if kill -0 "$pid" 2>/dev/null; then
        echo "  Terminating process $pid..."
        kill -TERM "$pid" 2>/dev/null || true
        ((CLEANED_COUNT++))
      fi
    done
    
    # Wait a moment for graceful shutdown
    sleep 1
    
    # Force kill any remaining
    for pid in $pids; do
      if kill -0 "$pid" 2>/dev/null; then
        echo "  Force killing process $pid..."
        kill -KILL "$pid" 2>/dev/null || true
      fi
    done
  fi
}

# Kill elizaos test processes
echo -e "\n${YELLOW}Checking for elizaos processes...${NC}"
kill_processes "elizaos.*test" "elizaos test"
kill_processes "elizaos start" "elizaos start"
kill_processes "node.*elizaos.*start" "node elizaos"
kill_processes "bun.*test.*elizaos" "bun test"

# Kill any lingering node processes from tests
echo -e "\n${YELLOW}Checking for test-related node processes...${NC}"
kill_processes "node.*cli/dist/index.js.*test" "CLI test"
kill_processes "node.*AgentServer.*test" "AgentServer test"

# Kill BATS-related processes
echo -e "\n${YELLOW}Checking for BATS processes...${NC}"
kill_processes "bats.*test" "BATS"

# Kill any processes using test ports
echo -e "\n${YELLOW}Checking for processes on test ports...${NC}"
for port in 3000 3001 4567; do
  # Check if port is in use
  if lsof -i :$port >/dev/null 2>&1; then
    echo -e "${YELLOW}Found process using port $port${NC}"
    
    # Get PID of process using the port
    pid=$(lsof -t -i :$port 2>/dev/null | head -n 1)
    
    if [ -n "$pid" ]; then
      # Check if it's a test-related process
      if ps -p "$pid" -o command= | grep -E "(test|elizaos)" >/dev/null 2>&1; then
        echo "  Killing process $pid on port $port..."
        kill -TERM "$pid" 2>/dev/null || true
        ((CLEANED_COUNT++))
      else
        echo "  Skipping non-test process on port $port"
      fi
    fi
  fi
done

# Clean up test directories
echo -e "\n${YELLOW}Cleaning up test directories...${NC}"
if [ -d ~/.eliza/test-* ]; then
  echo "  Removing test directories..."
  rm -rf ~/.eliza/test-* 2>/dev/null || true
fi

# Clean up temp test directories
echo -e "\n${YELLOW}Cleaning up temp test directories...${NC}"
find /tmp -name "eliza-cli-test.*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true

# Summary
echo -e "\n================================="
if [ $CLEANED_COUNT -eq 0 ]; then
  echo -e "${GREEN}✓ No test processes found to clean up${NC}"
else
  echo -e "${GREEN}✓ Cleaned up $CLEANED_COUNT test processes${NC}"
fi

# Optional: Show remaining elizaos-related processes
remaining=$(pgrep -f "elizaos" 2>/dev/null)
if [ -n "$remaining" ]; then
  echo -e "\n${YELLOW}⚠ Note: Some elizaos processes are still running:${NC}"
  ps -p $remaining -o pid,command 2>/dev/null || true
  echo -e "${YELLOW}These may be legitimate non-test processes.${NC}"
fi

exit 0 