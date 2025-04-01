
#jq 'select(.stack[]|contains("AgentRuntime.evaluate"))' json.json

#strace -f -s 99999 -o strace.txt
tsx  ./src/index.ts  train  2>&1 | grep ^JSON log.txt  | cut -b 5- > report.json

#jq 'select(.stack[]|contains("AgentRuntime.evaluate"))|.inputArgs' json.json
ojq  -r -f report.jq  report.json
#jq -s . | gron | grep stack  | cut -d. -f2- | sort | uniq -c | sort -n 
#jq -n -r -f extract.jq logs.jsonl > output.json
