// wasm-templates.ts

export const getContractInfoTemplate = `
Extract contract info query parameters:
- Contract address: {{contractAddress}}
`;

export const getSmartContractStateTemplate = `
Extract smart contract state query parameters:
- Contract address: {{contractAddress}}
- Query: {{query}}
`;

export const msgStoreCodeTemplate = `
Extract store code parameters:
- Wasm bytes: {{wasmBytes}}
- Permission: {{permission}}
- Address: {{address}}`;
