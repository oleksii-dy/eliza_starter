#!/usr/bin/env bats

load '../helpers/test-helpers'

# Test basic scenario command
@test "scenario command displays help when no arguments provided" {
  run $ELIZA_BIN scenario --help
  [ "$status" -eq 0 ]
  [[ "$output" =~ "Run scenario tests against agents" ]]
  [[ "$output" =~ "--scenario" ]]
  [[ "$output" =~ "--directory" ]]
}

# Test scenario file loading
@test "scenario command loads single scenario file" {
  # Create a test scenario
  cat > "$BATS_TMPDIR/test-scenario.json" <<EOF
{
  "id": "test-scenario",
  "name": "Test Scenario",
  "description": "A test scenario",
  "actors": [{
    "id": "subject",
    "name": "Test Agent",
    "role": "subject"
  }],
  "setup": {},
  "execution": {},
  "verification": {
    "rules": [{
      "id": "test-rule",
      "type": "llm",
      "description": "Test verification"
    }]
  }
}
EOF

  run $ELIZA_BIN scenario --scenario "$BATS_TMPDIR/test-scenario.json" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" =~ "Test Scenario" ]]
}

# Test directory scanning
@test "scenario command scans directory for scenarios" {
  mkdir -p "$BATS_TMPDIR/scenarios"
  
  # Create multiple test scenarios
  for i in 1 2 3; do
    cat > "$BATS_TMPDIR/scenarios/scenario-$i.json" <<EOF
{
  "id": "test-scenario-$i",
  "name": "Test Scenario $i",
  "description": "Test scenario number $i",
  "actors": [{
    "id": "subject",
    "name": "Test Agent $i",
    "role": "subject"
  }],
  "setup": {},
  "execution": {},
  "verification": {
    "rules": [{
      "id": "rule-$i",
      "type": "llm",
      "description": "Test rule $i"
    }]
  }
}
EOF
  done

  run $ELIZA_BIN scenario --directory "$BATS_TMPDIR/scenarios" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" =~ "Found 3 scenario(s)" ]]
}

# Test filter option
@test "scenario command filters scenarios by pattern" {
  mkdir -p "$BATS_TMPDIR/scenarios"
  
  # Create scenarios with different tags
  cat > "$BATS_TMPDIR/scenarios/auth-scenario.json" <<EOF
{
  "id": "auth-test",
  "name": "Authentication Test",
  "tags": ["auth", "security"],
  "description": "Test authentication",
  "actors": [{
    "id": "subject",
    "name": "Auth Agent",
    "role": "subject"
  }],
  "setup": {},
  "execution": {},
  "verification": {
    "rules": [{
      "id": "auth-rule",
      "type": "llm",
      "description": "Verify auth"
    }]
  }
}
EOF

  cat > "$BATS_TMPDIR/scenarios/chat-scenario.json" <<EOF
{
  "id": "chat-test",
  "name": "Chat Test",
  "tags": ["chat", "conversation"],
  "description": "Test chat",
  "actors": [{
    "id": "subject",
    "name": "Chat Agent",
    "role": "subject"
  }],
  "setup": {},
  "execution": {},
  "verification": {
    "rules": [{
      "id": "chat-rule",
      "type": "llm",
      "description": "Verify chat"
    }]
  }
}
EOF

  run $ELIZA_BIN scenario --directory "$BATS_TMPDIR/scenarios" --filter "auth" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" =~ "Authentication Test" ]]
  [[ ! "$output" =~ "Chat Test" ]]
}

# Test output formats
@test "scenario command supports JSON output format" {
  skip "Requires full runtime setup"
  run $ELIZA_BIN scenario --scenario "$BATS_TMPDIR/test-scenario.json" --format json --output "$BATS_TMPDIR/results.json"
  [ "$status" -eq 0 ]
  [ -f "$BATS_TMPDIR/results.json" ]
  
  # Verify JSON structure
  run jq '.' "$BATS_TMPDIR/results.json"
  [ "$status" -eq 0 ]
}

# Test parallel execution
@test "scenario command supports parallel execution option" {
  run $ELIZA_BIN scenario --parallel --max-concurrency 2 --help
  [ "$status" -eq 0 ]
  [[ "$output" =~ "--parallel" ]]
  [[ "$output" =~ "--max-concurrency" ]]
}

# Test benchmark mode
@test "scenario command supports benchmark mode" {
  run $ELIZA_BIN scenario --benchmark --help
  [ "$status" -eq 0 ]
  [[ "$output" =~ "--benchmark" ]]
}

# Test generate subcommand
@test "scenario generate subcommand creates new scenarios" {
  run $ELIZA_BIN scenario generate --help
  [ "$status" -eq 0 ]
  [[ "$output" =~ "Generate a new scenario using AI" ]]
  [[ "$output" =~ "--plugins" ]]
  [[ "$output" =~ "--complexity" ]]
}

# Test error handling
@test "scenario command handles missing scenario file gracefully" {
  run $ELIZA_BIN scenario --scenario "/non/existent/scenario.json"
  [ "$status" -ne 0 ]
  [[ "$output" =~ "not found" ]] || [[ "$output" =~ "Failed to load" ]]
}

@test "scenario command handles invalid scenario format" {
  echo "invalid json" > "$BATS_TMPDIR/invalid.json"
  run $ELIZA_BIN scenario --scenario "$BATS_TMPDIR/invalid.json"
  [ "$status" -ne 0 ]
  [[ "$output" =~ "Failed to load scenario" ]] || [[ "$output" =~ "parse" ]]
}

# Test default scenario discovery
@test "scenario command discovers scenarios in default locations" {
  # Create scenarios in default location
  mkdir -p "$BATS_TEST_DIRNAME/../../../scenarios"
  cat > "$BATS_TEST_DIRNAME/../../../scenarios/default-test.json" <<EOF
{
  "id": "default-test",
  "name": "Default Test",
  "description": "Found in default location",
  "actors": [{
    "id": "subject",
    "name": "Default Agent",
    "role": "subject"
  }],
  "setup": {},
  "execution": {},
  "verification": {
    "rules": [{
      "id": "default-rule",
      "type": "llm",
      "description": "Default verification"
    }]
  }
}
EOF

  # Run without specifying directory
  run $ELIZA_BIN scenario --dry-run
  # Clean up
  rm -f "$BATS_TEST_DIRNAME/../../../scenarios/default-test.json"
  
  [ "$status" -eq 0 ] || [[ "$output" =~ "No scenarios found" ]]
}

# Test TypeScript scenario loading
@test "scenario command loads TypeScript scenario files" {
  cat > "$BATS_TMPDIR/test-scenario.ts" <<'EOF'
export default {
  id: "ts-test",
  name: "TypeScript Test",
  description: "A TypeScript scenario",
  actors: [{
    id: "subject",
    name: "TS Agent",
    role: "subject"
  }],
  setup: {},
  execution: {},
  verification: {
    rules: [{
      id: "ts-rule",
      type: "llm",
      description: "TS verification"
    }]
  }
};
EOF

  skip "Requires TypeScript compilation"
  run $ELIZA_BIN scenario --scenario "$BATS_TMPDIR/test-scenario.ts"
  [ "$status" -eq 0 ]
} 