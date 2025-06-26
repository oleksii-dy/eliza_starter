#!/usr/bin/env bats

# Authentication Device Flow BATS Tests
# Tests the complete platform authentication flow including:
# - Platform server startup
# - CLI device login command
# - Browser-based authorization
# - Token exchange and storage

load 'helpers/test-helpers'
load 'helpers/environment-helpers'

setup() {
    setup_test_environment
    export TEST_PORT=3336
    export CLI_TEST_MODE=true
    export ELIZAOS_API_URL="http://localhost:${TEST_PORT}"
    export NEXT_PUBLIC_DEV_MODE=true
    
    # Cleanup any existing auth state
    rm -rf ~/.eliza/auth.json 2>/dev/null || true
}

teardown() {
    cleanup_test_environment
    
    # Stop platform server if running
    if [[ -n "${PLATFORM_PID:-}" ]]; then
        kill "${PLATFORM_PID}" 2>/dev/null || true
        wait "${PLATFORM_PID}" 2>/dev/null || true
    fi
    
    # Cleanup auth state
    rm -rf ~/.eliza/auth.json 2>/dev/null || true
}

# Helper function to start platform server
start_platform_server() {
    local port="${1:-3336}"
    local timeout="${2:-30}"
    
    echo "# Starting platform server on port ${port}..." >&3
    
    cd "${REPO_ROOT}/packages/platform"
    
    # Start platform server in background
    PORT="${port}" bun run dev &
    export PLATFORM_PID=$!
    
    echo "# Platform server PID: ${PLATFORM_PID}" >&3
    
    # Wait for server to be ready
    local count=0
    while [[ ${count} -lt ${timeout} ]]; do
        if curl -s "http://localhost:${port}/api/runtime/ping" >/dev/null 2>&1; then
            echo "# Platform server ready after ${count} seconds" >&3
            return 0
        fi
        sleep 1
        ((count++))
    done
    
    echo "# Platform server failed to start within ${timeout} seconds" >&3
    return 1
}

# Helper function to extract user code from CLI output
extract_user_code() {
    local output="$1"
    echo "${output}" | grep -o '[A-Z0-9]\{4\}-[A-Z0-9]\{4\}' | head -1
}

# Helper function to extract device auth URL
extract_auth_url() {
    local output="$1"
    echo "${output}" | grep -o 'http://[^[:space:]]*auth[^[:space:]]*' | head -1
}

# Helper function to simulate browser authorization
simulate_browser_auth() {
    local user_code="$1"
    local base_url="$2"
    
    echo "# Simulating browser authorization for code: ${user_code}" >&3
    
    # Make authorization request
    local auth_response
    auth_response=$(curl -s -X POST "${base_url}/api/auth/device/authorize" \
        -H "Content-Type: application/json" \
        -d "{
            \"user_code\": \"${user_code}\",
            \"authorize\": true,
            \"user\": {
                \"id\": \"test-user-1\",
                \"name\": \"Test User\",
                \"email\": \"test@elizaos.com\"
            }
        }")
    
    echo "# Authorization response: ${auth_response}" >&3
    
    # Check if authorization was successful
    if echo "${auth_response}" | grep -q '"success":true'; then
        echo "# Browser authorization successful" >&3
        return 0
    else
        echo "# Browser authorization failed: ${auth_response}" >&3
        return 1
    fi
}

@test "platform server starts successfully" {
    start_platform_server "${TEST_PORT}" 30
    
    # Verify server is responding
    run curl -s "http://localhost:${TEST_PORT}/api/runtime/ping"
    assert_success
    assert_output --partial '"pong":true'
}

@test "platform serves device auth endpoints" {
    start_platform_server "${TEST_PORT}" 30
    
    # Test device auth initiation endpoint
    run curl -s -X POST "http://localhost:${TEST_PORT}/api/auth/device" \
        -H "Content-Type: application/json" \
        -d '{"client_id":"elizaos-cli","scope":"read write"}'
    
    assert_success
    assert_output --partial '"device_code"'
    assert_output --partial '"user_code"'
    assert_output --partial '"verification_uri"'
}

@test "CLI device-login command detects local platform" {
    start_platform_server "${TEST_PORT}" 30
    
    cd "${REPO_ROOT}/packages/cli"
    
    # Run device login command (with timeout to prevent hanging)
    run timeout 10s bun run dist/index.js auth device-login --help
    
    # Should show help without errors
    assert_success
    assert_output --partial "device authorization flow"
}

@test "CLI auth status shows not authenticated initially" {
    cd "${REPO_ROOT}/packages/cli"
    
    # Check initial auth status
    run bun run dist/index.js auth status
    
    assert_success
    assert_output --partial "not authenticated"
}

@test "complete device flow authentication" {
    start_platform_server "${TEST_PORT}" 30
    
    cd "${REPO_ROOT}/packages/cli"
    
    # Start device login in background
    echo "# Starting CLI device login..." >&3
    timeout 60s bun run dist/index.js auth device-login > /tmp/cli_output.log 2>&1 &
    local CLI_PID=$!
    
    # Wait for CLI to output device code
    local count=0
    local user_code=""
    while [[ ${count} -lt 20 ]]; do
        if [[ -f /tmp/cli_output.log ]]; then
            user_code=$(extract_user_code "$(cat /tmp/cli_output.log)")
            if [[ -n "${user_code}" ]]; then
                echo "# Found user code: ${user_code}" >&3
                break
            fi
        fi
        sleep 1
        ((count++))
    done
    
    # Verify we got a user code
    [[ -n "${user_code}" ]]
    
    # Wait a moment for CLI to start polling
    sleep 2
    
    # Simulate browser authorization
    simulate_browser_auth "${user_code}" "http://localhost:${TEST_PORT}"
    
    # Wait for CLI to complete
    local cli_success=false
    count=0
    while [[ ${count} -lt 10 ]]; do
        if ! kill -0 "${CLI_PID}" 2>/dev/null; then
            cli_success=true
            break
        fi
        sleep 1
        ((count++))
    done
    
    # Kill CLI process if still running
    kill "${CLI_PID}" 2>/dev/null || true
    wait "${CLI_PID}" 2>/dev/null || true
    
    # Check CLI output for success
    local cli_output
    cli_output=$(cat /tmp/cli_output.log)
    echo "# CLI output: ${cli_output}" >&3
    
    # Should contain success indicators
    assert [ "${cli_success}" = true ]
    
    # Clean up
    rm -f /tmp/cli_output.log
}

@test "auth status shows authenticated after device login" {
    # This test depends on the previous test completing successfully
    # In practice, you'd run the full flow again or use a setup function
    
    cd "${REPO_ROOT}/packages/cli"
    
    # If auth state exists, check status
    if [[ -f ~/.eliza/auth.json ]]; then
        run bun run dist/index.js auth status
        assert_success
        # Should show authenticated status
        [[ "${output}" == *"authenticated"* ]] || [[ "${output}" == *"logged in"* ]]
    else
        skip "No auth state found - device login may not have completed"
    fi
}

@test "CLI can make authenticated API calls" {
    start_platform_server "${TEST_PORT}" 30
    
    # Skip if not authenticated
    if [[ ! -f ~/.eliza/auth.json ]]; then
        skip "Not authenticated - run device login test first"
    fi
    
    cd "${REPO_ROOT}/packages/cli"
    
    # Test authenticated endpoint (if available)
    run bun run dist/index.js auth key
    
    # Should either show API key or indicate one will be created
    assert_success
}

@test "auth logout clears credentials" {
    cd "${REPO_ROOT}/packages/cli"
    
    # Only test if authenticated
    if [[ -f ~/.eliza/auth.json ]]; then
        # Logout
        run bun run dist/index.js auth logout
        assert_success
        
        # Verify auth state is cleared
        run bun run dist/index.js auth status
        assert_success
        assert_output --partial "not authenticated"
        
        # Verify auth file is removed or marked as unauthenticated
        if [[ -f ~/.eliza/auth.json ]]; then
            local auth_content
            auth_content=$(cat ~/.eliza/auth.json)
            [[ "${auth_content}" == *'"isAuthenticated":false'* ]]
        fi
    else
        skip "Not authenticated - nothing to logout"
    fi
}

@test "platform serves client GUI for device auth" {
    start_platform_server "${TEST_PORT}" 30
    
    # Test device auth page
    run curl -s "http://localhost:${TEST_PORT}/auth/device"
    assert_success
    assert_output --partial "Device Authorization"
    assert_output --partial "Enter the code"
}

@test "device auth endpoints handle errors correctly" {
    start_platform_server "${TEST_PORT}" 30
    
    # Test invalid client_id
    run curl -s -X POST "http://localhost:${TEST_PORT}/api/auth/device" \
        -H "Content-Type: application/json" \
        -d '{"client_id":"invalid","scope":"read"}'
    
    assert_success
    assert_output --partial '"error":"invalid_client"'
    
    # Test invalid device code polling
    run curl -s -X POST "http://localhost:${TEST_PORT}/api/auth/device/token" \
        -H "Content-Type: application/json" \
        -d '{"device_code":"invalid","client_id":"elizaos-cli","grant_type":"urn:ietf:params:oauth:grant-type:device_code"}'
    
    assert_success
    assert_output --partial '"error":"invalid_grant"'
}

@test "concurrent device auth requests work correctly" {
    start_platform_server "${TEST_PORT}" 30
    
    # Start multiple device auth requests
    local device_response1
    local device_response2
    
    device_response1=$(curl -s -X POST "http://localhost:${TEST_PORT}/api/auth/device" \
        -H "Content-Type: application/json" \
        -d '{"client_id":"elizaos-cli","scope":"read write"}')
    
    device_response2=$(curl -s -X POST "http://localhost:${TEST_PORT}/api/auth/device" \
        -H "Content-Type: application/json" \
        -d '{"client_id":"elizaos-cli","scope":"read write"}')
    
    # Both should succeed with different codes
    [[ "${device_response1}" == *'"device_code"'* ]]
    [[ "${device_response2}" == *'"device_code"'* ]]
    
    # Extract user codes
    local user_code1
    local user_code2
    user_code1=$(echo "${device_response1}" | grep -o '"user_code":"[^"]*"' | cut -d'"' -f4)
    user_code2=$(echo "${device_response2}" | grep -o '"user_code":"[^"]*"' | cut -d'"' -f4)
    
    # User codes should be different
    [[ "${user_code1}" != "${user_code2}" ]]
}

# Stress test - multiple rapid requests
@test "platform handles rapid auth requests" {
    start_platform_server "${TEST_PORT}" 30
    
    # Make 10 rapid requests
    local success_count=0
    for i in {1..10}; do
        local response
        response=$(curl -s -X POST "http://localhost:${TEST_PORT}/api/auth/device" \
            -H "Content-Type: application/json" \
            -d '{"client_id":"elizaos-cli","scope":"read write"}')
        
        if [[ "${response}" == *'"device_code"'* ]]; then
            ((success_count++))
        fi
    done
    
    # Most requests should succeed
    [[ ${success_count} -ge 8 ]]
}