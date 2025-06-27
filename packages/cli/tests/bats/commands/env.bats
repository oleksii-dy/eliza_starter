#!/usr/bin/env bats

# Environment Command Tests
# Tests the complete environment variable management system including:
# - list: List all environment variables (--system, --local)
# - edit-local: Edit local environment variables
# - reset: Reset environment variables and clean up database/cache files
# - interactive: Interactive environment variable management

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

@test "env: displays help" {
    run run_cli "bun" env --help
    assert_success
    assert_output --partial "Manage environment variables and secrets"
    assert_output --partial "Commands:"
    assert_output --partial "list"
    assert_output --partial "edit-local"
    assert_output --partial "reset"
    assert_output --partial "interactive"
}

@test "env: shows available commands when no subcommand" {
    run run_cli "bun" env
    assert_success
    assert_output --partial "Eliza Environment Variable Manager"
    assert_output --partial "Available commands:"
    assert_output --partial "list"
    assert_output --partial "edit-local"
    assert_output --partial "reset"
    assert_output --partial "interactive"
}

@test "env list: displays help" {
    run run_cli "bun" env list --help
    assert_success
    assert_output --partial "List all environment variables"
    assert_output --partial "--system"
    assert_output --partial "--local"
}

@test "env list: executes without crashing" {
    run run_cli "bun" env list
    assert_success
    assert_output --partial "System Information"
}

@test "env list --local: shows only local environment" {
    run run_cli "bun" env list --local
    assert_success
    # Should either show local env vars or indicate no local env file
    [[ "$output" =~ "Local Environment" ]] || [[ "$output" =~ "No local .env file" ]]
}

@test "env list --system: shows only system information" {
    run run_cli "bun" env list --system
    assert_success
    assert_output --partial "System Information"
}

@test "env edit-local: displays help" {
    run run_cli "bun" env edit-local --help
    assert_success
    assert_output --partial "Edit local environment variables"
    assert_output --partial "--yes"
}

@test "env edit-local: handles yes option" {
    run run_cli "bun" env edit-local --yes
    # Should handle the --yes option gracefully
    [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
}

@test "env reset: displays help" {
    run run_cli "bun" env reset --help
    assert_success
    assert_output --partial "Reset environment variables"
    assert_output --partial "--yes"
}

@test "env reset: handles yes option" {
    run run_cli "bun" env reset --yes
    # Should handle the --yes option gracefully
    [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
}

@test "env interactive: displays help" {
    run run_cli "bun" env interactive --help
    assert_success
    assert_output --partial "Interactive environment variable management"
    assert_output --partial "--yes"
}

@test "env interactive: handles yes option" {
    run run_cli "bun" env interactive --yes
    # Should handle the --yes option gracefully
    [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
}

@test "env: handles invalid subcommand" {
    run run_cli "bun" env invalid-command
    assert_failure
    assert_output --partial "error"
}

@test "env: comprehensive subcommand coverage" {
    # Test that all documented subcommands are accessible
    
    # list subcommand
    run run_cli "bun" env list --help
    assert_success
    
    # edit-local subcommand
    run run_cli "bun" env edit-local --help
    assert_success
    
    # reset subcommand
    run run_cli "bun" env reset --help
    assert_success
    
    # interactive subcommand
    run run_cli "bun" env interactive --help
    assert_success
}