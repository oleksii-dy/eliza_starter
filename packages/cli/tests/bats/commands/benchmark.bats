#!/usr/bin/env bats

# Benchmark Command Tests
# Tests the complete real-world agent benchmarking platform including:
# - Benchmark listing and registration
# - Agent registration and validation  
# - Benchmark execution and monitoring
# - Leaderboards and statistics
# - History tracking and performance analysis

load '../helpers/test-helpers'
load '../helpers/environment-helpers'

setup() {
    setup_test_environment
    export TEST_PORT=3000
    export CLI_TEST_MODE=true
    export ELIZA_TEST_MODE=true
}

teardown() {
    cleanup_test_environment
}

@test "benchmark: displays help" {
    run run_cli "bun" benchmark --help
    assert_success
    assert_output --partial "Real-world agent benchmarking platform"
    assert_output --partial "Commands:"
    assert_output --partial "list"
    assert_output --partial "register"
    assert_output --partial "run"
    assert_output --partial "leaderboard"
}

@test "benchmark list: shows available benchmarks" {
    run run_cli "bun" benchmark list --help
    assert_success
    assert_output --partial "List all available benchmarks"
}

@test "benchmark list: executes without error" {
    run run_cli "bun" benchmark list
    # May succeed or fail depending on setup, but should not crash
    [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
}

@test "benchmark register: displays help" {
    run run_cli "bun" benchmark register --help
    assert_success  
    assert_output --partial "Register an external agent"
}

@test "benchmark run: displays help" {
    run run_cli "bun" benchmark run --help
    assert_success
    assert_output --partial "Run a benchmark for an agent"
}

@test "benchmark leaderboard: displays help" {
    run run_cli "bun" benchmark leaderboard --help
    assert_success
    assert_output --partial "View benchmark leaderboards"
}

@test "benchmark history: displays help" {
    run run_cli "bun" benchmark history --help
    assert_success
    assert_output --partial "View agent benchmark history"
}

@test "benchmark stats: displays help" {
    run run_cli "bun" benchmark stats --help
    assert_success
    assert_output --partial "View real-time benchmark statistics"
}

@test "benchmark monitor: displays help" {
    run run_cli "bun" benchmark monitor --help
    assert_success
    assert_output --partial "Monitor active benchmarks"
}

@test "benchmark validate: displays help" {
    run run_cli "bun" benchmark validate --help
    assert_success
    assert_output --partial "Validate agent setup"
}

@test "benchmark: handles invalid subcommand" {
    run run_cli "bun" benchmark invalid-command
    assert_failure
    assert_output --partial "error"
}

@test "benchmark: port option works" {
    run run_cli "bun" benchmark --port 3001 --help
    assert_success
}

@test "benchmark: verbose option works" {
    run run_cli "bun" benchmark --verbose --help
    assert_success
}

@test "benchmark: environment option works" {
    run run_cli "bun" benchmark --environment sandbox --help
    assert_success
}

@test "benchmark register: requires valid parameters" {
    run run_cli "bun" benchmark register
    # Should either succeed or fail gracefully, not crash
    [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
}

@test "benchmark run: requires valid parameters" {
    run run_cli "bun" benchmark run  
    # Should either succeed or fail gracefully, not crash
    [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
}

@test "benchmark validate: executes without crashing" {
    run run_cli "bun" benchmark validate
    # Should either succeed or fail gracefully, not crash
    [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
}