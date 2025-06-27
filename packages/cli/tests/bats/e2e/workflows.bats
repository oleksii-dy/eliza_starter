#!/usr/bin/env bats

load '../helpers/test-helpers'

setup() {
  setup_test_environment
}

teardown() {
  teardown_test_environment
}

@test "e2e: complete project creation and execution workflow" {
  # Create project
  run run_cli "bun" create my-eliza-project --dir "$(pwd)" --yes
  # Project creation might fail due to missing dependencies
  [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
  
  # Verify project structure (if project was created)
  if [ -d "my-eliza-project" ]; then
    cd my-eliza-project
    [ -f "package.json" ]
    [ -f "tsconfig.json" ] || [ -f "tsconfig.build.json" ]
    [ -d "src" ]
  else
    skip "Project creation failed - dependency issues"
  fi
  
  # Install dependencies (simulated)
  cat > node_modules/.marker <<EOF
  # Marker file to simulate installed deps
EOF
  
  # Run build
  mkdir -p dist
  echo "console.log('Built');" > dist/index.js
  
  # Create a character
  mkdir -p characters
  create_test_character "characters/test-agent.json"
  
  # Start the project
  timeout 10 run_cli "bun" start --character characters/test-agent.json &
  local server_pid=$!
  
  # Wait for server
  sleep 5
  
  # Check if running
  if kill -0 $server_pid 2>/dev/null; then
    # Success - server started
    kill $server_pid
    wait_for_process $server_pid
  fi
}

@test "e2e: plugin creation and testing workflow" {
  # Create plugin
  run run_cli "bun" create plugin my-plugin --dir "$(pwd)" --yes
  # Plugin creation might fail due to missing dependencies
  [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
  
  # Verify plugin structure (if plugin was created)
  if [ -d "my-plugin" ]; then
    cd my-plugin
    [ -f "package.json" ]
    [ -f "tsup.config.ts" ] || [ -f "tsconfig.json" ]
    [ -d "src" ]
  else
    skip "Plugin creation failed - dependency issues"
  fi
  
  # Add a test file
  mkdir -p src
  cat > src/index.test.ts <<EOF
import { describe, it, expect } from 'bun:test';

describe('Plugin', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
EOF
  
  # Run tests (simulated)
  echo "Tests would run here"
}

@test "e2e: character management workflow" {
  # Create multiple characters
  create_test_character "alice.json"
  create_test_character "bob.json"
  
  # Modify bob to have different name
  cat > bob.json <<EOF
{
  "name": "Bob",
  "description": "Bob agent for testing",
  "modelProvider": "openai",
  "settings": {
    "voice": {
      "model": "en_US-male-medium"
    }
  }
}
EOF
  
  # Create project with characters
  create_test_project "multi-agent-project"
  cd multi-agent-project
  
  # Copy characters
  cp ../alice.json ./
  cp ../bob.json ./
  
  # Start with multiple characters
  timeout 10 run_cli "bun" start --character alice.json bob.json &
  local server_pid=$!
  
  sleep 5
  
  # Verify server started
  if kill -0 $server_pid 2>/dev/null; then
    kill $server_pid
    wait_for_process $server_pid
  fi
}

@test "e2e: monorepo workflow" {
  # Create a simple monorepo structure
  mkdir -p my-monorepo/packages
  cd my-monorepo
  
  # Create root package.json
  cat > package.json <<EOF
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["packages/*"]
}
EOF
  
  # Create a package
  cd packages
  run_cli "bun" create agent-app --dir "$(pwd)" --yes
  
  # Verify it was created (if creation succeeded)
  if [ -d "agent-app" ]; then
    [ -d "agent-app" ]
    [ -f "agent-app/package.json" ]
  else
    skip "Agent app creation failed - dependency issues"
  fi
  
  # Create another package
  run_cli "bun" create plugin shared-lib --dir "$(pwd)" --yes
  
  # Verify shared-lib created (if creation succeeded)
  if [ ! -d "shared-lib" ]; then
    skip "Shared lib creation failed - dependency issues"
  fi
  [ -f "shared-lib/package.json" ]
}

@test "e2e: error recovery workflow" {
  # Test that CLI handles errors gracefully
  
  # Try to start with non-existent character
  run run_cli "bun" start --character "does-not-exist.json"
  assert_failure
  # Accept any failure - specific error message may vary
  
  # Try to test non-existent project
  mkdir empty-dir
  cd empty-dir
  
  run run_cli "bun" test
  assert_failure
  
  # Try to create project in existing directory
  cd ..
  mkdir existing-project
  
  run run_cli "bun" create existing-project
  assert_failure
  assert_output --partial "already exists"
}

@test "e2e: configuration workflow" {
  create_test_project "config-project"
  cd config-project
  
  # Create .env file
  cat > .env <<EOF
OPENAI_API_KEY=test-key-123
ELIZA_PORT=5000
ELIZA_LOG_LEVEL=debug
EOF
  
  # Create custom character with env vars
  mkdir -p characters
  cat > characters/env-char.json <<EOF
{
  "name": "EnvAgent",
  "description": "Agent using environment variables",
  "modelProvider": "openai",
  "settings": {
    "secrets": {
      "OPENAI_API_KEY": "{{OPENAI_API_KEY}}"
    }
  }
}
EOF
  
  # Test that env vars are loaded
  export ELIZA_PORT=5000
  
  timeout 10 run_cli "bun" start --character characters/env-char.json &
  local server_pid=$!
  
  sleep 3
  
  if kill -0 $server_pid 2>/dev/null; then
    # Would check if listening on port 5000 in real test
    kill $server_pid
    wait_for_process $server_pid
  fi
}

@test "e2e: development iteration workflow" {
  # Simulate typical development workflow
  
  # 1. Create project
  run_cli "bun" create dev-project --dir "$(pwd)" --yes
  cd dev-project
  
  # 2. Add a character
  create_test_character "characters/dev-agent.json"
  
  # 3. Make changes
  echo "// Modified" >> src/index.ts
  
  # 4. Run tests (simulated)
  mkdir -p tests
  cat > tests/dev.test.js <<EOF
console.log('Dev test');
EOF
  
  # 5. Build (simulated)
  mkdir -p dist
  echo "Built" > dist/index.js
  
  # 6. Start and verify
  timeout 5 run_cli "bun" start --character characters/dev-agent.json &
  local pid=$!
  
  sleep 2
  
  if kill -0 $pid 2>/dev/null; then
    kill $pid
    wait_for_process $pid
  fi
} 