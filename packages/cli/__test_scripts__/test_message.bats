#!/usr/bin/env bats

setup_file() {
  export TEST_TMP_DIR="$(mktemp -d /var/tmp/eliza-test-message-XXXXXX)"
  export MODEL_DIR="$HOME/.eliza/models"

  if [ -z "$TEST_TMP_DIR" ]; then
    echo "[ERROR] TEST_TMP_DIR is not set!"
    exit 1
  fi
  echo "[DEBUG] TEST_TMP_DIR is: $TEST_TMP_DIR"

  mkdir -p "$MODEL_DIR"
  mkdir -p "$TEST_TMP_DIR/pglite"

  export ELIZAOS_CMD="${ELIZAOS_CMD:-bun run $(cd ../dist && pwd)/index.js}"

  models=(
    "DeepHermes-3-Llama-3-3B-Preview-q4.gguf|https://huggingface.co/NousResearch/DeepHermes-3-Llama-3-3B-Preview-GGUF/resolve/main/DeepHermes-3-Llama-3-3B-Preview-q4.gguf|LOCAL_SMALL_MODEL"
    "DeepHermes-3-Llama-3-8B-q4.gguf|https://huggingface.co/NousResearch/DeepHermes-3-Llama-3-8B-Preview-GGUF/resolve/main/DeepHermes-3-Llama-3-8B-q4.gguf|LOCAL_LARGE_MODEL"
    "bge-small-en-v1.5.Q4_K_M.gguf|https://huggingface.co/ChristianAzinn/bge-small-en-v1.5-gguf/resolve/main/bge-small-en-v1.5.Q4_K_M.gguf|LOCAL_EMBEDDING_MODEL"
  )

  echo "Setting up models in $MODEL_DIR..."
  for model_info in "${models[@]}"; do
    IFS='|' read -r name url env_var <<< "$model_info"
    export "$env_var"="$name"
    local model_path="$MODEL_DIR/$name"
    if [ ! -f "$model_path" ]; then
      echo "Downloading $name to $model_path..."
      # -sS: silent but show errors. -L: follow redirects. -f: fail on server errors.
      if curl -sS -L -f -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" -o "$model_path" "$url"; then
        echo "$name downloaded successfully."
      else
        local curl_exit_status=$?
        echo "[ERROR] Failed to download $name from $url. Curl exit status: $curl_exit_status"
        rm -f "$model_path" # Remove partially downloaded file
        exit 1
      fi
    else
      echo "$name already exists at $model_path."
    fi
  done

  echo "[DEBUG] Server log will be: $TEST_TMP_DIR/server.log"
  echo "Starting ElizaOS server..."
  LOG_LEVEL=debug PGLITE_DATA_DIR="$TEST_TMP_DIR/pglite" \
    $ELIZAOS_CMD start >"$TEST_TMP_DIR/server.log" 2>&1 &
  SERVER_PID=$!

  echo "Waiting for agent list command to succeed (checking if agent running)..."
  for i in {1..12}; do
    run $ELIZAOS_CMD agent list
    if [ "$status" -eq 0 ]; then
      echo "Agent list succeeded!"
      break
    fi
    echo "Agent list failed (attempt $i), status=$status"
    sleep 2
  done

  if [ "$status" -ne 0 ]; then
    echo "[ERROR] Agent list command did not succeed within timeout!"
    echo "--- SERVER LOG ($TEST_TMP_DIR/server.log) ---"
    tail -n 100 "$TEST_TMP_DIR/server.log"
    echo "------------------"
    if ps -p "$SERVER_PID" > /dev/null; then kill -9 "$SERVER_PID" 2>/dev/null || true; fi
    exit 1
  fi

  ELIZA_AGENT_ID=""

  echo "Attempting to get Eliza Agent ID using 'agent list' CLI..."
  run $ELIZAOS_CMD agent list

  echo "--- 'agent list' command details ---"
  echo "Status: $status"
  echo "Output (stdout & stderr combined):
$output"
  echo "----------------------------------"

  if [ "$status" -eq 0 ]; then
    local agent_list_cli_output="$output"
    local cleaned_agent_list_output
    cleaned_agent_list_output=$(echo "$agent_list_cli_output" | sed 's/\x1b\[[0-9;]*m//g') # Remove ANSI escape codes

    local raw_id_from_cli
    raw_id_from_cli=$(echo "$cleaned_agent_list_output" | awk -F '│' '
      BEGIN { IGNORECASE=1 }
      $3 ~ /eliza/ {
        id_field = $4
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", id_field) # Trim whitespace
        print id_field
        exit # Process only the first match
      }')

    if [[ "$raw_id_from_cli" =~ ^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$ ]]; then
      ELIZA_AGENT_ID="$raw_id_from_cli"
      echo "Successfully fetched Eliza Agent ID using CLI: $ELIZA_AGENT_ID"
    else
      echo "[WARNING] 'agent list' CLI output processed, but couldn't parse a valid UUID for Eliza. Raw extracted value: '$raw_id_from_cli'."
      ELIZA_AGENT_ID=""
    fi
  else
    echo "[WARNING] '$ELIZAOS_CMD agent list' failed with status $status. Will try parsing server log."
  fi

  if [ -z "$ELIZA_AGENT_ID" ]; then
    echo "Attempting to get Eliza Agent ID from server log..."
    local server_log_path="$TEST_TMP_DIR/server.log"
    local raw_id_from_log
    # Extracts UUID from lines like "... Started Eliza as UUID ..."
    raw_id_from_log=$(tail -n 100 "$server_log_path" | \
                      sed -nE 's/.*Started Eliza as ([0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}).*/\1/p' | \
                      head -n 1)

    if [[ "$raw_id_from_log" =~ ^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$ ]]; then
      ELIZA_AGENT_ID="$raw_id_from_log"
      echo "Successfully fetched Eliza Agent ID from server log: $ELIZA_AGENT_ID"
    else
      echo "[WARNING] Server log processed, but couldn't parse a valid UUID for Eliza. Raw extracted value: '$raw_id_from_log'"
      ELIZA_AGENT_ID=""
    fi

    if [ -z "$ELIZA_AGENT_ID" ]; then
      echo "[ERROR] Could not find Agent ID for Eliza using CLI or by parsing server log."
      echo "--- Last 100 lines of SERVER LOG ($server_log_path) --- "
      tail -n 100 "$server_log_path"
      echo "----------------------------------------------------"
      if ps -p "$SERVER_PID" > /dev/null; then kill -9 "$SERVER_PID" 2>/dev/null || true; fi
      exit 1
    fi
  fi
  echo "Found Eliza Agent ID: $ELIZA_AGENT_ID"
  export ELIZA_AGENT_ID
}

teardown_file() {
  echo "Tearing down test environment..."
  if [ -n "$SERVER_PID" ]; then
    echo "Stopping server (PID: $SERVER_PID)..."
    if ps -p "$SERVER_PID" > /dev/null; then # Check if process exists
      kill "$SERVER_PID" 2>/dev/null # Attempt graceful shutdown
      for _ in {1..5}; do # Wait up to 5 seconds
          if ! ps -p "$SERVER_PID" > /dev/null; then
              break # Server stopped
          fi
          sleep 1
      done

      if ps -p "$SERVER_PID" > /dev/null; then # If still running, force kill
        echo "Server $SERVER_PID did not stop gracefully, forcing kill..."
        kill -9 "$SERVER_PID" 2>/dev/null || true
      else
        echo "Server $SERVER_PID stopped."
      fi
    else
        echo "Server $SERVER_PID was not running or already stopped."
    fi
    wait "$SERVER_PID" 2>/dev/null || true # Clean up zombie process if any
  fi

  if [ -n "$TEST_TMP_DIR" ] && [ -d "$TEST_TMP_DIR" ]; then
    echo "Cleaning up temporary directory $TEST_TMP_DIR..."
    rm -rf "$TEST_TMP_DIR"
  fi
}

@test "Send message to Eliza agent and get a response" {
  if [ -z "$ELIZA_AGENT_ID" ]; then
    echo "FATAL: ELIZA_AGENT_ID is not set. Skipping test."
    skip "ELIZA_AGENT_ID not set"
    return 1
  fi

  local payload
  # Using printf for safer JSON string construction with variables
  printf -v payload '{"entityId":"31c75add-3a49-4bb1-ad40-92c6b4c39558","roomId":"%s","source":"client_chat","text":"Can you help with creating a new channel for agent-dev-school?","channelType":"API"}' "$ELIZA_AGENT_ID"

  run curl -s -X POST -H "Content-Type: application/json" -d "$payload" "http://localhost:3000/api/agents/$ELIZA_AGENT_ID/message"

  [ "$status" -eq 0 ]
  [[ "$output" == *'"thought":'* ]]
}