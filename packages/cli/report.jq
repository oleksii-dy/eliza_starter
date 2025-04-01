# Process each JSON object (implicitly handles JSON Lines)
. as $log |

# Extract evaluate-related logs
{
  "evaluate_logs": [
    select(.stack[] | contains("AgentRuntime.evaluate")) | {
      "message": .inputArgs | join(" "),
      "stack": .stack | join(" | ")
    }
  ],
  
  # Extract errors
  "errors": [
    select(.inputArgs[0] | test("Error")) | {
      "error": .inputArgs | join(" "),
      "stack": .stack | join(" | ")
    }
  ],
  
  # Extract action registrations
  "actions_registered": [
    select(.inputArgs[0] | test("Registering plugin action|Action .* registered successfully")) | {
      "action": (.inputArgs[1]?.name // .inputArgs[0] | split(" - ")[1] | split(": ")[1]),
      "description": .inputArgs[1]?.description,
      "stack": .stack | join(" | ")
    }
# Process each JSON object (implicitly handles JSON Lines)
. as $log |

# Extract evaluate-related logs
{
  "evaluate_logs": [
    select(.stack[] | contains("AgentRuntime.evaluate")) | {
      "message": .inputArgs | join(" "),
      "stack": .stack | join(" | ")
    }
  ],
  
  # Extract errors
  "errors": [
    select(.inputArgs[0] | test("Error")) | {
      "error": .inputArgs | join(" "),
      "stack": .stack | join(" | ")
    }
  ],
  
  # Extract action registrations
  "actions_registered": [
    select(.inputArgs[0] | test("Registering plugin action|Action .* registered successfully")) | {
      "action": (.inputArgs[1]?.name // .inputArgs[0] | split(" - ")[1] | split(": ")[1]),
      "description": .inputArgs[1]?.description,
      "stack": .stack | join(" | ")
    }
  ],
  
  # Extract performance metrics from providers
  "provider_performance": [
    select(.inputArgs[0] | test("Provider took")) | {
      "provider": .inputArgs[0] | split(" ")[0],
      "time_ms": .inputArgs[0] | split(" ")[3] | tonumber
    }
  ],
  
  # Summary of key events
  "key_events": [
    select(.inputArgs[0] | test("Evaluate|no eval|Post Tweet|WORLD_JOINED")) | {
      "event": .inputArgs | join(" "),
      "stack": .stack | join(" | ")
    }
  ]
}
| 
# Combine results into a single object, filtering out empty arrays
{
  "evaluate_logs": (.evaluate_logs | if length > 0 then . else null end),
  "errors": (.errors | if length > 0 then . else null end),
  "actions_registered": (.actions_registered | if length > 0 then . else null end),
  "provider_performance": (.provider_performance | if length > 0 then . else null end),
  "key_events": (.key_events | if length > 0 then . else null end)
}