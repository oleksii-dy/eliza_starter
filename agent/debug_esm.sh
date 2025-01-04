# in case you need to debug load
NODE_DEBUG=esm node --trace-deprecation --trace-warnings  --enable-source-maps --heap-prof --expose-gc  --prof --cpu-prof --loader ts-node/esm src/index.ts "--isRoot" "--characters=characters/eliza.character.json"
