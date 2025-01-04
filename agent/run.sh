#!/bin/bash
# 
#node --trace-event-categories node,node.bootstrap,node.console,node.vm.script,v8,node.http,node.net.native,node.environment    --enable-source-maps --heap-prof --expose-gc  --prof --cpu-prof --loader ts-node/esm src/index.ts "--isRoot" "--characters=characters/eliza.character.json"

#node --import telemetry.js --trace-event-categories node,node.bootstrap,node.console,node.vm.script,v8,node.http,node.net.native,node.environment    --enable-source-maps --heap-prof --expose-gc  --prof --cpu-prof --loader ts-node/esm src/index.ts "--isRoot" "--characters=characters/eliza.character.json"
#strace -f -o str
node  --trace-event-categories node,node.bootstrap,node.console,node.vm.script,v8,node.http,node.net.native,node.environment  --enable-source-maps --prof    --cpu-prof --loader ts-node/esm src/index.ts "--isRoot" "--characters=characters/eliza.character.json"
# --cpu-prof
#node    --loader ts-node/esm src/index.ts "--isRoot" "--characters=characters/eliza.character.json"
