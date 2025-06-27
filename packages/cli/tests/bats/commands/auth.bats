#!/usr/bin/env bats

# ElizaOS CLI Auth Command Tests

setup() {
  load '../helpers/test-helpers'
  load '../helpers/environment-helpers'
  setup_test_environment
  
  # Store original keychain state
  export ORIGINAL_ELIZAOS_API_KEY="${ELIZAOS_API_KEY:-}"
  unset ELIZAOS_API_KEY
  
  # Create temp auth config for testing
  export TEST_AUTH_CONFIG="${BATS_TEST_TMPDIR}/.eliza/auth.json"
  mkdir -p "$(dirname "$TEST_AUTH_CONFIG")"
}

teardown() {
  # Restore original state
  if [ -n "$ORIGINAL_ELIZAOS_API_KEY" ]; then
    export ELIZAOS_API_KEY="$ORIGINAL_ELIZAOS_API_KEY"
  fi
  
  # Clean up test files
  rm -rf "${BATS_TEST_TMPDIR}/.eliza"
  
  cleanup_test_environment
}

@test "auth: displays help" {
  run run_cli "bun" auth --help
  assert_success
  assert_output --partial "Manage ElizaOS platform authentication"
  assert_output --partial "auth login"
  assert_output --partial "auth register"
  assert_output --partial "auth logout"
  assert_output --partial "auth status"
  assert_output --partial "auth key"
}

@test "auth status: shows not authenticated when logged out" {
  run run_cli "bun" auth status
  assert_success
  assert_output --partial "Not authenticated"
}

@test "auth key: requires authentication" {
  run run_cli "bun" auth key
  assert_success
  assert_output --partial "You need to be logged in"
}

@test "auth logout: handles not logged in state" {
  run run_cli "bun" auth logout
  assert_success
  assert_output --partial "You are not currently logged in"
}

@test "auth: default command shows status" {
  run run_cli "bun" auth
  assert_success
  assert_output --partial "Not authenticated"
}
