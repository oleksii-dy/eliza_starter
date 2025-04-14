import { AgentRuntime, type Character, ChannelType } from '@elizaos/core';
import sqlinit from '@elizaos/plugin-sql';
//import schema from "@elizaos/plugin-sql";

const encryptedChar: Character = {
  name: '',
  bio: '',
};
const runtime = new AgentRuntime({
  character: encryptedChar,
  // plugins: myplugins,
});

async function init() {
  //await runtime.init();
  let sql = await sqlinit.init(1, runtime);
  //console.log(runtime.adapter.db.session._.fullSchema)
  //console.log(schema);
  //console.log(runtime.adapter);
  const c = runtime.getDatabaseSchema();
  console.log('SCHEMA', c);
  //  Top-level await is not available in the configured target environment ("es2021")
  //console.log(runtime.adapter.db.session._.fullSchema);
}

async function main(): Promise<void> {
  const foo = await init();
  console.log(foo);
}

main();
