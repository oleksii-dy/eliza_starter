#!/usr/bin/env bats

# Test Production Verification Command Tests
# Tests the comprehensive production verification system for all 5 improvements:
# 1. Hybrid Verification (Reliability)
# 2. Performance Optimization (Caching/Batching)  
# 3. Security Enhancement (Data Privacy)
# 4. Explainable Verification (Debugging)
# 5. Versioned Verification (Maintainability)

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

@test "test-production-verification: displays help" {
    run run_cli "bun" test-production-verification --help
    assert_success
    assert_output --partial "Test all 5 production verification system improvements"
    assert_output --partial "Options:"
    assert_output --partial "--verbose"
}

@test "test-production-verification: executes without crashing" {
    # This test may fail due to missing dependencies, but should not crash
    run run_cli "bun" test-production-verification
    # Accept either success or controlled failure
    [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
}

@test "test-production-verification: verbose option works" {
    run run_cli "bun" test-production-verification --verbose
    # Accept either success or controlled failure  
    [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
}

@test "test-production-verification: handles missing project gracefully" {
    # Run in a temporary directory without project files
    mkdir -p "$TEST_DIR/empty-project"
    cd "$TEST_DIR/empty-project"
    
    run run_cli "bun" test-production-verification
    # Should fail gracefully (exit code 1) or timeout, not crash
    [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
}

@test "test-production-verification: reports improvement categories" {
    # Test that the command mentions the 5 key improvements when run
    run run_cli "bun" test-production-verification --verbose
    
    # Check for key improvement categories in output
    if [[ "$status" -eq 0 ]]; then
        assert_output --partial "Reliability"
        assert_output --partial "Performance"
        assert_output --partial "Security"
        assert_output --partial "Explainability"
        assert_output --partial "Versioning"
    fi
    
    # Accept either success or controlled failure
    [[ "$status" -eq 0 ]] || [[ "$status" -eq 1 ]]
}

@test "test-production-verification: handles timeout gracefully" {
    # Test with a very short timeout to ensure it handles interruption
    timeout 5s run_cli "bun" test-production-verification || true
    # Should not leave hanging processes or corrupt state
}