// Test to reproduce the runtime.getSetting issue

import('@elizaos/core').then(({ AgentRuntime }) => {
  const runtime = new AgentRuntime({
    character: { name: 'Test' },
    plugins: [],
    settings: {}
  });
  
  console.log('Runtime type:', runtime.constructor.name);
  console.log('Has getSetting?', typeof runtime.getSetting);
  console.log('getSetting value:', runtime.getSetting);
  
  // Check if it's a wrapper
  if (runtime._runtime) {
    console.log('Has _runtime property:', true);
    console.log('_runtime type:', runtime._runtime.constructor.name);
    console.log('_runtime has getSetting?', typeof runtime._runtime.getSetting);
  }
}).catch(console.error);
