. as $log | {
  "evaluate_logs": [.[] | select(.stack[] | contains("AgentRuntime.evaluate")) | {"message": (.inputArgs | join(" ")), "stack": (.stack | join(" | "))}],
  "errors": [.[] | select(.inputArgs[0] | test("Error")) | {"error": (.inputArgs | join(" ")), "stack": (.stack | join(" | "))}],
  
  "provider_performance": [.[] | select(.inputArgs[0] | test("Provider took")) | {"provider": (.inputArgs[0] | split(" ")[0]), "time_ms": (.inputArgs[0] | split(" ")[3] | tonumber)}],
  "key_events": [.[] | select(.inputArgs[0] | test("Evaluate|no eval|Post Tweet|WORLD_JOINED")) | {"event": (.inputArgs | join(" ")), "stack": (.stack | join(" | "))}]
} | {
  "evaluate_logs": (.evaluate_logs | if length > 0 then . else null end),
  "errors": (.errors | if length > 0 then . else null end),
  "actions_registered": (.actions_registered | if length > 0 then . else null end),
  "provider_performance": (.provider_performance | if length > 0 then . else null end),
  "key_events": (.key_events | if length > 0 then . else null end)
}