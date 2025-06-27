#!/usr/bin/env bats

load 'helpers/test-helpers'
load 'helpers/environment-helpers'

# Quick verification test for comprehensive coverage setup

setup() {
    setup_test_environment
    
}

teardown() {
    teardown_test_environment
}

@test "verify: CLI source exists" {
    [ -f "$CLI_ROOT/src/index.ts" ]
}

@test "verify: can create a simple project" {
    # Set non-interactive mode and test mode to skip installation
    export ELIZA_NONINTERACTIVE=true
    export ELIZA_TEST_MODE=true
    
    # Test with timeout to avoid hanging
    run timeout 30 bash -c "cd '$CLI_ROOT' && bun run src/index.ts create test-project --dir '$TEST_DIR' --yes"
    echo "Status: $status, Output: $output"
    echo "Directory contents: $(ls -la)"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "successfully" || "$output" =~ "initialized" ]]
    [ -d "test-project" ]
}

@test "verify: can create a plugin" {
    # Set non-interactive mode and test mode to skip installation
    export ELIZA_NONINTERACTIVE=true
    export ELIZA_TEST_MODE=true
    
    # Test with timeout to avoid hanging
    run timeout 30 bash -c "cd '$CLI_ROOT' && bun run src/index.ts create test-plugin --dir '$TEST_DIR' --type plugin --yes"
    [ "$status" -eq 0 ]
    [[ "$output" =~ "successfully" ]]
    # Plugin name is shortened to 'plugin-test' not 'plugin-test-plugin'
    [ -d "plugin-test" ]
} 