#!/usr/bin/env bats

# Cleanup Command Tests
# Tests the cleanup functionality for temporary files and organization

load '../helpers/test-helpers'
load '../helpers/environment-helpers'

setup() {
    setup_test_environment
    export CLI_TEST_MODE=true
    export ELIZA_TEST_MODE=true
}

teardown() {
    cleanup_test_environment
}

@test "cleanup: displays help" {
    run run_cli "bun" cleanup --help
    assert_success
    assert_output --partial "Clean up and organize temporary files"
}

@test "cleanup: executes without error in test mode" {
    run run_cli "bun" cleanup
    assert_success
    assert_output --partial "Cleanup functionality temporarily disabled"
}

@test "cleanup: shows disabled message" {
    run run_cli "bun" cleanup
    assert_success
    assert_output --partial "This feature will be restored in a future update"
}

@test "cleanup: handles invalid options gracefully" {
    run run_cli "bun" cleanup --invalid-option
    assert_failure
    assert_output --partial "error"
}

@test "cleanup: shows consistent disabled message" {
    run run_cli "bun" cleanup
    assert_success
    assert_output --partial "temporarily disabled"
    assert_output --partial "missing imports"
}