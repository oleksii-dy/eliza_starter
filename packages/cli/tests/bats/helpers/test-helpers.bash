#!/usr/bin/env bash

# Load BATS helpers - try multiple locations
if [[ -f "${BATS_TEST_DIRNAME}/../../../../../node_modules/bats-support/load.bash" ]]; then
  # Monorepo root location
  source "${BATS_TEST_DIRNAME}/../../../../../node_modules/bats-support/load.bash"
  source "${BATS_TEST_DIRNAME}/../../../../../node_modules/bats-assert/load.bash"
elif [[ -f "${BATS_TEST_DIRNAME}/../../../node_modules/bats-support/load.bash" ]]; then
  # Local package location
  source "${BATS_TEST_DIRNAME}/../../../node_modules/bats-support/load.bash"
  source "${BATS_TEST_DIRNAME}/../../../node_modules/bats-assert/load.bash"
elif [[ -d "/usr/local/lib/bats-support" ]]; then
  load '/usr/local/lib/bats-support/load'
  load '/usr/local/lib/bats-assert/load'
  load '/usr/local/lib/bats-file/load'
fi

# Global variables
export CLI_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
export CLI_DIST_PATH="${CLI_ROOT}/dist/index.js"
export MONOREPO_ROOT="$(cd "${CLI_ROOT}/../../" && pwd)"

# Setup and teardown functions
setup_test_environment() {
  export TEST_DIR="$(mktemp -d -t eliza-cli-test.XXXXXX)"
  export ORIGINAL_DIR="$(pwd)"
  cd "$TEST_DIR"
  
  # Set test environment variables
  export NODE_ENV="test"
  export ELIZA_NO_AUTO_INSTALL="true"
  export NO_COLOR="1"
}

teardown_test_environment() {
  cd "$ORIGINAL_DIR"
  if [[ -n "$TEST_DIR" && -d "$TEST_DIR" ]]; then
    rm -rf "$TEST_DIR"
  fi
}

# CLI execution helper
run_cli() {
  local context="$1"
  shift
  
  case "$context" in
    "dist")
      node "$CLI_DIST_PATH" "$@"
      ;;
    "global")
      elizaos "$@"
      ;;
    "npx")
      npx @elizaos/cli "$@"
      ;;
    "monorepo")
      cd "$MONOREPO_ROOT"
      node "packages/cli/dist/index.js" "$@"
      cd "$TEST_DIR"
      ;;
    *)
      echo "Unknown context: $context"
      return 1
      ;;
  esac
}

# Character file creation helper
create_test_character() {
  local filename="${1:-test-character.json}"
  # Create directory if it contains a path
  local dir=$(dirname "$filename")
  if [[ "$dir" != "." && ! -d "$dir" ]]; then
    mkdir -p "$dir"
  fi
  cat > "$filename" <<EOF
{
  "name": "TestAgent",
  "description": "A test agent for CLI testing",
  "modelProvider": "openai",
  "settings": {
    "voice": {
      "model": "en_US-male-medium"
    }
  }
}
EOF
}

# Project creation helper
create_test_project() {
  local project_name="${1:-test-project}"
  mkdir -p "$project_name"
  cd "$project_name"
  
  # Create package.json
  cat > package.json <<EOF
{
  "name": "$project_name",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "test": "echo 'Tests passed'"
  },
  "dependencies": {
    "@elizaos/core": "latest"
  }
}
EOF

  # Create index.js
  cat > index.js <<EOF
console.log("Test project running");
process.exit(0);
EOF

  cd ..
}

# Wait for process helper
wait_for_process() {
  local pid="$1"
  local timeout="${2:-10}"
  local count=0
  
  while kill -0 "$pid" 2>/dev/null; do
    if [[ $count -ge $timeout ]]; then
      return 1
    fi
    sleep 1
    ((count++))
  done
  
  return 0
}

# Assert helpers
assert_cli_success() {
  assert_success
  assert [ -n "$output" ]
}

assert_cli_failure() {
  assert_failure
  assert [ -n "$output" ]
}

# Process management helpers
assert_process_running() {
  local pid="$1"
  if ! kill -0 "$pid" 2>/dev/null; then
    fail "Process $pid is not running"
  fi
}

# Start CLI in background without timeout
start_cli_background_with_timeout() {
  local context="$1"
  shift
  # Ignore the timeout parameter if provided for backward compatibility
  if [[ "$1" =~ ^[0-9]+$ ]]; then
    shift
  fi
  
  # Simply start the process in background
  start_cli_background "$context" "$@"
}

# Start CLI in background (legacy - without timeout)
start_cli_background() {
  local context="$1"
  shift
  
  case "$context" in
    "dist")
      node "$CLI_DIST_PATH" "$@" &
      ;;
    "global")
      elizaos "$@" &
      ;;
    "npx")
      npx @elizaos/cli "$@" &
      ;;
    "monorepo")
      cd "$MONOREPO_ROOT"
      node "packages/cli/dist/index.js" "$@" &
      local pid=$!
      cd "$TEST_DIR"
      echo $pid
      return
      ;;
    *)
      echo "Unknown context: $context"
      return 1
      ;;
  esac
  
  echo $!
}

# Kill process and wait for it to die
kill_process_gracefully() {
  local pid="$1"
  
  if [[ -z "$pid" ]]; then
    return 0
  fi
  
  if kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid" 2>/dev/null || true
    
    # Give more time for graceful shutdown
    local count=0
    while kill -0 "$pid" 2>/dev/null && [[ $count -lt 5 ]]; do
      sleep 1
      ((count++))
    done
    
    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
      kill -KILL "$pid" 2>/dev/null || true
    fi
  fi
}

# Parse PIDs from timeout function (for backward compatibility)
parse_timeout_pids() {
  local pid="$1"
  # Just return the PID as-is since we no longer use the server_pid:timer_pid format
  echo "$pid"
}

# Kill both server and timer processes (for backward compatibility)
kill_timeout_processes() {
  local pid="$1"
  # Just kill the process normally since we no longer have timer processes
  kill_process_gracefully "$pid"
}

# Port checking helper
wait_for_port() {
  local port="$1"
  local timeout="${2:-30}"
  local count=0
  
  # Use different port checking methods based on availability
  while true; do
    if command -v nc >/dev/null 2>&1; then
      # Use netcat if available
      if nc -z localhost "$port" 2>/dev/null; then
        return 0
      fi
    elif command -v ss >/dev/null 2>&1; then
      # Use ss if available (common on Linux)
      if ss -tnl | grep -q ":$port "; then
        return 0
      fi
    elif command -v lsof >/dev/null 2>&1; then
      # Use lsof as fallback
      if lsof -ti:$port >/dev/null 2>&1; then
        return 0
      fi
    else
      # No port checking tool available, just wait
      sleep 1
    fi
    
    if [[ $count -ge $timeout ]]; then
      return 1
    fi
    sleep 1
    ((count++))
  done
}

# File assertion helpers
assert_file_contain() {
  local file="$1"
  local content="$2"
  
  if [[ ! -f "$file" ]]; then
    fail "File $file does not exist"
  fi
  
  if ! grep -q "$content" "$file"; then
    fail "File $file does not contain: $content"
  fi
}

assert_dir_exist() {
  local dir="$1"
  
  if [[ ! -d "$dir" ]]; then
    fail "Directory $dir does not exist"
  fi
}

assert_file_exist() {
  local file="$1"
  
  if [[ ! -f "$file" ]]; then
    fail "File $file does not exist"
  fi
}

assert_dir_not_exist() {
  local dir="$1"
  
  if [[ -d "$dir" ]]; then
    fail "Directory $dir exists but should not"
  fi
}

assert_link_exist() {
  local link="$1"
  
  if [[ ! -L "$link" ]]; then
    fail "Symlink $link does not exist"
  fi
} 